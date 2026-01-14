/**
 * 合盘结果页面
 */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, RotateCw, Sparkles, Loader2, TrendingUp, ChevronDown, Lightbulb } from 'lucide-react';
import { CompatibilityChart } from '@/components/hepan/CompatibilityChart';
import { ConflictPoints } from '@/components/hepan/ConflictPoints';
import { CompatibilityTrendChart, type CompatibilityTrendPoint } from '@/components/hepan/CompatibilityTrendChart';
import { MarkdownContent } from '@/components/ui/MarkdownContent';
import {
    type HepanResult,
    getHepanTypeName,
    calculateCompatibilityTrend,
    getRelationshipAdvice,
} from '@/lib/hepan';
import { supabase } from '@/lib/supabase';

export default function HepanResultPage() {
    const router = useRouter();
    const [result, setResult] = useState<HepanResult | null>(null);
    const [user, setUser] = useState<{ id: string } | null>(null);
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [loadingAI, setLoadingAI] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [trendPeriod, setTrendPeriod] = useState<6 | 12>(6);
    const [showTrendChart, setShowTrendChart] = useState(false);

    useEffect(() => {
        // 获取用户状态
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ? { id: session.user.id } : null);
        });

        // 从 sessionStorage 获取结果
        const storedResult = sessionStorage.getItem('hepan_result');
        if (storedResult) {
            try {
                const parsed = JSON.parse(storedResult);
                setResult({
                    ...parsed,
                    createdAt: new Date(parsed.createdAt),
                });
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
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '分析失败');
            }

            setAiAnalysis(data.data.analysis);
        } catch (err) {
            setError(err instanceof Error ? err.message : '分析失败');
        } finally {
            setLoadingAI(false);
        }
    };

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
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-accent" />
                        AI 深度分析
                    </h3>

                    {aiAnalysis ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <MarkdownContent content={aiAnalysis} className="text-sm text-foreground" />
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            {error && (
                                <p className="text-red-500 text-sm mb-4">{error}</p>
                            )}

                            {!user ? (
                                <div>
                                    <p className="text-foreground-secondary mb-4">
                                        登录后可获取 AI 深度分析和相处建议
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
        </div>
    );
}
