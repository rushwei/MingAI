/**
 * 六爻起卦页面
 *
 * 铜钱起卦交互
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { CoinToss } from '@/components/liuyao/CoinToss';
import { type Yao, type CoinTossResult, findHexagram, yaosTpCode, calculateChangedHexagram } from '@/lib/liuyao';
import { supabase } from '@/lib/supabase';
import { readSessionJSON, writeSessionJSON } from '@/lib/cache';

export default function DivinePage() {
    const router = useRouter();
    const [question] = useState(() => {
        if (typeof window === 'undefined') return '';
        return readSessionJSON<string>('liuyao_question') || '';
    });
    const [isComplete, setIsComplete] = useState(false);

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
            results,
            hexagram,
            changedHexagram,
            changedLines,
            divinationId,
            createdAt: new Date().toISOString(),
        };
        writeSessionJSON('liuyao_result', result);

        // 延迟跳转结果页
        setTimeout(() => {
            router.push('/liuyao/result');
        }, 1500);
    };



    return (
        <div className="md:min-h-screen bg-background">
            <div className="max-w-2xl mx-auto px-4 py-4 md:py-8">
                {/* 返回 - 仅桌面端显示 */}
                <Link
                    href="/liuyao"
                    className="hidden md:inline-flex items-center gap-2 text-foreground-secondary hover:text-foreground mb-4 md:mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    返回
                </Link>

                {/* 标题 */}
                <div className="text-center mb-4 md:mb-8">
                    <h1 className="hidden md:block text-xl md:text-2xl font-bold text-foreground">铜钱起卦</h1>
                    <p className="text-foreground-secondary md:mt-1 md:mt-2 text-sm md:text-base">
                        静心凝神，点击按钮抛掷铜钱
                    </p>
                </div>

                {/* 问题显示 */}
                {question && (
                    <div className="bg-accent/10 border border-accent/30 rounded-xl p-3 md:p-4 mb-4 md:mb-8">
                        <div className="text-center">
                            <span className="inline-flex items-center gap-1 text-xs md:text-sm text-accent font-medium">
                                <AlertCircle className="w-3 h-3 md:w-4 md:h-4" />
                                所问之事
                            </span>
                            <p className="text-foreground font-semibold text-base md:text-lg mt-1 md:mt-2">{question}</p>
                        </div>
                    </div>
                )}

                {/* 铜钱起卦 */}
                <div className="bg-background rounded-xl p-0 md:p-8">
                    <CoinToss onComplete={handleComplete} disabled={isComplete} />
                </div>

                {/* 完成提示 */}
                {isComplete && (
                    <div className="text-center mt-4 md:mt-8">
                        <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin text-accent mx-auto" />
                        <p className="text-accent text-sm md:text-base font-medium mt-2">卦象已成，正在跳转...</p>
                    </div>
                )}
            </div>
        </div>
    );
}
