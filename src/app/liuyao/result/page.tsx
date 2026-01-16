/**
 * 六爻解卦结果页面
 *
 * 显示卦象和 AI 解读，包含传统六爻分析
 */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles, RotateCw, AlertCircle, Loader2, BookOpen, RefreshCw } from 'lucide-react';
import { HexagramDisplay } from '@/components/liuyao/HexagramDisplay';
import { TraditionalAnalysis } from '@/components/liuyao/TraditionalAnalysis';
import { MarkdownContent } from '@/components/ui/MarkdownContent';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { ThinkingBlock } from '@/components/chat/ThinkingBlock';
import {
    type DivinationResult,
    type Hexagram,
    type Yao,
    type LiuYaoFullAnalysis,
    performFullAnalysis,
    yaosTpCode,
} from '@/lib/liuyao';
import { getHexagramText } from '@/lib/hexagram-texts';
import { supabase } from '@/lib/supabase';
import { DEFAULT_MODEL_ID } from '@/lib/ai-config';
import { getMembershipInfo, type MembershipType } from '@/lib/membership';
import { extractAnalysisFromConversation } from '@/lib/ai-analysis-query';
import type { ChatMessage } from '@/types';

export default function ResultPage() {
    const router = useRouter();
    const [result, setResult] = useState<DivinationResult | null>(null);
    const [divinationId, setDivinationId] = useState<string | null>(null); // 保存的起卦记录 ID
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [interpretation, setInterpretation] = useState<string | null>(null);
    const [interpretationReasoning, setInterpretationReasoning] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<{ id: string } | null | undefined>(undefined); // undefined = loading
    const [showTraditional, setShowTraditional] = useState(true);
    const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
    const [reasoningEnabled, setReasoningEnabled] = useState(false);
    const [membershipType, setMembershipType] = useState<MembershipType>('free');
    const errorBanner = error ? (
        <div data-testid="analysis-error" className="flex items-center justify-center gap-2 text-red-500 mb-4">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
        </div>
    ) : null;

    // 计算传统分析数据（使用起卦日期执行完整分析）
    const traditionalData = useMemo((): (LiuYaoFullAnalysis & {
        hexagramText?: ReturnType<typeof getHexagramText>;
        changedHexagramText?: ReturnType<typeof getHexagramText>;
        dayStem: string;
    }) | null => {
        if (!result) return null;

        // 计算卦码
        const hexagramCode = yaosTpCode(result.yaos);
        const changedCode = result.changedHexagram
            ? yaosTpCode(result.yaos.map(y => ({
                ...y,
                type: y.change === 'changing' ? (y.type === 1 ? 0 : 1) as 0 | 1 : y.type,
            })))
            : undefined;

        // 执行完整分析
        const analysis = performFullAnalysis(
            result.yaos,
            hexagramCode,
            changedCode,
            result.question,
            result.createdAt
        );

        // 获取卦辞
        const hexagramText = getHexagramText(result.hexagram.name);
        const changedHexagramText = result.changedHexagram
            ? getHexagramText(result.changedHexagram.name)
            : undefined;

        return {
            ...analysis,
            hexagramText,
            changedHexagramText,
            dayStem: analysis.ganZhiTime.day.gan, // 返回日干供显示
        };
    }, [result]);

    useEffect(() => {
        // 获取用户状态
        const loadSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const currentUser = session?.user ? { id: session.user.id } : null;
            setUser(currentUser);
            if (session?.user) {
                const info = await getMembershipInfo(session.user.id);
                if (info) {
                    setMembershipType(info.type);
                }
            } else {
                setMembershipType('free');
            }
        };
        loadSession();

        // 监听认证状态变化
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            const currentUser = session?.user ? { id: session.user.id } : null;
            setUser(currentUser);
            if (session?.user) {
                const info = await getMembershipInfo(session.user.id);
                if (info) {
                    setMembershipType(info.type);
                }
            } else {
                setMembershipType('free');
            }
        });

        // 从 sessionStorage 获取结果
        const storedResult = sessionStorage.getItem('liuyao_result');
        if (storedResult) {
            try {
                const parsed = JSON.parse(storedResult);
                setResult({
                    question: parsed.question,
                    yaos: parsed.yaos as Yao[],
                    hexagram: parsed.hexagram as Hexagram,
                    changedHexagram: parsed.changedHexagram as Hexagram | undefined,
                    changedLines: parsed.changedLines as number[],
                    createdAt: new Date(parsed.createdAt),
                });
                // 恢复 divinationId（用于 AI 解读时更新正确的记录）
                setDivinationId(parsed.divinationId || null);
                setConversationId(parsed.conversationId || null);
            } catch {
                router.push('/liuyao');
            }
        } else {
            router.push('/liuyao');
        }

        return () => subscription.unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!result || interpretation) return;

        const persistConversationId = (id: string | null) => {
            if (!id) return;
            const stored = sessionStorage.getItem('liuyao_result');
            if (!stored) return;
            try {
                const parsed = JSON.parse(stored);
                parsed.conversationId = id;
                sessionStorage.setItem('liuyao_result', JSON.stringify(parsed));
            } catch {
                // ignore
            }
        };

        const loadAnalysis = async () => {
            let resolvedConversationId = conversationId;
            if (!resolvedConversationId && divinationId) {
                const { data } = await supabase
                    .from('liuyao_divinations')
                    .select('conversation_id')
                    .eq('id', divinationId)
                    .single();
                resolvedConversationId = data?.conversation_id || null;
                if (resolvedConversationId) {
                    setConversationId(resolvedConversationId);
                    persistConversationId(resolvedConversationId);
                }
            }

            if (!resolvedConversationId) return;

            const { data, error } = await supabase
                .from('conversations')
                .select('messages, source_data')
                .eq('id', resolvedConversationId)
                .single();

            if (error || !data) return;

            const sourceData = (data.source_data || undefined) as Record<string, unknown> | undefined;
            const messages = (data.messages as ChatMessage[]) || [];
            const { analysis, reasoning, modelId } = extractAnalysisFromConversation(messages, sourceData);
            if (analysis) {
                setInterpretation(analysis);
            }
            if (reasoning) {
                setInterpretationReasoning(reasoning);
            }
            if (modelId) {
                setSelectedModel(modelId);
            }
            if (typeof sourceData?.reasoning === 'boolean') {
                setReasoningEnabled(sourceData.reasoning);
            }
        };

        void loadAnalysis();
    }, [conversationId, divinationId, interpretation, result]);

    const handleGetInterpretation = async () => {
        if (!result || !user || !traditionalData) return;

        setIsLoading(true);
        setError(null);
        setInterpretationReasoning(null);

        try {
            const response = await fetch('/api/liuyao', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                },
                body: JSON.stringify({
                    action: 'interpret',
                    question: result.question,
                    hexagram: result.hexagram,
                    changedHexagram: result.changedHexagram,
                    changedLines: result.changedLines,
                    yaos: result.yaos,
                    dayStem: traditionalData.dayStem, // 传递起卦日干，确保 AI 分析与 UI 一致
                    divinationId: divinationId, // 使用 state 中的 divinationId
                    modelId: selectedModel,
                    reasoning: reasoningEnabled,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '解读失败');
            }

            setInterpretation(data.data.interpretation);
            setInterpretationReasoning(data.data.reasoning || null);
            if (data.data.conversationId) {
                setConversationId(data.data.conversationId);
                const stored = sessionStorage.getItem('liuyao_result');
                if (stored) {
                    try {
                        const parsed = JSON.parse(stored);
                        parsed.conversationId = data.data.conversationId;
                        sessionStorage.setItem('liuyao_result', JSON.stringify(parsed));
                    } catch {
                        // ignore
                    }
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '解读失败');
        } finally {
            setIsLoading(false);
        }
    };

    if (!result) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
                    <p className="text-foreground-secondary">正在加载卦象...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-3xl mx-auto px-4 py-8">
                {/* 返回 */}
                <Link
                    href="/liuyao"
                    className="inline-flex items-center gap-2 text-foreground-secondary hover:text-foreground mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    返回
                </Link>

                {/* 问题显示 */}
                {result.question && (
                    <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-8">
                        <div className="text-center">
                            <span className="inline-flex items-center gap-1 text-sm text-accent font-medium">
                                <Sparkles className="w-4 h-4" />
                                所问之事
                            </span>
                            <p className="text-foreground font-semibold text-lg mt-2">{result.question}</p>
                        </div>
                    </div>
                )}

                {/* 传统分析切换 */}
                <div className="flex items-center justify-end mb-4">
                    <button
                        onClick={() => setShowTraditional(!showTraditional)}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${showTraditional
                            ? 'bg-accent text-white'
                            : 'bg-background-secondary text-foreground-secondary hover:text-foreground'
                            }`}
                    >
                        <BookOpen className="w-4 h-4" />
                        传统分析
                    </button>
                </div>

                {/* 卦象展示 */}
                <div className="bg-background rounded-xl p-8 mb-8">
                    <HexagramDisplay
                        yaos={result.yaos}
                        hexagram={result.hexagram}
                        changedHexagram={result.changedHexagram}
                        changedLines={result.changedLines}
                        showDetails={true}
                        fullYaos={traditionalData?.fullYaos}
                        showTraditional={showTraditional}
                        yongShenPosition={traditionalData?.yongShen.position}
                    />
                </div>

                {/* 传统六爻分析 */}
                {showTraditional && traditionalData && (
                    <div className="bg-background-secondary rounded-xl p-6 mb-8">
                        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-accent" />
                            传统六爻分析
                        </h3>
                        <TraditionalAnalysis
                            fullYaos={traditionalData.fullYaos}
                            yongShen={traditionalData.yongShen}
                            timeRecommendations={traditionalData.timeRecommendations}
                            hexagramText={traditionalData.hexagramText}
                            changedHexagramText={traditionalData.changedHexagramText}
                            changedLines={result.changedLines}
                            ganZhiTime={traditionalData.ganZhiTime}
                            kongWang={traditionalData.kongWang}
                            fuShen={traditionalData.fuShen}
                            shenSystem={traditionalData.shenSystem}
                            summary={traditionalData.summary}
                        />
                    </div>
                )}

                {/* AI 解读区域 */}
                <div className="bg-background-secondary rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-accent" />
                            AI 解卦
                        </h3>
                        <div className="flex items-center gap-2">
                            <ModelSelector
                                compact
                                selectedModel={selectedModel}
                                onModelChange={setSelectedModel}
                                reasoningEnabled={reasoningEnabled}
                                onReasoningChange={setReasoningEnabled}
                                userId={user?.id}
                                membershipType={membershipType}
                            />
                            {interpretation && (
                                <button
                                    data-testid="reanalyze-button"
                                    onClick={handleGetInterpretation}
                                    disabled={isLoading}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background-secondary text-foreground-secondary hover:text-foreground hover:bg-background-tertiary text-sm disabled:opacity-50"
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="w-4 h-4" />
                                    )}
                                    重新分析
                                </button>
                            )}
                        </div>
                    </div>

                    {interpretation ? (
                        <div>
                            {errorBanner}
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                {interpretationReasoning && (
                                    <ThinkingBlock content={interpretationReasoning} />
                                )}
                                <MarkdownContent content={interpretation} className="text-sm text-foreground" />
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            {errorBanner}

                            {user === null ? (
                                <div>
                                    <p className="text-foreground-secondary mb-4">
                                        登录后可获取 AI 深度解读
                                    </p>
                                    <Link
                                        href="/user/login"
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-lg
                                            hover:bg-accent/90 transition-all"
                                    >
                                        登录
                                    </Link>
                                </div>
                            ) : (
                                <button
                                    onClick={handleGetInterpretation}
                                    disabled={isLoading}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-lg
                                        hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            解读中...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-5 h-5" />
                                            获取 AI 解读（消耗 1 次对话）
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* 重新起卦 */}
                <div className="text-center mt-8">
                    <Link
                        href="/liuyao"
                        className="inline-flex items-center gap-2 px-6 py-3 
                            bg-background-secondary text-foreground rounded-lg
                            hover:bg-background-secondary/80 transition-all"
                    >
                        <RotateCw className="w-5 h-5" />
                        重新起卦
                    </Link>
                </div>
            </div>
        </div>
    );
}
