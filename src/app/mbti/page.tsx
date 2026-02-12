/**
 * MBTI 性格测试主页面
 *
 * 提供测试介绍与进入入口
 */
'use client'; // Uses client-side state for modal and question count.

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, Play, Loader2, Eye } from 'lucide-react';

import { loadQuestions, type MBTIQuestion, PERSONALITY_BASICS } from '@/lib/divination/mbti';

function MBTIPageContent() {
    const router = useRouter();
    // Tracks question count to enable start button after load.
    const [questions, setQuestions] = useState<MBTIQuestion[]>([]);

    // 加载全部题目
    useEffect(() => {
        loadQuestions().then((allQuestions) => {
            setQuestions(allQuestions);
        });
    }, []);

    return (
        <div className="min-h-screen bg-background md:pb-12">
            {/* 顶部 Hero 区域 */}
            <div className="relative overflow-hidden bg-background-secondary/30 border-b border-border/50">
                <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
                <div className="max-w-4xl mx-auto px-4 pt-16 pb-8 text-center relative z-10">
                    <div className="inline-flex items-center justify-center p-4 rounded-2xl mb-6 shadow-lg shadow-blue-500/10">
                        <Brain className="w-12 h-12 text-blue-500" />
                    </div>
                    <h1 className="text-4xl font-bold text-foreground mb-4 tracking-tight">
                        MBTI 性格测试
                    </h1>
                    <p className="text-lg text-foreground-secondary max-w-2xl mx-auto leading-relaxed">
                        探索你的性格类型，发现你与生俱来的天赋与倾向。
                        <br className="hidden sm:block" />
                        只需几分钟，即可获得深入的性格分析报告。
                    </p>

                    {/* 开始按钮 - 突出显示 */}
                    <div className="mt-8">
                        <button
                            onClick={() => router.push('/mbti/test')}
                            disabled={questions.length === 0}
                            className="group relative inline-flex items-center gap-2 px-8 py-4 bg-accent text-white rounded-full
                                text-lg font-medium shadow-lg shadow-accent/25 hover:shadow-xl hover:shadow-accent/40 hover:-translate-y-0.5
                                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:shadow-none
                                transition-all duration-300 overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                            {questions.length === 0 ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>准备试题中...</span>
                                </>
                            ) : (
                                <>
                                    <Play className="w-5 h-5 fill-current" />
                                    <span>开始测试</span>
                                </>
                            )}
                        </button>
                        <p className="mt-3 text-sm text-foreground-tertiary">
                            共 {questions.length || 93} 道题目 · 约需 10-15 分钟
                        </p>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 py-12">
                {/* 16种人格预览 */}
                <div className="mb-8 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                        <span className="w-1 h-6 bg-accent rounded-full" />
                        16型人格图鉴
                    </h2>
                    <span className="text-sm text-foreground-secondary">
                        点击查看详细解读
                    </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
                    {Object.entries(PERSONALITY_BASICS).map(([type, info]) => (
                        <button
                            key={type}
                            onClick={() => router.push(`/mbti/personality/${type}`)}
                            className="bg-background border border-border rounded-xl p-4 text-center
                                hover:border-accent/50 hover:shadow-md hover:shadow-accent/5 hover:-translate-y-1
                                transition-all duration-300 cursor-pointer group relative overflow-hidden"
                        >
                            <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <Eye className="w-4 h-4 text-accent" />
                            </div>

                            <div className="text-4xl mb-3 transform group-hover:scale-110 transition-transform duration-300">
                                {info.emoji}
                            </div>
                            <div className="text-lg font-bold text-foreground font-mono tracking-wide mb-1">
                                {type}
                            </div>
                            <div className="text-sm font-medium text-accent mb-1">
                                {info.title}
                            </div>
                            <div className="text-xs text-foreground-secondary line-clamp-1 opacity-70">
                                {info.description}
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function MBTIPage() {
    return (
        <MBTIPageContent />
    );
}
