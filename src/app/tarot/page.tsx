/**
 * 塔罗牌占卜页面
 * 
 * 支持每日一牌、选择牌阵抽牌和 AI 解读
 */
'use client';

import { useState, useEffect } from 'react';
import {
    Sparkles,
    Shuffle,
    Calendar,
    Layers,
    ChevronRight,
    RotateCcw,
    Loader2,
    Send,
    Eye,
} from 'lucide-react';
import Image from 'next/image';
import { LoginOverlay } from '@/components/auth/LoginOverlay';
import { TAROT_SPREADS, getDailyCard, type DrawnCard, type TarotSpread } from '@/lib/tarot';
import { supabase } from '@/lib/supabase';

type PageState = 'home' | 'select-spread' | 'drawing' | 'result';

function TarotPageContent() {
    const [state, setState] = useState<PageState>('home');
    const [selectedSpread, setSelectedSpread] = useState<TarotSpread | null>(null);
    const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
    const [question, setQuestion] = useState('');
    const [interpretation, setInterpretation] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isInterpreting, setIsInterpreting] = useState(false);
    const [dailyCard, setDailyCard] = useState<DrawnCard | null>(null);
    const [revealedCards, setRevealedCards] = useState<number[]>([]);

    // 加载每日一牌
    useEffect(() => {
        const card = getDailyCard();
        setDailyCard(card);
    }, []);

    // 选择牌阵并抽牌
    const handleSelectSpread = async (spread: TarotSpread) => {
        setSelectedSpread(spread);
        setState('drawing');
        setIsLoading(true);
        setRevealedCards([]);
        setInterpretation('');

        try {
            const res = await fetch('/api/tarot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'spread',
                    spreadId: spread.id,
                    allowReversed: true,
                }),
            });
            const data = await res.json();

            if (data.success && data.data?.cards) {
                setDrawnCards(data.data.cards);
                setState('result');
            }
        } catch (error) {
            console.error('抽牌失败:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // 翻牌动画
    const revealCard = (index: number) => {
        if (!revealedCards.includes(index)) {
            setRevealedCards(prev => [...prev, index]);
        }
    };

    // 全部翻开
    const revealAll = () => {
        setRevealedCards(drawnCards.map((_, i) => i));
    };

    // AI 解读
    const handleInterpret = async () => {
        if (drawnCards.length === 0) return;

        setIsInterpreting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                alert('请先登录');
                return;
            }

            const res = await fetch('/api/tarot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    action: 'interpret',
                    cards: drawnCards,
                    question: question || undefined,
                    spreadId: selectedSpread?.id,
                }),
            });

            const data = await res.json();
            if (data.success && data.data?.interpretation) {
                setInterpretation(data.data.interpretation);
            } else {
                alert(data.error || '解读失败');
            }
        } catch (error) {
            console.error('AI 解读失败:', error);
        } finally {
            setIsInterpreting(false);
        }
    };

    // 重新开始
    const handleReset = () => {
        setState('home');
        setSelectedSpread(null);
        setDrawnCards([]);
        setQuestion('');
        setInterpretation('');
        setRevealedCards([]);
    };

    // ===== 首页 =====
    if (state === 'home') {
        return (
            <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
                {/* 标题 */}
                <div className="text-center mb-8">
                    <div className="text-5xl mb-4">🃏</div>
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

                {/* 问题输入 */}
                <div className="mt-6">
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
            </div>
        );
    }

    // ===== 抽牌中 =====
    if (state === 'drawing' || isLoading) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-8 text-center animate-fade-in">
                <div className="text-5xl mb-4 animate-pulse">🃏</div>
                <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
                <p className="text-foreground-secondary">正在洗牌抽取...</p>
            </div>
        );
    }

    // ===== 结果展示 =====
    return (
        <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
            {/* 顶部操作栏 */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="font-semibold">{selectedSpread?.name}</h1>
                    <p className="text-sm text-foreground-secondary">{selectedSpread?.description}</p>
                </div>
                <button
                    onClick={handleReset}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-background-secondary hover:bg-background-tertiary transition-colors"
                >
                    <RotateCcw className="w-4 h-4" />
                    重新开始
                </button>
            </div>

            {/* 牌阵展示 */}
            <div className={`grid gap-4 mb-6 ${drawnCards.length === 1 ? 'grid-cols-1 justify-items-center' :
                    drawnCards.length <= 3 ? 'grid-cols-3' :
                        drawnCards.length <= 4 ? 'grid-cols-2 sm:grid-cols-4' :
                            'grid-cols-2 sm:grid-cols-5'
                }`}>
                {drawnCards.map((card, index) => {
                    const isRevealed = revealedCards.includes(index);
                    return (
                        <div key={index} className="flex flex-col items-center">
                            <button
                                onClick={() => revealCard(index)}
                                className={`relative w-24 h-36 sm:w-28 sm:h-40 rounded-lg overflow-hidden shadow-lg transition-all duration-500 ${isRevealed ? '' : 'cursor-pointer hover:scale-105'
                                    }`}
                                style={{
                                    transform: isRevealed && card.orientation === 'reversed' ? 'rotate(180deg)' : undefined,
                                }}
                            >
                                {isRevealed ? (
                                    <Image
                                        src={card.card.image}
                                        alt={card.card.nameChinese}
                                        fill
                                        className="object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center">
                                        <div className="text-white/30 text-4xl">?</div>
                                    </div>
                                )}
                            </button>
                            <div className="text-center mt-2">
                                <div className="text-xs text-foreground-secondary">
                                    {selectedSpread?.positions[index]?.name}
                                </div>
                                {isRevealed && (
                                    <div className="text-sm font-medium">
                                        {card.card.nameChinese}
                                        <span className="text-xs text-foreground-secondary ml-1">
                                            {card.orientation === 'reversed' ? '逆' : '正'}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 翻牌按钮 */}
            {revealedCards.length < drawnCards.length && (
                <div className="text-center mb-6">
                    <button
                        onClick={revealAll}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
                    >
                        <Eye className="w-4 h-4" />
                        全部翻开
                    </button>
                </div>
            )}

            {/* 牌义摘要 */}
            {revealedCards.length === drawnCards.length && (
                <div className="bg-background-secondary rounded-xl p-4 mb-6">
                    <h2 className="font-semibold mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-accent" />
                        牌义速览
                    </h2>
                    <div className="space-y-3">
                        {drawnCards.map((card, index) => (
                            <div key={index} className="p-3 bg-background rounded-lg">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs text-foreground-secondary">
                                        {selectedSpread?.positions[index]?.name}：
                                    </span>
                                    <span className="font-medium">
                                        {card.card.nameChinese}
                                        <span className={`text-xs ml-1 ${card.orientation === 'reversed' ? 'text-red-500' : 'text-green-500'}`}>
                                            {card.orientation === 'reversed' ? '逆位' : '正位'}
                                        </span>
                                    </span>
                                </div>
                                <p className="text-sm text-foreground-secondary">
                                    {card.orientation === 'reversed' ? card.card.reversedMeaning : card.card.uprightMeaning}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* AI 解读 */}
            {revealedCards.length === drawnCards.length && (
                <div className="bg-gradient-to-r from-accent/5 to-purple-500/5 border border-accent/20 rounded-xl p-4">
                    <h2 className="font-semibold mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-accent" />
                        AI 深度解读
                    </h2>

                    {interpretation ? (
                        <div className="prose prose-sm max-w-none text-foreground-secondary whitespace-pre-wrap">
                            {interpretation}
                        </div>
                    ) : (
                        <>
                            <p className="text-sm text-foreground-secondary mb-4">
                                让 AI 为你综合解读牌阵含义（消耗 1 积分）
                            </p>
                            <button
                                onClick={handleInterpret}
                                disabled={isInterpreting}
                                className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
                            >
                                {isInterpreting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        解读中...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        获取 AI 解读
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}

export default function TarotPage() {
    return (
        <LoginOverlay message="登录后体验塔罗占卜">
            <TarotPageContent />
        </LoginOverlay>
    );
}
