/**
 * 六爻占卜主页面
 * 
 * 提供起卦方式选择和历史记录
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Coins, Sparkles, Dices, Grid3X3 } from 'lucide-react';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import { useToast } from '@/components/ui/Toast';
import { divine, yaosTpCode, findHexagram, calculateChangedHexagram, type LiuQin } from '@/lib/divination/liuyao';
import { HistoryDrawer } from '@/components/layout/HistoryDrawer';
import { YongShenTargetPicker } from '@/components/liuyao/YongShenTargetPicker';
import { supabase } from '@/lib/auth';
import { writeSessionJSON } from '@/lib/cache';
import { FeatureGate } from '@/components/layout/FeatureGate';

export default function LiuyaoPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [question, setQuestion] = useState('');
    const [yongShenTargets, setYongShenTargets] = useState<LiuQin[]>([]);
    const [isQuickLoading, setIsQuickLoading] = useState(false);

    const ensureTargetsSelected = (): boolean => {
        const requiresTargets = question.trim().length > 0;
        if (!requiresTargets) return true;
        if (yongShenTargets.length > 0) return true;
        showToast('error', '请至少选择一个分析目标');
        return false;
    };

    // 铜钱起卦 - 跳转到起卦页面
    const handleCoinDivine = () => {
        if (!ensureTargetsSelected()) return;
        writeSessionJSON('liuyao_question', { question, yongShenTargets });
        router.push('/liuyao/divine');
    };

    const handleSelectDivine = () => {
        if (!ensureTargetsSelected()) return;
        writeSessionJSON('liuyao_question', { question, yongShenTargets });
        router.push('/liuyao/select');
    };

    // 快速起卦 - 系统自动生成
    const handleQuickDivine = async () => {
        if (!ensureTargetsSelected()) return;
        setIsQuickLoading(true);

        // 添加延迟让用户看到加载状态
        await new Promise(resolve => setTimeout(resolve, 800));

        try {
            const { yaos } = divine();
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
                            yongShenTargets,
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

            const result = {
                question,
                yongShenTargets,
                yaos,
                hexagram,
                changedHexagram,
                changedLines,
                divinationId,
                createdAt: new Date().toISOString(),
            };
            writeSessionJSON('liuyao_result', result);
            router.push('/liuyao/result');
        } catch (error) {
            console.error('快速起卦失败:', error);
            showToast('error', '起卦失败，请重试');
        } finally {
            setIsQuickLoading(false);
        }
    };

    return (
        <FeatureGate featureId="liuyao">
        <div className="min-h-screen bg-background md:pb-12">
            {/* 顶部 Hero 区域 - 移动端隐藏 */}
            <div className="hidden md:block relative overflow-hidden bg-background-secondary/30 border-b border-border/50">
                <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
                <div className="max-w-4xl mx-auto px-4 py-16 text-center relative z-10">
                    <div className="inline-flex items-center justify-center p-4 rounded-2xl mb-6 shadow-lg shadow-amber-500/10">
                        <Dices className="w-12 h-12 text-amber-500" />
                    </div>
                    <h1 className="text-4xl font-bold text-foreground mb-4 tracking-tight">
                        六爻占卜
                    </h1>
                    <p className="text-lg text-foreground-secondary max-w-2xl mx-auto leading-relaxed">
                        源自《易经》的古老智慧，为您指点迷津。
                        <br className="hidden sm:block" />
                        心诚则灵，预测事物发展趋势。
                    </p>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 -mt-12 relative z-20">
                {/* 问题输入 */}
                <div className="sm:mt-0 mt-16 sm:mb-10 mb-4 text-center max-w-2xl mx-auto">
                    <label className="block text-sm font-medium text-foreground-secondary mb-3">
                        心中默念您的问题（选填）
                    </label>
                    <div className="relative group">
                        <div className="absolute inset-0 bg-amber-500/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                        <div className="absolute inset-y-0 right-2 z-10 flex items-center">
                            <YongShenTargetPicker
                                value={yongShenTargets}
                                onChange={setYongShenTargets}
                                variant="inline-right"
                            />
                        </div>
                        <input
                            type="text"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="例如：我近期的事业运势如何？这次合作能否顺利达成？"
                            className="relative w-full px-6 py-4 bg-background rounded-xl border border-border shadow-sm 
                                focus:border-amber-500 focus:ring-0 focus:outline-none 
                                text-center text-lg placeholder:text-foreground-tertiary/70 pr-44
                                transition-all duration-300"
                        />
                    </div>
                </div>

                {/* 起卦方式 */}
                <div className="grid md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
                    {/* 铜钱起卦 */}
                    <button
                        onClick={handleCoinDivine}
                        className="group relative bg-background rounded-2xl p-5 md:p-8 text-left border border-border hover:border-yellow-500/50 hover:shadow-lg hover:shadow-yellow-500/5 transition-all duration-300 overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-12 bg-yellow-500/5 rounded-bl-[100px] -mr-6 -mt-6 transition-transform duration-500 group-hover:scale-110" />

                        <div className="relative z-10 flex flex-row md:flex-col h-full items-start text-left">
                            <div className="shrink-0 w-12 h-12 md:w-14 md:h-14 bg-yellow-50 rounded-xl md:rounded-2xl flex items-center justify-center mr-4 md:mr-0 md:mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Coins className="w-6 h-6 md:w-8 md:h-8 text-yellow-600" />
                            </div>

                            <div className="flex-1 flex flex-col">
                                <h3 className="text-lg md:text-xl font-bold text-foreground mb-1 md:mb-2 group-hover:text-yellow-600 transition-colors">
                                    铜钱起卦
                                </h3>
                                <p className="text-sm md:text-base text-foreground-secondary leading-relaxed mb-2 md:mb-6 flex-1">
                                    模拟传统三铜钱起卦法，诚心抛掷六次，亲自感应卦象变化，体验古法占卜的仪式感。
                                </p>

                                <div className="flex items-center text-sm font-medium text-yellow-600 opacity-100 md:opacity-0 group-hover:opacity-100 transform md:translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300 mt-auto">
                                    开始起卦 <span className="ml-1">→</span>
                                </div>
                            </div>
                        </div>
                    </button>

                    {/* 快速起卦 */}
                    <button
                        onClick={handleQuickDivine}
                        disabled={isQuickLoading}
                        className="group relative bg-background rounded-2xl p-5 md:p-8 text-left border border-border hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300 overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        <div className="absolute top-0 right-0 p-12 bg-purple-500/5 rounded-bl-[100px] -mr-6 -mt-6 transition-transform duration-500 group-hover:scale-110" />

                        <div className="relative z-10 flex flex-row md:flex-col h-full items-start text-left">
                            <div className="shrink-0 w-12 h-12 md:w-14 md:h-14 bg-purple-50 rounded-xl md:rounded-2xl flex items-center justify-center mr-4 md:mr-0 md:mb-6 group-hover:scale-110 transition-transform duration-300">
                                {isQuickLoading ? (
                                    <SoundWaveLoader variant="inline" />
                                ) : (
                                    <Sparkles className="w-6 h-6 md:w-8 md:h-8 text-purple-600" />
                                )}
                            </div>

                            <div className="flex-1 flex flex-col">
                                <h3 className="text-lg md:text-xl font-bold text-foreground mb-1 md:mb-2 group-hover:text-purple-600 transition-colors">
                                    {isQuickLoading ? '正在起卦...' : '快速起卦'}
                                </h3>
                                <p className="text-sm md:text-base text-foreground-secondary leading-relaxed mb-2 md:mb-6 flex-1">
                                    利用计算机随机算法生成卦象，适合想要快速获得指引，或不方便进行手动起卦的场景。
                                </p>

                                <div className="flex items-center text-sm font-medium text-purple-600 opacity-100 md:opacity-0 group-hover:opacity-100 transform md:translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300 mt-auto">
                                    立即生成 <span className="ml-1">→</span>
                                </div>
                            </div>
                        </div>
                    </button>

                    {/* 选卦起卦 */}
                    <button
                        onClick={handleSelectDivine}
                        className="group relative bg-background rounded-2xl p-5 md:p-8 text-left border border-border hover:border-teal-500/50 hover:shadow-lg hover:shadow-teal-500/5 transition-all duration-300 overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-12 bg-teal-500/5 rounded-bl-[100px] -mr-6 -mt-6 transition-transform duration-500 group-hover:scale-110" />

                        <div className="relative z-10 flex flex-row md:flex-col h-full items-start text-left">
                            <div className="shrink-0 w-12 h-12 md:w-14 md:h-14 bg-teal-50 rounded-xl md:rounded-2xl flex items-center justify-center mr-4 md:mr-0 md:mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Grid3X3 className="w-6 h-6 md:w-8 md:h-8 text-teal-600" />
                            </div>

                            <div className="flex-1 flex flex-col">
                                <h3 className="text-lg md:text-xl font-bold text-foreground mb-1 md:mb-2 group-hover:text-teal-600 transition-colors">
                                    选卦起卦
                                </h3>
                                <p className="text-sm md:text-base text-foreground-secondary leading-relaxed mb-2 md:mb-6 flex-1">
                                    手动选择已知卦象和变爻，适合已有卦象需要详细分析的场景。
                                </p>

                                <div className="flex items-center text-sm font-medium text-teal-600 opacity-100 md:opacity-0 group-hover:opacity-100 transform md:translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300 mt-auto">
                                    选择卦象 <span className="ml-1">→</span>
                                </div>
                            </div>
                        </div>
                    </button>
                </div>

                {/* 说明 */}
                <div className="bg-background-secondary/30 rounded-2xl p-5 md:p-8 border border-border/50">
                    <h3 className="text-base md:text-lg font-semibold text-foreground mb-4 md:mb-6 flex items-center gap-2">
                        <span className="w-1 h-4 md:h-5 bg-foreground rounded-full" />
                        六爻占卜说明
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6 md:gap-8 text-sm leading-relaxed">
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                                    什么是六爻？
                                </h4>
                                <p className="text-xs md:text-sm text-foreground-secondary pl-3.5 border-l border-border/50">
                                    六爻是《周易》预测学的一个分支，通过铜钱或其他方式起卦，
                                    得到由六个爻组成的卦象，再根据卦象判断事物吉凶。
                                </p>
                            </div>
                            <div>
                                <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                                    起卦方法
                                </h4>
                                <p className="text-xs md:text-sm text-foreground-secondary pl-3.5 border-l border-border/50">
                                    传统铜钱法：三枚铜钱抛掷六次，
                                    三正为老阳（变），三反为老阴（变），
                                    二正一反为少阳，一正二反为少阴。
                                </p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                                    什么是变爻？
                                </h4>
                                <p className="text-xs md:text-sm text-foreground-secondary pl-3.5 border-l border-border/50">
                                    老阳和老阴为变爻，会形成变卦。
                                    变卦代表事物的发展趋势和最终结果，是解卦的重要依据。
                                </p>
                            </div>
                            <div>
                                <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                                    注意事项
                                </h4>
                                <p className="text-xs md:text-sm text-foreground-secondary pl-3.5 border-l border-border/50">
                                    起卦时心诚则灵，专注于问题。
                                    同一问题不宜反复占卜，以第一次起卦结果为准。
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* 历史记录抽屉 */}
            <HistoryDrawer type="liuyao" />
        </div>
        </FeatureGate>
    );
}
