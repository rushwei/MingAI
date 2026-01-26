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

import { NextRequest, NextResponse } from 'next/server';
import { callAI, callAIStream } from '@/lib/ai';
import { hasCredits, useCredit, addCredits } from '@/lib/credits';
import type { ChatMessage, AIPersonality, BaziChart, DifyContext, InjectedSource } from '@/types';
import { DEFAULT_MODEL_ID, getModelConfig } from '@/lib/ai-config';
import { getEffectiveMembershipType } from '@/lib/membership-server';
import { isModelAllowedForMembership, isReasoningAllowedForMembership } from '@/lib/ai-access';
import { generateBaziChartText } from '@/lib/bazi';
import { generateZiweiChartText, type ZiweiChart } from '@/lib/ziwei';
import { generateMangpaiPrompt, extractDayPillar } from '@/lib/mangpai';
import '@/lib/data-sources/init';
import { buildPromptWithSources } from '@/lib/prompt-builder';
import { searchKnowledge } from '@/lib/knowledge-base/search';
import { parseMentions, resolveMention, stripMentionTokens } from '@/lib/mentions';
import type { KnowledgeHit, RankedResult, SearchCandidate } from '@/lib/knowledge-base/types';
import type { Mention } from '@/types/mentions';
import { countTokens } from '@/lib/token-utils';
import { getServiceRoleClient } from '@/lib/api-utils';

// 服务端 Supabase 客户端
const getSupabase = () => getServiceRoleClient();

// 服务端内部密钥（必须通过环境变量设置，无 fallback）
const INTERNAL_SECRET = process.env.INTERNAL_API_SECRET;

interface ChartIds {
    baziId?: string;
    ziweiId?: string;
    baziAnalysisMode?: 'traditional' | 'mangpai';
}

interface ChartContext {
    baziChart?: {
        name: string;
        gender: string;
        birthDate: string;
        birthTime?: string;
        chartData?: Record<string, unknown>;
    };
    ziweiChart?: {
        name: string;
        gender: string;
        birthDate: string;
        birthTime?: string;
        chartData?: Record<string, unknown>;
    };
}

// 加载命盘上下文（仅加载属于当前用户的命盘）
async function loadChartContext(chartIds: ChartIds, userId: string): Promise<ChartContext> {
    const supabase = getSupabase();
    const context: ChartContext = {};

    if (chartIds.baziId) {
        const { data } = await supabase
            .from('bazi_charts')
            .select('name, gender, birth_date, birth_time, chart_data')
            .eq('id', chartIds.baziId)
            .eq('user_id', userId)
            .single();

        if (data) {
            context.baziChart = {
                name: data.name,
                gender: data.gender === 'male' ? '男' : '女',
                birthDate: data.birth_date,
                birthTime: data.birth_time,
                chartData: data.chart_data,
            };
        }
    }

    if (chartIds.ziweiId) {
        const { data } = await supabase
            .from('ziwei_charts')
            .select('name, gender, birth_date, birth_time, chart_data')
            .eq('id', chartIds.ziweiId)
            .eq('user_id', userId)
            .single();

        if (data) {
            context.ziweiChart = {
                name: data.name,
                gender: data.gender === 'male' ? '男' : '女',
                birthDate: data.birth_date,
                birthTime: data.birth_time,
                chartData: data.chart_data,
            };
        }
    }

    return context;
}

