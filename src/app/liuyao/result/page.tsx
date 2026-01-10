/**
 * 六爻解卦结果页面
 * 
 * 显示卦象和 AI 解读
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles, RotateCw, AlertCircle, Loader2 } from 'lucide-react';
import { HexagramDisplay } from '@/components/liuyao/HexagramDisplay';
import { type DivinationResult, type Hexagram, type Yao } from '@/lib/liuyao';
import { supabase } from '@/lib/supabase';

export default function ResultPage() {
    const router = useRouter();
    const [result, setResult] = useState<DivinationResult | null>(null);
    const [interpretation, setInterpretation] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<{ id: string } | null | undefined>(undefined); // undefined = loading

    useEffect(() => {
        // 获取用户状态
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ? { id: session.user.id } : null);
        });

        // 监听认证状态变化
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ? { id: session.user.id } : null);
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
            } catch {
                router.push('/liuyao');
            }
        } else {
            router.push('/liuyao');
        }

        return () => subscription.unsubscribe();
    }, [router]);

    const handleGetInterpretation = async () => {
        if (!result || !user) return;

        setIsLoading(true);
        setError(null);

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
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '解读失败');
            }

            setInterpretation(data.data.interpretation);
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

                {/* 卦象展示 */}
                <div className="bg-background-secondary rounded-xl p-8 mb-8">
                    <HexagramDisplay
                        yaos={result.yaos}
                        hexagram={result.hexagram}
                        changedHexagram={result.changedHexagram}
                        changedLines={result.changedLines}
                        showDetails={true}
                    />
                </div>

                {/* AI 解读区域 */}
                <div className="bg-background-secondary rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-accent" />
                        AI 解卦
                    </h3>

                    {interpretation ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                            <div className="text-foreground whitespace-pre-wrap">
                                {interpretation}
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            {error && (
                                <div className="flex items-center justify-center gap-2 text-red-500 mb-4">
                                    <AlertCircle className="w-4 h-4" />
                                    <span className="text-sm">{error}</span>
                                </div>
                            )}

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
