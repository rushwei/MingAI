/**
 * 六爻占卜主页面
 * 
 * 提供起卦方式选择和历史记录
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Coins, History, Sparkles, HelpCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { divine, yaosTpCode, findHexagram, calculateChangedHexagram } from '@/lib/liuyao';

export default function LiuyaoPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [question, setQuestion] = useState('');
    const [isQuickLoading, setIsQuickLoading] = useState(false);

    // 铜钱起卦 - 跳转到起卦页面
    const handleCoinDivine = () => {
        sessionStorage.setItem('liuyao_question', question);
        router.push('/liuyao/divine');
    };

    // 快速起卦 - 系统自动生成
    const handleQuickDivine = async () => {
        setIsQuickLoading(true);

        // 添加延迟让用户看到加载状态
        await new Promise(resolve => setTimeout(resolve, 800));

        try {
            const { yaos, results } = divine();
            const hexagramCode = yaosTpCode(yaos);
            const hexagram = findHexagram(hexagramCode);
            const { changedCode, changedLines } = calculateChangedHexagram(yaos);
            const changedHexagram = changedLines.length > 0 ? findHexagram(changedCode) : undefined;

            const result = {
                question,
                yaos,
                hexagram,
                changedHexagram,
                changedLines,
                createdAt: new Date().toISOString(),
            };
            sessionStorage.setItem('liuyao_result', JSON.stringify(result));
            router.push('/liuyao/result');
        } catch (error) {
            console.error('快速起卦失败:', error);
            showToast('error', '起卦失败，请重试');
        } finally {
            setIsQuickLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* 标题 */}
                <div className="text-center mb-10">
                    <div className="text-5xl mb-4">☯️</div>
                    <h1 className="text-3xl font-bold text-foreground">六爻占卜</h1>
                    <p className="text-foreground-secondary mt-2">
                        源自《易经》，通过卦象变化预测事物发展趋势
                    </p>
                </div>

                {/* 问题输入 */}
                <div className="bg-background-secondary rounded-xl p-6 mb-8">
                    <label className="block text-sm font-medium text-foreground mb-2">
                        <HelpCircle className="w-4 h-4 inline mr-1" />
                        请输入您想占卜的问题（可选）
                    </label>
                    <textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="例如：我近期的事业运势如何？"
                        className="w-full h-24 px-4 py-3 bg-background border border-border rounded-lg
                            text-foreground placeholder:text-foreground-secondary
                            focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                    />
                    <p className="text-xs text-foreground-secondary mt-2">
                        提示：问题越具体，解卦越准确。避免问是非题，建议问"如何"、"怎样"类问题。
                    </p>
                </div>

                {/* 起卦方式 */}
                <div className="grid md:grid-cols-2 gap-6 mb-10">
                    {/* 铜钱起卦 */}
                    <button
                        onClick={handleCoinDivine}
                        className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-left
                            hover:border-yellow-500/60 hover:bg-yellow-500/15
                            transition-all group"
                    >
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-yellow-500/20 rounded-lg group-hover:bg-yellow-500/30 transition-colors">
                                <Coins className="w-8 h-8 text-yellow-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-foreground mb-1">铜钱起卦</h3>
                                <p className="text-sm text-foreground-secondary">
                                    模拟传统三铜钱起卦法，抛掷六次生成卦象
                                </p>
                            </div>
                        </div>
                    </button>

                    {/* 快速起卦 */}
                    <button
                        onClick={handleQuickDivine}
                        disabled={isQuickLoading}
                        className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-6 text-left
                            hover:border-purple-500/60 hover:bg-purple-500/15
                            transition-all group disabled:opacity-50"
                    >
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30 transition-colors">
                                {isQuickLoading ? (
                                    <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
                                ) : (
                                    <Sparkles className="w-8 h-8 text-purple-500" />
                                )}
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-foreground mb-1">
                                    {isQuickLoading ? '正在起卦...' : '快速起卦'}
                                </h3>
                                <p className="text-sm text-foreground-secondary">
                                    系统随机生成卦象，快速获得占卜结果
                                </p>
                            </div>
                        </div>
                    </button>
                </div>

                {/* 说明 */}
                <div className="bg-background-secondary/50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">六爻占卜说明</h3>
                    <div className="grid md:grid-cols-2 gap-6 text-sm text-foreground-secondary">
                        <div>
                            <h4 className="font-medium text-foreground mb-2">什么是六爻？</h4>
                            <p>
                                六爻是《周易》预测学的一个分支，通过铜钱或其他方式起卦，
                                得到由六个爻组成的卦象，再根据卦象判断事物吉凶。
                            </p>
                        </div>
                        <div>
                            <h4 className="font-medium text-foreground mb-2">起卦方法</h4>
                            <p>
                                传统铜钱法：三枚铜钱抛掷六次，
                                三正为老阳（变），三反为老阴（变），
                                二正一反为少阳，一正二反为少阴。
                            </p>
                        </div>
                        <div>
                            <h4 className="font-medium text-foreground mb-2">变爻</h4>
                            <p>
                                老阳和老阴为变爻，会形成变卦。
                                变卦代表事物的发展趋势和最终结果。
                            </p>
                        </div>
                        <div>
                            <h4 className="font-medium text-foreground mb-2">注意事项</h4>
                            <p>
                                起卦时心诚则灵，专注于问题。
                                同一问题不宜反复占卜，以第一次为准。
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