// 格式化命盘上下文为文本
function formatChartContextPrompt(context: ChartContext, analysisMode?: 'traditional' | 'mangpai'): string {
    const parts: string[] = [];

    // 选择八字命盘信息
    /**
     * 
     */
    if (context.baziChart) {
        const { baziChart } = context;
        // 使用 generateBaziChartText 生成八字命盘文字（自动计算大运）
        const chartData = baziChart.chartData as Omit<BaziChart, 'id' | 'createdAt' | 'userId'> | undefined;

        // 检查是否使用盲派分析模式
        if (analysisMode === 'mangpai' && chartData?.fourPillars) {
            const dayPillar = extractDayPillar(chartData);
            if (dayPillar) {
                // 生成基础命盘信息
                let basicInfo = `【八字命盘】\n`;
                basicInfo += `姓名：${baziChart.name}\n`;
                basicInfo += `性别：${baziChart.gender}\n`;
                basicInfo += `出生日期：${baziChart.birthDate}${baziChart.birthTime ? ` ${baziChart.birthTime}` : ''}\n`;
                if (chartData.fourPillars) {
                    const fp = chartData.fourPillars;
                    basicInfo += `\n四柱：${fp.year?.stem || ''}${fp.year?.branch || ''}年 ${fp.month?.stem || ''}${fp.month?.branch || ''}月 ${fp.day?.stem || ''}${fp.day?.branch || ''}日 ${fp.hour?.stem || ''}${fp.hour?.branch || ''}时\n`;
                }
                let ziweiExtra = '';
                if (context.ziweiChart) {
                    const { ziweiChart } = context;
                    const ziweiData = ziweiChart.chartData as ZiweiChart | undefined;
                    if (ziweiData?.palaces) {
                        ziweiExtra = generateZiweiChartText(ziweiData);
                    } else {
                        let ziweiInfo = `【紫微命盘】\n`;
                        ziweiInfo += `姓名：${ziweiChart.name}\n`;
                        ziweiInfo += `性别：${ziweiChart.gender}\n`;
                        ziweiInfo += `出生日期：${ziweiChart.birthDate}${ziweiChart.birthTime ? ` ${ziweiChart.birthTime}` : ''}\n`;
                        ziweiExtra = ziweiInfo;
                    }
                }
                // 使用盲派提示词
                return generateMangpaiPrompt(dayPillar, basicInfo, ziweiExtra);
            }
        }

        // 传统模式或盲派数据不完整时的降级处理
        if (chartData?.fourPillars) {
            parts.push(generateBaziChartText(chartData));
        } else {
            // 降级：使用简单格式
            let baziInfo = `【八字命盘】\n`;
            baziInfo += `姓名：${baziChart.name}\n`;
            baziInfo += `性别：${baziChart.gender}\n`;
            baziInfo += `出生日期：${baziChart.birthDate}${baziChart.birthTime ? ` ${baziChart.birthTime}` : ''}\n`;
            parts.push(baziInfo);
        }
    }

    if (context.ziweiChart) {
        const { ziweiChart } = context;
        // 使用 generateZiweiChartText 生成紫微命盘文字
        const chartData = ziweiChart.chartData as ZiweiChart | undefined;
        if (chartData?.palaces) {
            parts.push(generateZiweiChartText(chartData));
        } else {
            // 降级：使用简单格式
            let ziweiInfo = `【紫微命盘】\n`;
            ziweiInfo += `姓名：${ziweiChart.name}\n`;
            ziweiInfo += `性别：${ziweiChart.gender}\n`;
            ziweiInfo += `出生日期：${ziweiChart.birthDate}${ziweiChart.birthTime ? ` ${ziweiChart.birthTime}` : ''}\n`;
            parts.push(ziweiInfo);
        }
    }

    if (parts.length > 0) {
        return `\n\n--- 用户已选择以下命盘作为对话参考 ---\n${parts.join('\n\n')}\n请基于以上命盘信息为用户提供个性化的命理分析和建议。\n--- 命盘信息结束 ---\n`;
    }

    return '';
}

function buildChartSources(context: ChartContext, chartIds: ChartIds): InjectedSource[] {
    const sources: InjectedSource[] = [];
    if (context.baziChart && chartIds.baziId) {
        const content = formatChartContextPrompt({ baziChart: context.baziChart }, chartIds.baziAnalysisMode);
        const preview = content.slice(0, 100) + (content.length > 100 ? '...' : '');
        sources.push({
            type: 'data_source',
            sourceType: 'bazi_chart',
            id: chartIds.baziId,
            name: `八字命盘-${context.baziChart.name}`,
            preview,
            tokens: countTokens(content),
            truncated: false
        });
    }
    if (context.ziweiChart && chartIds.ziweiId) {
        const content = formatChartContextPrompt({ ziweiChart: context.ziweiChart }, chartIds.baziAnalysisMode);
        const preview = content.slice(0, 100) + (content.length > 100 ? '...' : '');
        sources.push({
            type: 'data_source',
            sourceType: 'ziwei_chart',
            id: chartIds.ziweiId,
            name: `紫微命盘-${context.ziweiChart.name}`,
            preview,
            tokens: countTokens(content),
            truncated: false
        });
    }
    return sources;
}

