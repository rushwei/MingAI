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
import { LoginOverlay } from '@/components/auth/LoginOverlay';
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
        <LoginOverlay message="登录后体验塔罗占卜">
            <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
                {/* 标题 */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center mb-4">
                        <Gem className="w-12 h-12 text-rose-500" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">塔罗占卜</h1>
                    <p className="text-foreground-secondary">选择牌阵，探索命运的指引</p>
                </div>

                {/* 每日一牌 */}
                {dailyCard && (
                    <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-4 mb-6">
                        <div className="flex items-center gap-4">
                            <div className="relative w-20 h-32 rounded-lg overflow-hidden shadow-lg">
                                <Image
                                    src={dailyCard.card.image}
                                    alt={dailyCard.card.nameChinese}
                                    fill
                                    className={`object-cover ${dailyCard.orientation === 'reversed' ? 'rotate-180' : ''}`}
                                />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <Calendar className="w-4 h-4 text-purple-500" />
                                    <span className="text-sm text-purple-500">今日一牌</span>
                                </div>
                                <h3 className="font-semibold text-lg">
                                    {dailyCard.card.nameChinese}
                                    <span className="text-sm text-foreground-secondary ml-2">
                                        {dailyCard.orientation === 'reversed' ? '（逆位）' : '（正位）'}
                                    </span>
                                </h3>
                                <p className="text-sm text-foreground-secondary mt-1">
                                    {dailyCard.orientation === 'reversed'
                                        ? dailyCard.card.reversedMeaning
                                        : dailyCard.card.uprightMeaning}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 问题输入 */}
                <div className="mb-6">
                    <label className="block text-sm text-foreground-secondary mb-2">
                        你想问什么？（可选）
                    </label>
                    <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="例如：我的事业发展会如何？"
                        className="w-full px-4 py-3 bg-background-secondary rounded-xl border border-border focus:border-accent focus:outline-none transition-colors"
                    />
                </div>

                {/* 牌阵选择 */}
                <div className="space-y-3">
                    <h2 className="font-semibold flex items-center gap-2">
                        <Layers className="w-4 h-4 text-accent" />
                        选择牌阵
                    </h2>
                    {TAROT_SPREADS.map(spread => (
                        <button
                            key={spread.id}
                            onClick={() => handleSelectSpread(spread)}
                            className="w-full p-4 bg-background-secondary rounded-xl text-left hover:bg-background-tertiary transition-colors group"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-medium flex items-center gap-2">
                                        {spread.name}
                                        <span className="text-xs text-foreground-secondary bg-background px-2 py-0.5 rounded">
                                            {spread.cardCount}张牌
                                        </span>
                                    </div>
                                    <p className="text-sm text-foreground-secondary mt-1">
                                        {spread.description}
                                    </p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-foreground-secondary group-hover:text-accent transition-colors" />
                            </div>
                        </button>
                    ))}
                </div>
            </div>
            <HistoryDrawer type="tarot" />
        </LoginOverlay>
    );
}
