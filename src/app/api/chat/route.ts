/**
 * AI 对话 API 路由
 * 
 * 服务端组件说明：
 * - API 路由始终在服务端运行
 * - 保护 AI API 密钥不暴露给客户端
 * - 检查用户积分，积分不足时返回错误
 * - 支持流式输出 (stream=true)
 * - 支持命盘上下文 (chartIds)
 */

import { NextRequest } from 'next/server';
import { callAI, callAIStream } from '@/lib/ai/ai';
import { hasCredits, useCredit, addCredits } from '@/lib/user/credits';
import type { ChatMessage, DifyContext } from '@/types';
import { DEFAULT_MODEL_ID } from '@/lib/ai/ai-config';
import { getModelConfigAsync } from '@/lib/server/ai-config';
import { getEffectiveMembershipType } from '@/lib/user/membership-server';
import { isModelAllowedForMembership, isReasoningAllowedForMembership } from '@/lib/ai/ai-access';
import { buildPromptWithSources, getPromptBudget, resolvePersonalities } from '@/lib/ai/prompt-builder';
import { searchKnowledge } from '@/lib/knowledge-base/search';
import { parseMentions, resolveMention, stripMentionTokens } from '@/lib/mentions';
import type { KnowledgeHit, RankedResult, SearchCandidate } from '@/lib/knowledge-base/types';
import type { Mention } from '@/types/mentions';
import { getAuthContext, getSystemAdminClient, jsonError, jsonOk, requireUserContext } from '@/lib/api-utils';
import { buildDreamContextPayload, loadChartContext, type ChartIds } from '@/lib/chat/chat-context';

// 服务端 Supabase 客户端
const getSupabase = () => getSystemAdminClient();

// 服务端内部密钥（必须通过环境变量设置，无 fallback）
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

function injectToLastUserMessage(messages: ChatMessage[], prefix: string): ChatMessage[] {
    if (!prefix) return messages;
    return messages.map((msg, index) => {
        if (index === messages.length - 1 && msg.role === 'user') {
            return { ...msg, content: prefix + msg.content };
        }
        return msg;
    });
}

async function resolveUserIdFromRequest(request: NextRequest): Promise<string | null> {
    try {
        const authClient = getSupabase();
        const authHeader = request.headers.get('authorization');
        if (authHeader) {
            const token = authHeader.replace(/Bearer\s+/i, '');
            try {
                const { data: { user } } = await authClient.auth.getUser(token);
                if (user?.id) return user.id;
            } catch {
                // 在受限环境或测试环境中，auth.getUser 可能不可用，降级尝试其他来源
            }
        }

        const accessToken = request.cookies.get('sb-access-token')?.value;
        if (accessToken) {
            try {
                const { data: { user } } = await authClient.auth.getUser(accessToken);
                if (user?.id) return user.id;
            } catch {
                // ignore
            }
        }
    } catch {
        // ignore
    }

    return null;
}

