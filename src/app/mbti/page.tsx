/**
 * MBTI 性格测试主页面
 *
 * 提供测试介绍与进入入口
 */
'use client'; // Uses client-side state for modal and question count.

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, Play, Loader2, Eye } from 'lucide-react';
import { LoginOverlay } from '@/components/auth/LoginOverlay';
import { loadQuestions, type MBTIQuestion, PERSONALITY_BASICS } from '@/lib/mbti';

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
        <div className="min-h-screen bg-background">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* 标题 */}
                <div className="text-center mb-10">
                    <div className="flex items-center justify-center mb-4">
                        <Brain className="w-12 h-12 text-blue-500" />
                    </div>
                    <h1 className="text-3xl font-bold text-foreground">MBTI 性格测试</h1>
                    <p className="text-foreground-secondary mt-2">
                        探索你的性格类型，了解真实的自己
                    </p>
                </div>

                {/* 16种人格预览 */}
                <div className="grid grid-cols-4 gap-3 mb-10">
                    {Object.entries(PERSONALITY_BASICS).map(([type, info]) => (
                        <button
                            key={type}
                            onClick={() => router.push(`/mbti/personality/${type}`)}
                            className="bg-background-secondary rounded-lg p-3 text-center
                                hover:bg-background-secondary/80 hover:ring-2 hover:ring-accent/50
                                transition-all cursor-pointer group"
                        >
                            <div className="text-2xl mb-1">{info.emoji}</div>
                            <div className="text-sm font-medium text-foreground">{type}</div>
                            <div className="text-xs text-foreground-secondary">{info.title}</div>
                            <div className="flex items-center justify-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Eye className="w-3 h-3 text-accent" />
                                <span className="text-xs text-accent">查看</span>
                            </div>
                        </button>
                    ))}
                </div>

                {/* 开始按钮 */}
                <div className="text-center">
                    <button
                        onClick={() => router.push('/mbti/test')}
                        disabled={questions.length === 0}
                        className="inline-flex items-center gap-2 px-8 py-4 bg-accent text-white rounded-xl
                            text-lg font-medium hover:bg-accent/90 disabled:opacity-50 
                            disabled:cursor-not-allowed transition-all"
                    >
                        {questions.length === 0 ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                加载中...
                            </>
                        ) : (
                            <>
                                <Play className="w-5 h-5" />
                                开始测试
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function MBTIPage() {
    return (
        <LoginOverlay message="登录后使用 MBTI 性格测试">
            <MBTIPageContent />
        </LoginOverlay>
    );
}
