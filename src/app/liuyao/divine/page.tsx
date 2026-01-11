/**
 * 六爻起卦页面
 *
 * 铜钱起卦交互
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { CoinToss } from '@/components/liuyao/CoinToss';
import { type Yao, type CoinTossResult, findHexagram, yaosTpCode, calculateChangedHexagram } from '@/lib/liuyao';
import { supabase } from '@/lib/supabase';

export default function DivinePage() {
    const router = useRouter();
    const [question, setQuestion] = useState('');
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        // 从 sessionStorage 获取问题（可能为空）
        const storedQuestion = sessionStorage.getItem('liuyao_question') || '';
        setQuestion(storedQuestion);
    }, []);

    const handleComplete = async (yaos: Yao[], results: CoinTossResult[]) => {
        setIsComplete(true);

        // 计算卦象
        const hexagramCode = yaosTpCode(yaos);
        const hexagram = findHexagram(hexagramCode);
        const { changedCode, changedLines } = calculateChangedHexagram(yaos);
        const changedHexagram = changedLines.length > 0 ? findHexagram(changedCode) : undefined;

        // 保存起卦记录到数据库
        let divinationId: string | null = null;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
                const res = await fetch('/api/liuyao', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                        action: 'save',
                        question,
                        yaos,
                        changedHexagram,
                        changedLines,
                    }),
                });
                const data = await res.json();
                if (data.success && data.data?.divinationId) {
                    divinationId = data.data.divinationId;
                }
            }
        } catch (error) {
            console.error('保存起卦记录失败:', error);
        }

        // 存储结果到 sessionStorage
        const result = {
            question,
            yaos,
            hexagram,
            changedHexagram,
            changedLines,
            divinationId,
            createdAt: new Date().toISOString(),
        };
        sessionStorage.setItem('liuyao_result', JSON.stringify(result));

        // 延迟跳转结果页
        setTimeout(() => {
            router.push('/liuyao/result');
        }, 1500);
    };



    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-2xl mx-auto px-4 py-8">
                {/* 返回 */}
                <Link
                    href="/liuyao"
                    className="inline-flex items-center gap-2 text-foreground-secondary hover:text-foreground mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    返回
                </Link>

                {/* 标题 */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-foreground">铜钱起卦</h1>
                    <p className="text-foreground-secondary mt-2">
                        静心凝神，点击按钮抛掷铜钱
                    </p>
                </div>

                {/* 问题显示 */}
                {question && (
                    <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-8">
                        <div className="text-center">
                            <span className="inline-flex items-center gap-1 text-sm text-accent font-medium">
                                <AlertCircle className="w-4 h-4" />
                                所问之事
                            </span>
                            <p className="text-foreground font-semibold text-lg mt-2">{question}</p>
                        </div>
                    </div>
                )}

                {/* 铜钱起卦 */}
                <div className="bg-background rounded-xl p-8">
                    <CoinToss onComplete={handleComplete} disabled={isComplete} />
                </div>

                {/* 完成提示 */}
                {isComplete && (
                    <div className="text-center mt-8 animate-pulse">
                        <p className="text-accent font-medium">卦象已成，正在解读...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
