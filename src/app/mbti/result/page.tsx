/**
 * MBTI 测试结果页面
 * 
 * 支持两种模式：
 * 1. 测试结果模式（从测试完成跳转）- 显示维度分析、AI分析、重新测试
 * 2. 查看模式（直接访问）- 仅显示人格基本信息
 */
'use client'; // client component for sessionStorage and auth state.

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, RotateCw, Sparkles, Loader2 } from 'lucide-react';
import { PersonalityCard } from '@/components/mbti/PersonalityCard';
import { buildViewResult, type TestResult } from '@/lib/mbti';
import { supabase } from '@/lib/supabase';
import { MarkdownContent } from '@/components/ui/MarkdownContent';

function MBTIResultContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const viewType = searchParams.get('type');
    const isViewMode = searchParams.get('view') === 'true';

    // useState keeps client-only test result and AI analysis state.
    const [result, setResult] = useState<TestResult | null>(null);
    const [user, setUser] = useState<{ id: string } | null>(null);
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [loadingAI, setLoadingAI] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [checkingAuth, setCheckingAuth] = useState(true);

    useEffect(() => {
        // useEffect loads session/auth data after client mount.
        // 获取用户状态
        const checkAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                setUser(session?.user ? { id: session.user.id } : null);
            } catch (err) {
                console.error('Auth check failed:', err);
                setUser(null);
            } finally {
                setCheckingAuth(false);
            }
        };

        checkAuth();

        // 监听认证状态变化
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ? { id: session.user.id } : null);
        });

        // 从 sessionStorage 获取结果
        const storedResult = sessionStorage.getItem('mbti_result');
        if (storedResult) {
            try {
                setResult(JSON.parse(storedResult) as TestResult);
            } catch {
                if (!isViewMode) {
                    router.push('/mbti');
                }
            }
        } else if (isViewMode) {
            const viewResult = viewType ? buildViewResult(viewType.toUpperCase()) : null;
            if (viewResult) {
                setResult(viewResult);
            } else {
                router.push('/mbti');
            }
        } else {
            router.push('/mbti');
        }

        return () => subscription.unsubscribe();
    }, [router, isViewMode, viewType]);

    const handleGetAIAnalysis = async () => {
        if (!result || !user) return;

        setLoadingAI(true);
        setError(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.access_token) {
                setError('请先登录');
                return;
            }

            const response = await fetch('/api/mbti', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    action: 'analyze',
                    type: result.type,
                    scores: result.scores,
                    percentages: result.percentages,
                    readingId: (result as unknown as { readingId?: string }).readingId,
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

    // 是否为测试完成模式（有完整分数数据）
    const isTestMode = !isViewMode && result.scores && result.percentages;

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-3xl mx-auto px-4 py-8">
                {/* 返回 */}
                <Link
                    href="/mbti"
                    className="inline-flex items-center gap-2 text-foreground-secondary hover:text-foreground mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    返回
                </Link>

                {/* 结果卡片 */}
                <PersonalityCard result={result} showDimensions={!!isTestMode} />

                {/* AI 深度分析 - 仅测试模式显示 */}
                {isTestMode && (
                    <div className="mt-8 bg-background-secondary rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-accent" />
                            AI 深度分析
                        </h3>

                        {aiAnalysis ? (
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <MarkdownContent content={aiAnalysis} />
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                {error && (
                                    <p className="text-red-500 text-sm mb-4">{error}</p>
                                )}

                                {checkingAuth ? (
                                    <Loader2 className="w-6 h-6 animate-spin text-accent mx-auto" />
                                ) : !user ? (
                                    <div>
                                        <p className="text-foreground-secondary mb-4">
                                            登录后可获取 AI 个性化深度分析
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
                )}

                {/* 操作按钮 - 仅测试模式显示 */}
                {isTestMode && (
                    <div className="flex justify-center gap-4 mt-8">
                        <Link
                            href="/mbti"
                            className="inline-flex items-center gap-2 px-6 py-3 
                                bg-background-secondary text-foreground rounded-lg
                                hover:bg-background-secondary/80 transition-all"
                        >
                            <RotateCw className="w-5 h-5" />
                            重新测试
                        </Link>
                    </div>
                )}

                {/* 查看模式：显示开始测试按钮 */}
                {!isTestMode && (
                    <div className="text-center mt-10">
                        <Link
                            href="/mbti"
                            className="inline-flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-lg
                                hover:bg-accent/90 transition-all"
                        >
                            开始 MBTI 测试
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
}

// 主导出组件，使用 Suspense 包裹
export default function MBTIResultPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        }>
            <MBTIResultContent />
        </Suspense>
    );
}
