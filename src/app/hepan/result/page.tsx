/**
 * 合盘结果页面
 */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, RotateCw, Sparkles, Loader2, TrendingUp, ChevronDown, Lightbulb, RefreshCw } from 'lucide-react';
import { CompatibilityChart } from '@/components/hepan/CompatibilityChart';
import { ConflictPoints } from '@/components/hepan/ConflictPoints';
import { CompatibilityTrendChart, type CompatibilityTrendPoint } from '@/components/hepan/CompatibilityTrendChart';
import { MarkdownContent } from '@/components/ui/MarkdownContent';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { ThinkingBlock } from '@/components/chat/ThinkingBlock';
import { extractAnalysisFromConversation } from '@/lib/ai-analysis-query';
import type { ChatMessage } from '@/types';
import {
    type HepanResult,
    getHepanTypeName,
    calculateCompatibilityTrend,
    getRelationshipAdvice,
} from '@/lib/hepan';
import { supabase } from '@/lib/supabase';
import { DEFAULT_MODEL_ID } from '@/lib/ai-config';
import { getMembershipInfo, type MembershipType } from '@/lib/membership';
import { AuthModal } from '@/components/auth/AuthModal';

export default function HepanResultPage() {
    const router = useRouter();
    const [result, setResult] = useState<HepanResult | null>(null);
    const [user, setUser] = useState<{ id: string } | null>(null);
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [analysisReasoning, setAnalysisReasoning] = useState<string | null>(null);
    const [loadingAI, setLoadingAI] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [trendPeriod, setTrendPeriod] = useState<6 | 12>(6);
    const [showTrendChart, setShowTrendChart] = useState(false);
    const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
    const [reasoningEnabled, setReasoningEnabled] = useState(false);
    const [membershipType, setMembershipType] = useState<MembershipType>('free');
    const errorBanner = error ? (
        <p data-testid="analysis-error" className="text-red-500 text-sm mb-4">{error}</p>
    ) : null;
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [showAuthModal, setShowAuthModal] = useState(false);

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

        // 从 sessionStorage 获取结果
        const storedResult = sessionStorage.getItem('hepan_result');
        if (storedResult) {
            try {
                const parsed = JSON.parse(storedResult);
                setResult({
                    ...parsed,
                    createdAt: new Date(parsed.createdAt),
                });
                setConversationId(parsed.conversationId || null);
            } catch {
                router.push('/hepan');
            }
        } else {
            router.push('/hepan');
        }
    }, [router]);

    // 计算走势数据（保存原始数据以便复用）
    const rawTrendData = useMemo(() => {
        if (!result) return [];
        return calculateCompatibilityTrend(
            result.person1,
            result.person2,
            trendPeriod
        );
    }, [result, trendPeriod]);

    // 转换为图表所需格式
    const trendData = useMemo((): CompatibilityTrendPoint[] => {
        return rawTrendData.map(t => ({
            month: t.month,
            fullMonth: t.fullMonth,
            score: t.score,
            dimension: t.dimension,
            event: t.event,
        }));
    }, [rawTrendData]);

    // 获取关系发展建议（复用已计算的趋势数据）
    const relationshipAdvice = useMemo(() => {
        if (!result || rawTrendData.length === 0) return [];
        return getRelationshipAdvice(rawTrendData, result.type);
    }, [result, rawTrendData]);

    const handleGetAIAnalysis = async () => {
        if (!result || !user) return;

        setLoadingAI(true);
        setError(null);
        setAnalysisReasoning(null);

        try {
            const response = await fetch('/api/hepan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                },
                body: JSON.stringify({
                    action: 'analyze',
                    result,
                    chartId: (result as unknown as { chartId?: string }).chartId,
                    modelId: selectedModel,
                    reasoning: reasoningEnabled,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '分析失败');
            }

            setAiAnalysis(data.data.analysis);
            setAnalysisReasoning(data.data.reasoning || null);
            if (data.data.conversationId) {
                setConversationId(data.data.conversationId);
                const stored = sessionStorage.getItem('hepan_result');
                if (stored) {
                    try {
                        const parsed = JSON.parse(stored);
                        parsed.conversationId = data.data.conversationId;
                        sessionStorage.setItem('hepan_result', JSON.stringify(parsed));
                    } catch {
                        // ignore
                    }
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '分析失败');
        } finally {
            setLoadingAI(false);
        }
    };

    useEffect(() => {
        if (!result || aiAnalysis) return;

        const loadAnalysis = async () => {
            let resolvedConversationId = conversationId;
            if (!resolvedConversationId) {
                const chartId = (result as unknown as { chartId?: string }).chartId;
                if (chartId) {
                    const { data } = await supabase
                        .from('hepan_charts')
                        .select('conversation_id')
                        .eq('id', chartId)
                        .single();
                    resolvedConversationId = data?.conversation_id || null;
                    if (resolvedConversationId) {
                        setConversationId(resolvedConversationId);
                    }
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
                setAiAnalysis(analysis);
            }
            if (reasoning) {
                setAnalysisReasoning(reasoning);
            }
            if (modelId) {
                setSelectedModel(modelId);
            }
            if (typeof sourceData?.reasoning === 'boolean') {
                setReasoningEnabled(sourceData.reasoning);
            }
        };

        void loadAnalysis();
    }, [aiAnalysis, conversationId, result]);

    if (!result) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-3xl mx-auto px-4 py-8">
                {/* 返回 */}
                <Link
                    href="/hepan"
                    className="inline-flex items-center gap-2 text-foreground-secondary hover:text-foreground mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    返回
                </Link>

                {/* 标题 */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-foreground">{getHepanTypeName(result.type)}分析</h1>
                    <p className="text-foreground-secondary mt-1">
                        {result.person1.name} & {result.person2.name}
                    </p>
                </div>

                {/* 兼容性图表 */}
                <div className="mb-8">
                    <CompatibilityChart
                        dimensions={result.dimensions}
                        overallScore={result.overallScore}
                    />
                </div>

                {/* 走势曲线 */}
                <div className="mb-8">
                    <button
                        onClick={() => setShowTrendChart(!showTrendChart)}
                        className="w-full flex items-center justify-between p-4 bg-background-secondary rounded-xl border border-border mb-2"
                    >
                        <span className="font-semibold flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-accent" />
                            未来走势分析
                        </span>
                        <ChevronDown
                            className={`w-5 h-5 transition-transform ${showTrendChart ? 'rotate-180' : ''}`}
                        />
                    </button>

                    {showTrendChart && (
                        <div className="space-y-4">
                            <CompatibilityTrendChart
                                data={trendData}
                                period={trendPeriod}
                                onPeriodChange={setTrendPeriod}
                            />

                            {/* 发展建议 */}
                            {relationshipAdvice.length > 0 && (
                                <div className="bg-background-secondary rounded-xl p-4 border border-border">
                                    <h4 className="font-medium text-foreground mb-3 flex items-center gap-2">
                                        <Lightbulb className="w-4 h-4 text-accent" />
                                        发展建议
                                    </h4>
                                    <ul className="space-y-2">
                                        {relationshipAdvice.map((advice, idx) => (
                                            <li
                                                key={idx}
                                                className="text-sm text-foreground-secondary flex items-start gap-2"
                                            >
                                                <span className="text-accent mt-0.5">•</span>
                                                {advice}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 冲突点 */}
                <div className="mb-8">
                    <ConflictPoints conflicts={result.conflicts} hepanType={result.type} />
                </div>

                {/* AI 深度分析 */}
                <div className="bg-background-secondary rounded-xl p-6 mb-8">
                    <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-accent" />
                            AI 深度分析
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
                            {aiAnalysis && (
                                <button
                                    data-testid="reanalyze-button"
                                    onClick={handleGetAIAnalysis}
                                    disabled={loadingAI}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background-secondary text-foreground-secondary hover:text-foreground hover:bg-background-tertiary text-sm disabled:opacity-50"
                                >
                                    {loadingAI ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="w-4 h-4" />
                                    )}
                                    重新分析
                                </button>
                            )}
                        </div>
                    </div>

                    {aiAnalysis ? (
                        <div>
                            {errorBanner}
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                {analysisReasoning && (
                                    <ThinkingBlock content={analysisReasoning} />
                                )}
                                <MarkdownContent content={aiAnalysis} className="text-sm text-foreground" />
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            {errorBanner}

                            {!user ? (
                                <div className="bg-gradient-to-r from-accent/5 to-purple-500/5 border border-accent/20 rounded-xl p-6 text-center">
                                    <div className="flex justify-center mb-4">
                                        <div className="p-3 rounded-full bg-accent/10">
                                            <Sparkles className="w-6 h-6 text-accent" />
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-semibold mb-2">AI 深度分析</h3>
                                    <p className="text-foreground-secondary mb-6 max-w-sm mx-auto">
                                        登录后解锁完整 AI 深度解读，获取更精准的个性化建议
                                    </p>
                                    <button
                                        onClick={() => setShowAuthModal(true)}
                                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
                                    >
                                        登录 / 注册
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handleGetAIAnalysis}
                                    disabled={loadingAI}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-lg
                                        hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                >
                                    {loadingAI ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            分析中...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-5 h-5" />
                                            获取 AI 分析（消耗 1 次对话）
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* 操作按钮 */}
                <div className="flex justify-center">
                    <Link
                        href="/hepan"
                        className="inline-flex items-center gap-2 px-6 py-3
                            bg-background-secondary text-foreground rounded-lg
                            hover:bg-background-secondary/80 transition-all"
                    >
                        <RotateCw className="w-5 h-5" />
                        重新分析
                    </Link>
                </div>
            </div>

            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
            />
        </div>
    );
}
