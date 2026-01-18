/**
 * 合盘结果页面
 */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, RotateCw, Sparkles, Loader2, Lightbulb, RefreshCw, Quote } from 'lucide-react';
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
    const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
    const [reasoningEnabled, setReasoningEnabled] = useState(false);
    const [membershipType, setMembershipType] = useState<MembershipType>('free');
    const errorBanner = error ? (
        <p data-testid="analysis-error" className="text-red-500 text-sm mb-4 bg-red-500/10 p-3 rounded-lg border border-red-500/20">{error}</p>
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

    const typeConfig = {
        love: { color: 'text-rose-500', bg: 'bg-rose-500', border: 'border-rose-500/20' },
        business: { color: 'text-blue-500', bg: 'bg-blue-500', border: 'border-blue-500/20' },
        family: { color: 'text-emerald-500', bg: 'bg-emerald-500', border: 'border-emerald-500/20' },
    }[result.type];

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* 背景装饰 Removed */}

            <div className="max-w-3xl mx-auto px-4 py-8 relative z-10 animate-fade-in">
                {/* 返回 */}
                <Link
                    href="/hepan"
                    className="inline-flex items-center gap-2 text-foreground-secondary hover:text-foreground mb-8 transition-colors px-3 py-1.5 rounded-lg hover:bg-white/5"
                >
                    <ArrowLeft className="w-4 h-4" />
                    <span className="text-sm font-medium">返回列表</span>
                </Link>

                {/* 标题 */}
                <div className="text-center mb-10">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-3 ${typeConfig.bg}/10 ${typeConfig.color} border ${typeConfig.border}`}>
                        {getHepanTypeName(result.type)}分析
                    </span>
                    <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center justify-center gap-4">
                        <span className="opacity-80">{result.person1.name}</span>
                        <span className="text-foreground-secondary/30 font-light">&</span>
                        <span className="opacity-80">{result.person2.name}</span>
                    </h1>
                </div>

                {/* 兼容性图表 */}
                <div className="mb-8 bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 shadow-xl">
                    <CompatibilityChart
                        dimensions={result.dimensions}
                        overallScore={result.overallScore}
                    />
                </div>

                {/* 走势曲线 */}
                <div className="mb-8">
                    <div className="mt-4 p-6 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 animate-fade-in-down space-y-6">
                        <CompatibilityTrendChart
                            data={trendData}
                            period={trendPeriod}
                            onPeriodChange={setTrendPeriod}
                        />

                        {/* 发展建议 */}
                        {relationshipAdvice.length > 0 && (
                            <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                                <h4 className="font-medium text-foreground mb-4 flex items-center gap-2">
                                    <Lightbulb className="w-4 h-4 text-amber-500" />
                                    发展建议
                                </h4>
                                <ul className="space-y-3">
                                    {relationshipAdvice.map((advice, idx) => (
                                        <li
                                            key={idx}
                                            className="text-sm text-foreground-secondary flex items-start gap-3 leading-relaxed"
                                        >
                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                            {advice}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>

                {/* 冲突点 */}
                <div className="mb-8 bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10">
                    <ConflictPoints conflicts={result.conflicts} hepanType={result.type} />
                </div>

                {/* AI 深度分析 */}
                <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-white/10 relative mb-12 group">
                    {/* Background decorations Removed */}

                    <div className="flex items-center justify-between mb-6 flex-wrap gap-4 relative z-10">
                        <h3 className="text-xl font-bold text-foreground flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-accent/20 text-accent">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            AI 深度洞察
                        </h3>
                        <div className="flex items-center gap-3">
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
                                    className="p-2 rounded-lg bg-white/5 text-foreground-secondary hover:text-foreground hover:bg-white/10 transition-colors disabled:opacity-50"
                                    title="重新分析"
                                >
                                    {loadingAI ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="w-4 h-4" />
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    {aiAnalysis ? (
                        <div className="relative z-10">
                            {errorBanner}
                            <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground-secondary prose-strong:text-foreground prose-strong:font-semibold">
                                {analysisReasoning && (
                                    <ThinkingBlock content={analysisReasoning} />
                                )}
                                <div className="bg-white/5 rounded-2xl p-6 border border-white/5 shadow-inner">
                                    <MarkdownContent content={aiAnalysis} className="text-[15px] leading-relaxed text-foreground-secondary/90" />
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-10 relative z-10">
                            {errorBanner}

                            {!user ? (
                                <div className="max-w-sm mx-auto p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent/10 text-accent mb-4">
                                        <Quote className="w-6 h-6" />
                                    </div>
                                    <h3 className="text-lg font-bold mb-2 text-foreground">解锁深度解读</h3>
                                    <p className="text-foreground-secondary mb-6 text-sm">
                                        登录后获取 AI 对您关系的深度剖析与个性化建议
                                    </p>
                                    <button
                                        onClick={() => setShowAuthModal(true)}
                                        className="w-full py-3 rounded-xl bg-accent text-white font-medium hover:bg-accent/90 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-accent/20"
                                    >
                                        登录 / 注册
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handleGetAIAnalysis}
                                    disabled={loadingAI}
                                    className="inline-flex items-center gap-2.5 px-8 py-4 bg-accent text-white rounded-xl font-bold text-lg
                                        shadow-lg shadow-accent/20 hover:shadow-accent/30 hover:scale-[1.02] active:scale-[0.98]
                                        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-none transition-all"
                                >
                                    {loadingAI ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            正在解读天机...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-5 h-5" />
                                            获取 AI 深度分析
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* 操作按钮 */}
                <div className="flex justify-center pb-8">
                    <Link
                        href="/hepan"
                        className="inline-flex items-center gap-2 px-8 py-3 rounded-xl
                            bg-white/5 text-foreground font-medium border border-white/10
                            hover:bg-white/10 transition-all"
                    >
                        <RotateCw className="w-4 h-4" />
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
