/**
 * 塔罗牌占卜页面
 *
 * 选择牌阵并跳转到结果页
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Calendar, Layers, ChevronRight, Gem } from 'lucide-react';
import Image from 'next/image';

import { TAROT_SPREADS, getDailyCard, type DrawnCard, type TarotSpread } from '@/lib/tarot';

const HistoryDrawer = dynamic(
    () => import('@/components/layout/HistoryDrawer').then(mod => mod.HistoryDrawer),
    { ssr: false }
);

export default function TarotPage() {
    const router = useRouter();
    const [question, setQuestion] = useState('');
    const [dailyCard] = useState<DrawnCard | null>(() => getDailyCard());

    const handleSelectSpread = (spread: TarotSpread) => {
        const params = new URLSearchParams();
        params.set('spreadId', spread.id);
        if (question.trim()) {
            params.set('question', question.trim());
        }
        router.push(`/tarot/result?${params.toString()}`);
    };

    return (
        <>
            <div className="min-h-screen bg-background pb-12">
                {/* 顶部 Hero 区域 */}
                <div className="relative overflow-hidden bg-background-secondary/30 border-b border-border/50">
                    <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
                    <div className="max-w-4xl mx-auto px-4 py-16 text-center relative z-10">
                        <div className="inline-flex items-center justify-center p-4 rounded-2xl mb-6 shadow-lg shadow-purple-500/10">
                            <Gem className="w-12 h-12 text-purple-500" />
                        </div>
                        <h1 className="text-4xl font-bold text-foreground mb-4 tracking-tight">
                            塔罗占卜
                        </h1>
                        <p className="text-lg text-foreground-secondary max-w-2xl mx-auto leading-relaxed">
                            聆听内心的声音，探索命运的指引。
                            <br className="hidden sm:block" />
                            通过塔罗牌阵，洞察过去、现在与未来。
                        </p>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto px-4 -mt-8 relative z-20">
                    {/* 每日一牌 - 卡片样式增强 */}
                    {dailyCard && (
                        <div className="bg-background rounded-2xl p-6 shadow-xl border border-border/50 mb-10 overflow-hidden relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-pink-500/5 opacity-50" />

                            <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
                                <div className="relative w-32 h-48 flex-shrink-0 rounded-lg overflow-hidden shadow-2xl transform group-hover:scale-105 transition-transform duration-500 ease-out">
                                    <Image
                                        src={dailyCard.card.image}
                                        alt={dailyCard.card.nameChinese}
                                        fill
                                        className={`object-cover ${dailyCard.orientation === 'reversed' ? 'rotate-180' : ''}`}
                                    />
                                    <div className="absolute inset-0 ring-1 ring-black/10 rounded-lg" />
                                </div>

                                <div className="flex-1 text-center sm:text-left">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-600 text-xs font-medium mb-3">
                                        <Calendar className="w-3.5 h-3.5" />
                                        今日指引
                                    </div>

                                    <h3 className="text-2xl font-bold mb-2 flex items-center justify-center sm:justify-start gap-3">
                                        {dailyCard.card.nameChinese}
                                        <span className={`px-2 py-0.5 rounded text-xs font-normal border ${dailyCard.orientation === 'reversed'
                                            ? 'bg-orange-50 text-orange-600 border-orange-200'
                                            : 'bg-green-50 text-green-600 border-green-200'
                                            }`}>
                                            {dailyCard.orientation === 'reversed' ? '逆位' : '正位'}
                                        </span>
                                    </h3>

                                    <p className="text-foreground-secondary leading-relaxed mb-4">
                                        {dailyCard.orientation === 'reversed'
                                            ? dailyCard.card.reversedMeaning
                                            : dailyCard.card.uprightMeaning}
                                    </p>

                                    <div className="text-xs text-foreground-tertiary">
                                        * 每日自动抽取，为您提供当天的运势指引
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 问题输入 */}
                    <div className="mb-10 text-center max-w-2xl mx-auto">
                        <label className="block text-sm font-medium text-foreground-secondary mb-3">
                            心中默念您的问题（选填）
                        </label>
                        <div className="relative group">
                            <div className="absolute inset-0 bg-accent/20 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                            <input
                                type="text"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                placeholder="例如：我的事业发展会如何？近期会有桃花运吗？"
                                className="relative w-full px-6 py-4 bg-background rounded-xl border border-border shadow-sm 
                                    focus:border-accent focus:ring-0 focus:outline-none 
                                    text-center text-lg placeholder:text-foreground-tertiary/70
                                    transition-all duration-300"
                            />
                        </div>
                    </div>

                    {/* 牌阵选择 - 网格布局 */}
                    <div>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-semibold flex items-center gap-2">
                                <Layers className="w-5 h-5 text-accent" />
                                选择牌阵开始占卜
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {TAROT_SPREADS.map(spread => (
                                <button
                                    key={spread.id}
                                    onClick={() => handleSelectSpread(spread)}
                                    className="relative flex flex-col p-6 bg-background rounded-2xl border border-border hover:border-accent/40 text-left transition-all duration-300 group hover:shadow-lg hover:shadow-accent/5 hover:-translate-y-1 overflow-hidden"
                                >
                                    {/* 背景装饰 */}
                                    <div className="absolute top-0 right-0 p-8 bg-accent/5 rounded-bl-full -mr-4 -mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                    <div className="relative z-10">
                                        <div className="flex items-center justify-between mb-3">
                                            <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-background-secondary text-foreground group-hover:bg-accent group-hover:text-white transition-colors duration-300">
                                                <Layers className="w-5 h-5" />
                                            </span>
                                            <span className="text-xs font-medium text-foreground-secondary bg-background-secondary px-2.5 py-1 rounded-full group-hover:bg-background group-hover:text-accent transition-colors">
                                                {spread.cardCount} 张牌
                                            </span>
                                        </div>

                                        <h3 className="text-lg font-bold mb-2 group-hover:text-accent transition-colors">
                                            {spread.name}
                                        </h3>

                                        <p className="text-sm text-foreground-secondary leading-relaxed line-clamp-2 mb-4 h-10">
                                            {spread.description}
                                        </p>

                                        <div className="flex items-center text-xs font-medium text-accent opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300">
                                            开始占卜 <ChevronRight className="w-3 h-3 ml-1" />
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            <HistoryDrawer type="tarot" />
        </>
    );
}