// 格式化 Dify 增强上下文为用户消息前缀（不可信内容，不放入系统提示）
function formatDifyContextAsUserPrefix(difyContext: DifyContext): string {
    const parts: string[] = [];

    if (difyContext.fileContent) {
        parts.push(`【用户上传的文件内容如下】\n${difyContext.fileContent}\n【文件内容结束】`);
    }

    if (difyContext.webContent) {
        parts.push(`【网络搜索结果如下】\n${difyContext.webContent}\n【搜索结果结束】`);
    }

    if (parts.length > 0) {
        return `${parts.join('\n\n')}\n\n【用户的问题如下】\n`;
    }

    return '';
}

export async function POST(request: NextRequest) {
    let creditDeducted = false;
    let userId: string | null = null;
    let canSkipCredit = false;
    try {
        const body = await request.json();
        const { messages, personality, skipCreditCheck, internalSecret, stream, chartIds, model, reasoning, difyContext, mentions: requestMentions } = body as {
            messages: ChatMessage[];
            personality: AIPersonality;
            skipCreditCheck?: boolean;
            internalSecret?: string;
            stream?: boolean;
            chartIds?: ChartIds;
            model?: string;
            reasoning?: boolean;
            difyContext?: DifyContext;
            mentions?: Mention[];
        };

        if (!messages || !Array.isArray(messages)) {
            return NextResponse.json(
                { error: '无效的消息格式' },
                { status: 400 }
            );
        }

        // 安全检查：必须设置 INTERNAL_API_SECRET 环境变量才能跳过积分检查
        // 如果未设置环境变量，禁止任何跳过请求
        canSkipCredit = !!(INTERNAL_SECRET && skipCreditCheck && internalSecret === INTERNAL_SECRET);

        // 获取用户信息
        const authClient = getSupabase();
        let accessTokenForKB: string | null = null;
        const authHeader = request.headers.get('authorization');
        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            accessTokenForKB = token;
            const { data: { user } } = await authClient.auth.getUser(token);
            userId = user?.id || null;
        }

        if (!userId) {
            const accessToken = request.cookies.get('sb-access-token')?.value;
            if (accessToken) {
                accessTokenForKB = accessToken;
                const { data: { user } } = await authClient.auth.getUser(accessToken);
                userId = user?.id || null;
            }
        }

        if (!userId && !canSkipCredit) {
            return NextResponse.json(
                { error: '请先登录后再使用 AI 对话' },
                { status: 401 }
            );
        }

        const requestedModelId = model || DEFAULT_MODEL_ID;
        const modelConfig = getModelConfig(requestedModelId);
        if (!modelConfig) {
            return NextResponse.json(
                { error: '无效的模型' },
                { status: 400 }
            );
        }

        const membershipType = userId
            ? await getEffectiveMembershipType(userId)
            : 'free';

        if (!isModelAllowedForMembership(modelConfig, membershipType)) {
            return NextResponse.json(
                { error: '当前会员等级无法使用该模型' },
                { status: 403 }
            );
        }

        const reasoningAllowed = isReasoningAllowedForMembership(modelConfig, membershipType);
        const reasoningEnabled = reasoningAllowed ? !!reasoning : false;

        // 检查积分
        if (userId && !canSkipCredit) {
            const hasEnough = await hasCredits(userId);
            if (!hasEnough) {
                return NextResponse.json(
                    {
                        error: '积分不足，请充值后继续使用',
                        code: 'INSUFFICIENT_CREDITS',
                        needRecharge: true
                    },
                    { status: 402 }
                );
            }

            const remaining = await useCredit(userId);
            if (remaining === null) {
                return NextResponse.json(
                    {
                        error: '积分扣减失败，请重试',
                        code: 'CREDIT_DEDUCTION_FAILED'
                    },
                    { status: 500 }
                );
            }
            creditDeducted = true;
        }

        // 加载命盘上下文（可信数据，放入系统提示）
        let chartContextPrompt = '';
        let chartContext: ChartContext | null = null;
        if (chartIds && (chartIds.baziId || chartIds.ziweiId) && userId) {
            chartContext = await loadChartContext(chartIds, userId);
            chartContextPrompt = formatChartContextPrompt(chartContext, chartIds.baziAnalysisMode);
        }

        // 处理 Dify 增强上下文（不可信数据，注入到用户消息中）
        let processedMessages = messages;
        if (difyContext && (difyContext.webContent || difyContext.fileContent)) {
            const difyPrefix = formatDifyContextAsUserPrefix(difyContext);
            if (difyPrefix) {
                // 找到最后一条用户消息并在其内容前添加 Dify 上下文
                processedMessages = messages.map((msg, index) => {
                    if (index === messages.length - 1 && msg.role === 'user') {
                        return { ...msg, content: difyPrefix + msg.content };
                    }
                    return msg;
                });
            }
        }

        const lastUserMessage = [...processedMessages].reverse().find(m => m.role === 'user');
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

        const knowledgeBaseMentions = mergedMentions.filter(m => m.type === 'knowledge_base' && m.id);
        const dataMentions = mergedMentions.filter(m => m.type !== 'knowledge_base');

        const mentionsClient = getSupabase();

        const resolvedMentions = userId ? await Promise.all(dataMentions.map(async (m) => {
            const resolvedContent = await resolveMention(m, userId as string, { client: mentionsClient });
            return { ...m, resolvedContent };
        })) : [];

        const userSettings = userId ? await (async () => {
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
        })() : { expressionStyle: 'direct' as const, userProfile: {}, customInstructions: '', promptKbIds: [] as string[] };

        const knowledgeHits = userId && membershipType !== 'free' ? await (async () => {
            const cleanedQuery = stripMentionTokens(userQuestionForSearch);
            if (!cleanedQuery) return [];
            const kbScopeIds = Array.from(new Set([
                ...userSettings.promptKbIds,
                ...knowledgeBaseMentions.map(m => m.id as string)
            ]));
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

        const promptBuild = await buildPromptWithSources({
            modelId: requestedModelId,
            userMessage: userQuestionForSearch,
            mentions: resolvedMentions,
            knowledgeHits,
            userSettings
        });

        const systemSources = chartContext && chartIds ? buildChartSources(chartContext, chartIds) : [];
        const metadata = {
            sources: [...systemSources, ...promptBuild.sources],
            promptDiagnostics: {
                layers: promptBuild.diagnostics,
                totalTokens: promptBuild.totalTokens
            }
        };

        const sanitizedMessages = processedMessages.map((msg, index) => {
            if (index === processedMessages.length - 1 && msg.role === 'user') {
                return { ...msg, content: stripMentionTokens(msg.content) };
            }
            return msg;
        });

        // 流式响应
        if (stream) {
            const streamBody = await callAIStream(
                sanitizedMessages,
                personality || 'master',
                chartContextPrompt,
                requestedModelId,
                { reasoning: reasoningEnabled, systemPromptOverride: promptBuild.systemPrompt }
            );
            const encoder = new TextEncoder();
            const wrapped = new ReadableStream<Uint8Array>({
                async start(controller) {
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'meta', metadata })}\n\n`));
                    const reader = streamBody.getReader();
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;
                        controller.enqueue(value);
                    }
                    controller.close();
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
            personality || 'master',
            requestedModelId,
            chartContextPrompt,
            { reasoning: reasoningEnabled, systemPromptOverride: promptBuild.systemPrompt }
        );
        return NextResponse.json({ content, metadata });
    } catch (error) {
        if (creditDeducted && userId && !canSkipCredit) {
            await addCredits(userId, 1);
        }
        console.error('AI API 错误:', error);
        return NextResponse.json(
            { error: '服务暂时不可用' },
            { status: 500 }
        );
    }
}
