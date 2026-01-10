/**
 * 合盘结果页面
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, RotateCw, Sparkles, Loader2 } from 'lucide-react';
import { CompatibilityChart } from '@/components/hepan/CompatibilityChart';
import { ConflictPoints } from '@/components/hepan/ConflictPoints';
import { type HepanResult, getHepanTypeName } from '@/lib/hepan';
import { supabase } from '@/lib/supabase';

export default function HepanResultPage() {
    const router = useRouter();
    const [result, setResult] = useState<HepanResult | null>(null);
    const [user, setUser] = useState<{ id: string } | null>(null);
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [loadingAI, setLoadingAI] = useState(false);
    const [error, setError] = useState<string | null>(null);

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

                {/* 冲突点 */}
                <div className="mb-8">
                    <ConflictPoints conflicts={result.conflicts} />
                </div>

                {/* AI 深度分析 */}
                <div className="bg-background-secondary rounded-xl p-6 mb-8">
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-accent" />
                        AI 深度分析
                    </h3>

                    {aiAnalysis ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <p className="text-foreground-secondary whitespace-pre-line">
                                {aiAnalysis}
                            </p>
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