export async function POST(request: NextRequest) {
    let creditDeducted = false;
    let userId: string | null = null;
    let canSkipCredit = false;
    try {
        const body = await request.json();
        const { messages, skipCreditCheck, internalSecret, stream, chartIds, model, reasoning, difyContext, mentions: requestMentions } = body as {
            messages: ChatMessage[];
            skipCreditCheck?: boolean;
            internalSecret?: string;
            stream?: boolean;
            chartIds?: ChartIds;
            model?: string;
            reasoning?: boolean;
            difyContext?: DifyContext;
            mentions?: Mention[];
            dreamMode?: boolean;
        };

        if (!messages || !Array.isArray(messages)) {
            return jsonError('无效的消息格式', 400);
        }

        // 安全检查：必须设置 INTERNAL_API_SECRET 环境变量才能跳过积分检查
        // 如果未设置环境变量，禁止任何跳过请求
        canSkipCredit = !!(INTERNAL_SECRET && skipCreditCheck && internalSecret === INTERNAL_SECRET);

        let accessTokenForKB: string | null = null;
        const authHeader = request.headers.get('authorization');
        if (authHeader) {
            accessTokenForKB = authHeader.replace(/Bearer\s+/i, '');
        }

        if (!accessTokenForKB) {
            const accessToken = request.cookies.get('sb-access-token')?.value;
            if (accessToken) {
                accessTokenForKB = accessToken;
            }
        }

        if (canSkipCredit) {
            try {
                const { user } = await getAuthContext(request);
                userId = user?.id || null;
            } catch {
                userId = await resolveUserIdFromRequest(request);
            }
        } else {
            try {
                const auth = await requireUserContext(request);
                if ('error' in auth) {
                    userId = await resolveUserIdFromRequest(request);
                    if (!userId) {
                        return jsonError(auth.error.message, auth.error.status);
                    }
                } else {
                    userId = auth.user.id;
                    if (!accessTokenForKB) {
                        try {
                            const { data: { session } } = await auth.supabase.auth.getSession();
                            accessTokenForKB = session?.access_token || null;
                        } catch {
                            // ignore
                        }
                    }
                }
            } catch {
                userId = await resolveUserIdFromRequest(request);
                if (!userId) {
                    return jsonError('请先登录', 401);
                }
            }
        }

        const requestedModelId = model || DEFAULT_MODEL_ID;
        const modelConfig = await getModelConfigAsync(requestedModelId);
        if (!modelConfig) {
            return jsonError('无效的模型', 400);
        }

        const membershipType = userId
            ? await getEffectiveMembershipType(userId)
            : 'free';

        if (!isModelAllowedForMembership(modelConfig, membershipType)) {
            return jsonError('当前会员等级无法使用该模型', 403);
        }

        const reasoningAllowed = isReasoningAllowedForMembership(modelConfig, membershipType);
        const reasoningEnabled = reasoningAllowed ? !!reasoning : false;

        // 检查积分
        if (userId && !canSkipCredit) {
            const hasEnough = await hasCredits(userId);
            if (!hasEnough) {
                return jsonError('积分不足，请充值后继续使用', 402, {
                    code: 'INSUFFICIENT_CREDITS',
                    needRecharge: true
                });
            }

            // 流式请求改为“首字后扣费”；非流式保持原有扣费时机
            if (!stream) {
                const remaining = await useCredit(userId);
                if (remaining === null) {
                    return jsonError('积分扣减失败，请重试', 500, {
                        code: 'CREDIT_DEDUCTION_FAILED'
                    });
                }
                creditDeducted = true;
            }
        }

        // 加载命盘上下文（可信数据，放入系统提示）
        const chartContext = chartIds && (chartIds.baziId || chartIds.ziweiId) && userId
            ? await loadChartContext(chartIds, userId)
            : undefined;

        // 解梦模式：获取默认八字命盘和今日运势（用于提示词构建）
        let dreamContext: { baziChartName?: string; dailyFortune?: string } | undefined;
        let dreamPayload: { baziText?: string; fortuneText?: string } | undefined;
        if (body.dreamMode && userId) {
            const { payload, context } = await buildDreamContextPayload(userId);
            dreamPayload = payload;
            dreamContext = context;
        }

        const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
        const rawUserContent = lastUserMessage?.content || '';
        const userQuestionForSearch = (() => {
            const marker = '【用户的问题如下】';
            const idx = rawUserContent.lastIndexOf(marker);
            if (idx >= 0) {
                return rawUserContent.slice(idx + marker.length).trim();
            }
            return rawUserContent.trim();
        })();

        const parsedMentions = parseMentions(rawUserContent);
        const mergedMentions = [...(requestMentions || []), ...parsedMentions]
            .filter(m => m && m.type && m.name)
            .slice(0, 20);

        const mentionsClient = getSupabase();

        const mentionBudget = await getPromptBudget(requestedModelId, reasoningEnabled);

        // P1: 并行加载 resolvedMentions 和 userSettings（两者无依赖关系）
        const [resolvedMentions, userSettings] = await Promise.all([
            userId ? Promise.all(mergedMentions.map(async (m) => {
                const resolvedContent = await resolveMention(m, userId as string, {
                    client: mentionsClient,
                    maxTokens: mentionBudget
                });
                return { ...m, resolvedContent };
            })) : [],
            userId ? (async () => {
                const { data } = await getSupabase()
                    .from('user_settings')
                    .select('expression_style, user_profile, custom_instructions, prompt_kb_ids')
                    .eq('user_id', userId as string)
                    .maybeSingle();
                const row = data as null | {
                    expression_style: 'direct' | 'gentle' | null;
                    user_profile: unknown;
                    custom_instructions: string | null;
                    prompt_kb_ids?: unknown;
                };
                const expressionStyle = (row?.expression_style ?? 'direct') as 'direct' | 'gentle';
                return {
                    expressionStyle,
                    userProfile: row?.user_profile || {},
                    customInstructions: row?.custom_instructions || '',
                    promptKbIds: Array.isArray(row?.prompt_kb_ids)
                        ? row?.prompt_kb_ids.filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)
                        : []
                };
            })() : { expressionStyle: 'direct' as const, userProfile: {}, customInstructions: '', promptKbIds: [] as string[] },
        ]);

        const knowledgeHits = userId && membershipType !== 'free' ? await (async () => {
            const cleanedQuery = stripMentionTokens(userQuestionForSearch);
            if (!cleanedQuery) return [];
            const kbScopeIds = Array.from(new Set(userSettings.promptKbIds));
            if (kbScopeIds.length === 0) return [];
            const results = await searchKnowledge(cleanedQuery, {
                limit: 12,
                topK: 5,
                accessToken: accessTokenForKB || undefined,
                kbIds: kbScopeIds.length > 0 ? kbScopeIds : undefined
            });
            const candidates = results as Array<SearchCandidate | RankedResult>;
            const kbIds = Array.from(new Set(candidates.map(r => r.kbId).filter(Boolean))) as string[];
            if (kbIds.length === 0) return [];

            const { data: kbRows } = await getSupabase()
                .from('knowledge_bases')
                .select('id, name, weight')
                .eq('user_id', userId as string)
                .in('id', kbIds);

            const kbMap = new Map<string, { name: string; weight: string }>();
            (kbRows || []).forEach((kb: { id: string; name: string; weight: string }) => kbMap.set(kb.id, { name: kb.name, weight: kb.weight }));

            return candidates.slice(0, 8).map((r): KnowledgeHit => ({
                kbId: r.kbId,
                kbName: kbMap.get(r.kbId)?.name || '知识库',
                content: r.content,
                score: r.score || 0
            }));
        })() : [];

        const promptChartContext = chartContext ? { ...chartContext, analysisMode: chartIds?.baziAnalysisMode } : undefined;
        const promptDreamMode = body.dreamMode ? {
            enabled: true,
            baziText: dreamPayload?.baziText,
            fortuneText: dreamPayload?.fortuneText,
        } : undefined;

        const promptBuild = await buildPromptWithSources({
            modelId: requestedModelId,
            reasoningEnabled,
            userMessage: userQuestionForSearch,
            mentions: resolvedMentions,
            knowledgeHits,
            userSettings,
            chartContext: promptChartContext,
            dreamMode: promptDreamMode,
            difyContext,
        });

        const processedMessages = promptBuild.userMessagePrefix
            ? injectToLastUserMessage(messages, promptBuild.userMessagePrefix)
            : messages;

        const metadata = {
            sources: promptBuild.sources,
            kbSearchEnabled: userSettings.promptKbIds.length > 0,
            kbHitCount: knowledgeHits.length,
            promptDiagnostics: {
                modelId: requestedModelId,  // 记录模型 ID 用于前端判断
                layers: promptBuild.diagnostics,
                totalTokens: promptBuild.totalTokens,
                budgetTotal: promptBuild.budgetTotal,
                userMessageTokens: promptBuild.userMessageTokens,
            },
            dreamContext // 解梦模式上下文（可用于前端显示已参考信息）
        };

        const sanitizedMessages = processedMessages.map((msg, index) => {
            if (index === processedMessages.length - 1 && msg.role === 'user') {
                return { ...msg, content: stripMentionTokens(msg.content) };
            }
            return msg;
        });

        // 流式响应
        const personalityResolution = resolvePersonalities({
            chartContext: promptChartContext,
            dreamMode: promptDreamMode,
            mentions: resolvedMentions
        });
        const fallbackPersonality = personalityResolution.personalities[0] ?? 'general';

        if (stream) {
            const streamBody = await callAIStream(
                sanitizedMessages,
                fallbackPersonality,
                '',
                requestedModelId,
                { reasoning: reasoningEnabled, systemPromptOverride: promptBuild.systemPrompt }
            );
            const encoder = new TextEncoder();
            const wrapped = new ReadableStream<Uint8Array>({
                async start(controller) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'meta', metadata })}\n\n`));
                    const reader = streamBody.getReader();
                    const decoder = new TextDecoder();
                    let sseBuffer = '';
                    let streamCreditDeducted = false;

                    const tryDeductCreditOnFirstToken = async (chunk: Uint8Array) => {
                        if (!userId || canSkipCredit || streamCreditDeducted) return;
                        sseBuffer += decoder.decode(chunk, { stream: true });
                        const lines = sseBuffer.split('\n');
                        sseBuffer = lines.pop() ?? '';

                        for (const rawLine of lines) {
                            const line = rawLine.trim();
                            if (!line.startsWith('data:')) continue;
                            const payload = line.replace(/^data:\s*/, '');
                            if (!payload || payload === '[DONE]') continue;

                            let parsed: unknown;
                            try {
                                parsed = JSON.parse(payload);
                            } catch {
                                continue;
                            }

                            const content = (parsed as { choices?: Array<{ delta?: { content?: unknown } }> })?.choices?.[0]?.delta?.content;
                            if (typeof content === 'string' && content.length > 0) {
                                const remaining = await useCredit(userId);
                                if (remaining === null) {
                                    throw new Error('CREDIT_DEDUCTION_FAILED');
                                }
                                streamCreditDeducted = true;
                                return;
                            }
                        }
                    };

                    try {
                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;
                            await tryDeductCreditOnFirstToken(value);
                            controller.enqueue(value);
                        }
                        controller.close();
                    } catch (streamError) {
                        console.error('[chat] 流式读取失败:', streamError);
                        // 扣费失败时发送结构化错误事件后正常关闭流，
                        // 不能用 controller.error()，否则 enqueue 的数据可能丢失
                        if (streamError instanceof Error && streamError.message === 'CREDIT_DEDUCTION_FAILED') {
                            try {
                                controller.enqueue(encoder.encode(
                                    `data: ${JSON.stringify({ type: 'error', code: 'INSUFFICIENT_CREDITS', error: '积分不足，请充值后继续使用' })}\n\n`
                                ));
                                controller.close();
                            } catch {
                                // controller 可能已关闭
                            }
                        } else {
                            controller.error(streamError);
                        }
                    } finally {
                        decoder.decode();
                        reader.releaseLock();
                    }
                }
            });

            return new Response(wrapped, {
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                },
            });
        }

        // 非流式响应
        const content = await callAI(
            sanitizedMessages,
            fallbackPersonality,
            requestedModelId,
            '',
            { reasoning: reasoningEnabled, systemPromptOverride: promptBuild.systemPrompt }
        );
        return jsonOk({ content, metadata });
    } catch (error) {
        if (creditDeducted && userId && !canSkipCredit) {
            await addCredits(userId, 1);
            creditDeducted = false;
        }
        console.error('AI API 错误:', error);
        return jsonError('服务暂时不可用', 500);
    }
}
