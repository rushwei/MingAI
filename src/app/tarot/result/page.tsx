/**
 * 塔罗结果页
 *
 * 负责抽牌展示、翻牌保存与 AI 解读
 */
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Sparkles,
    RotateCcw,
    RefreshCw,
    Loader2,
    Send,
    Eye,
    ArrowLeft,
    Share2,
} from 'lucide-react';
import Image from 'next/image';
import { TAROT_SPREADS, type DrawnCard, type TarotSpread } from '@/lib/tarot';
import { supabase } from '@/lib/supabase';
import { MarkdownContent } from '@/components/ui/MarkdownContent';
import { TarotShareCard } from '@/components/tarot/TarotShareCard';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { DEFAULT_MODEL_ID } from '@/lib/ai-config';
import { getMembershipInfo, type MembershipType } from '@/lib/membership';
import { ThinkingBlock } from '@/components/chat/ThinkingBlock';
import { extractAnalysisFromConversation } from '@/lib/ai-analysis-query';
import type { ChatMessage } from '@/types';
import { AuthModal } from '@/components/auth/AuthModal';

function TarotResultContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const historyTimestamp = searchParams.get('t');
    const spreadId = searchParams.get('spreadId');
    const questionParam = searchParams.get('question');

    const [selectedSpread, setSelectedSpread] = useState<TarotSpread | null>(null);
    const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
    const [question, setQuestion] = useState('');
    const [interpretation, setInterpretation] = useState('');
    const [interpretationReasoning, setInterpretationReasoning] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isInterpreting, setIsInterpreting] = useState(false);
    const [revealedCards, setRevealedCards] = useState<number[]>([]);
    const [isShuffling, setIsShuffling] = useState(false);
    const [isViewingHistory, setIsViewingHistory] = useState(false);
    const [readingId, setReadingId] = useState<string | null>(null);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [hasSaved, setHasSaved] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [historyMissing, setHistoryMissing] = useState(false);
    const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
    const [reasoningEnabled, setReasoningEnabled] = useState(false);
    const [membershipType, setMembershipType] = useState<MembershipType>('free');
    const [userId, setUserId] = useState<string | null>(null);
    const [showAuthModal, setShowAuthModal] = useState(false);

    useEffect(() => {
        setQuestion(questionParam || '');
    }, [questionParam]);

    useEffect(() => {
        const loadMembership = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const currentUserId = session?.user?.id || null;
            setUserId(currentUserId);
            if (!currentUserId) {
                setMembershipType('free');
                return;
            }
            const memberInfo = await getMembershipInfo(currentUserId);
            if (memberInfo) {
                setMembershipType(memberInfo.type);
            }
        };
        loadMembership();
    }, []);

    // 处理历史记录加载
    useEffect(() => {
        const storedResult = sessionStorage.getItem('tarot_result');
        if (storedResult) {
            try {
                const parsed = JSON.parse(storedResult);
                if (parsed.cards) {
                    const storedSpread = parsed.spread as TarotSpread | undefined;
                    const fallbackSpreadId = parsed.spreadId as string | undefined;
                    const fallbackSpread = fallbackSpreadId
                        ? TAROT_SPREADS.find(s => s.id === fallbackSpreadId) || null
                        : null;
                    const resolvedSpread = storedSpread || fallbackSpread;
                    if (!resolvedSpread) {
                        throw new Error('Missing spread');
                    }
                    setSelectedSpread(resolvedSpread);
                    setDrawnCards(parsed.cards);
                    setQuestion(parsed.question || '');
                    setRevealedCards(parsed.cards.map((_: DrawnCard, i: number) => i));
                    setReadingId(parsed.readingId || null);
                    setConversationId(parsed.conversationId || null);
                    setHasSaved(true);
                    setIsViewingHistory(true);
                    setHistoryMissing(false);
                    setIsLoading(false);
                    sessionStorage.removeItem('tarot_result');
                    return;
                }
            } catch {
                sessionStorage.removeItem('tarot_result');
            }
        }

        if (!spreadId) {
            if (historyTimestamp) {
                setHistoryMissing(true);
                setIsLoading(false);
                return;
            }
            router.push('/tarot');
            return;
        }

        const drawCards = async () => {
            setIsLoading(true);
            setIsViewingHistory(false);
            setHasSaved(false);
            setReadingId(null);
            setRevealedCards([]);
            setInterpretation('');
            setInterpretationReasoning(null);

            try {
                const res = await fetch('/api/tarot', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'draw-only',
                        spreadId,
                        allowReversed: true,
                    }),
                });
                const data = await res.json();

                if (data.success && data.data?.cards) {
                    setSelectedSpread(data.data.spread);
                    setDrawnCards(data.data.cards);
                }
            } catch (error) {
                console.error('抽牌失败:', error);
            } finally {
                setIsLoading(false);
            }
        };

        drawCards();
    }, [historyTimestamp, router, spreadId]);

    const saveReading = async () => {
        if (hasSaved || isSaving || isViewingHistory || !selectedSpread || !drawnCards.length) return;
        setIsSaving(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                return;
            }

            const res = await fetch('/api/tarot', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    action: 'save',
                    spreadId: selectedSpread.id,
                    question: question || undefined,
                    cards: drawnCards,
                }),
            });
            const data = await res.json();
            if (data.success) {
                setReadingId(data.data?.readingId || null);
                setHasSaved(true);
            }
        } catch (error) {
            console.error('保存记录失败:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const revealCard = async (index: number) => {
        if (!revealedCards.includes(index)) {
            setRevealedCards(prev => [...prev, index]);
            void saveReading();
        }
    };

    const revealAll = () => {
        if (revealedCards.length < drawnCards.length) {
            setRevealedCards(drawnCards.map((_, i) => i));
            void saveReading();
        }
    };

    const handleInterpret = async () => {
        if (drawnCards.length === 0) return;

        setIsInterpreting(true);
        setInterpretationReasoning(null);
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
                    readingId: readingId || undefined,
                    modelId: selectedModel,
                    reasoning: reasoningEnabled,
                }),
            });

            const data = await res.json();
            if (data.success && data.data?.interpretation) {
                setInterpretation(data.data.interpretation);
                setInterpretationReasoning(data.data.reasoning || null);
                if (data.data.conversationId) {
                    setConversationId(data.data.conversationId);
                }
            } else {
                alert(data.error || '解读失败');
            }
        } catch (error) {
            console.error('AI 解读失败:', error);
        } finally {
            setIsInterpreting(false);
        }
    };

    useEffect(() => {
        if (interpretation) return;

        const loadAnalysis = async () => {
            let resolvedConversationId = conversationId;
            if (!resolvedConversationId && readingId) {
                const { data } = await supabase
                    .from('tarot_readings')
                    .select('conversation_id')
                    .eq('id', readingId)
                    .single();
                resolvedConversationId = data?.conversation_id || null;
                if (resolvedConversationId) {
                    setConversationId(resolvedConversationId);
                }
            }

            if (!resolvedConversationId) return;

            const { data, error } = await supabase
                .from('conversations')
                .select('messages, source_data')
                .eq('id', resolvedConversationId)
                .single();

            if (error || !data) return;

            const sourceData = (data.source_data || undefined) as Record<string, unknown> | undefined;
            const messages = (data.messages as ChatMessage[]) || [];
            const { analysis, reasoning, modelId } = extractAnalysisFromConversation(messages, sourceData);
            if (analysis) {
                setInterpretation(analysis);
            }
            if (reasoning) {
                setInterpretationReasoning(reasoning);
            }
            if (modelId) {
                setSelectedModel(modelId);
            }
            if (typeof sourceData?.reasoning === 'boolean') {
                setReasoningEnabled(sourceData.reasoning);
            }
        };

        void loadAnalysis();
    }, [conversationId, interpretation, readingId]);

    const handleReshuffle = async () => {
        if (!selectedSpread) return;
        setIsShuffling(true);
        setRevealedCards([]);
        setInterpretation('');
        setIsViewingHistory(false);
        setHasSaved(false);
        setReadingId(null);
        setConversationId(null);

        await new Promise(resolve => setTimeout(resolve, 500));

        try {
            const res = await fetch('/api/tarot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'draw-only',
                    spreadId: selectedSpread.id,
                    allowReversed: true,
                }),
            });
            const data = await res.json();

            if (data.success && data.data?.cards) {
                setDrawnCards(data.data.cards);
            }
        } catch (error) {
            console.error('重新抽牌失败:', error);
        } finally {
            setIsShuffling(false);
        }
    };

    if (isLoading) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-8 text-center animate-fade-in">
                <div className="text-5xl mb-4 animate-pulse">🃏</div>
                <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-4" />
                <p className="text-foreground-secondary">正在洗牌抽取...</p>
            </div>
        );
    }

    if (!selectedSpread) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-8 text-center">
                <p className="text-foreground-secondary">
                    {historyMissing ? '历史记录加载失败，请从历史列表重新进入' : '未找到牌阵信息'}
                </p>
                <button
                    onClick={() => router.push(historyMissing ? '/tarot/history' : '/tarot')}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-background-secondary hover:bg-background-tertiary transition-colors"
                >
                    返回
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in">
            {/* 返回按钮 */}
            <button
                onClick={() => router.push('/tarot')}
                className="flex items-center gap-2 text-foreground-secondary hover:text-foreground mb-4 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" />
                返回
            </button>

            {/* 问题显示 */}
            {question && (
                <div className="bg-accent/10 border border-accent/30 rounded-xl p-4 mb-4">
                    <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-accent flex-shrink-0" />
                        <span className="text-sm text-accent font-medium">所问之事</span>
                    </div>
                    <p className="text-foreground font-semibold mt-1">{question}</p>
                </div>
            )}

            {/* 顶部操作栏 */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="font-semibold">{selectedSpread?.name}</h1>
                    <p className="text-sm text-foreground-secondary">{selectedSpread?.description}</p>
                </div>
                <button
                    onClick={handleReshuffle}
                    disabled={isShuffling}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg bg-background-secondary hover:bg-background-tertiary transition-colors disabled:opacity-50"
                >
                    <RotateCcw className={`w-4 h-4 ${isShuffling ? 'animate-spin' : ''}`} />
                    {isShuffling ? '洗牌中...' : '重新抽牌'}
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
                                onClick={() => void revealCard(index)}
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
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <h2 className="font-semibold flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-accent" />
                            AI 深度解读
                        </h2>
                        <div className="flex items-center gap-2">
                            <ModelSelector
                                compact
                                selectedModel={selectedModel}
                                onModelChange={setSelectedModel}
                                reasoningEnabled={reasoningEnabled}
                                onReasoningChange={setReasoningEnabled}
                                userId={userId}
                                membershipType={membershipType}
                            />
                            {interpretation && (
                                <button
                                    data-testid="reanalyze-button"
                                    onClick={handleInterpret}
                                    disabled={isInterpreting}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background-secondary text-foreground-secondary hover:text-foreground hover:bg-background-tertiary text-sm disabled:opacity-50"
                                >
                                    {isInterpreting ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <RefreshCw className="w-4 h-4" />
                                    )}
                                    重新分析
                                </button>
                            )}
                        </div>
                    </div>

                    {interpretation ? (
                        <>
                            {interpretationReasoning && (
                                <ThinkingBlock content={interpretationReasoning} />
                            )}
                            <MarkdownContent
                                content={interpretation}
                                className="text-sm text-foreground-secondary"
                            />
                        </>
                    ) : !userId ? (
                        <div className="bg-gradient-to-r from-accent/5 to-purple-500/5 border border-accent/20 rounded-xl p-6 text-center">
                            <div className="flex justify-center mb-4">
                                <div className="p-3 rounded-full bg-accent/10">
                                    <Sparkles className="w-6 h-6 text-accent" />
                                </div>
                            </div>
                            <h3 className="text-lg font-semibold mb-2">AI 深度解读</h3>
                            <p className="text-foreground-secondary mb-6 max-w-sm mx-auto">
                                登录后解锁完整 AI 深度解读，获取更精准的个性化建议
                            </p>
                            <button
                                onClick={() => setShowAuthModal(true)}
                                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
                            >
                                登录 / 注册
                            </button>
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

            {/* 分享卡片 */}
            {revealedCards.length === drawnCards.length && selectedSpread && (
                <div className="mt-6">
                    <h2 className="font-semibold mb-3 flex items-center gap-2">
                        <Share2 className="w-4 h-4 text-accent" />
                        分享结果
                    </h2>
                    <TarotShareCard
                        cards={drawnCards}
                        spread={selectedSpread}
                        question={question || undefined}
                        interpretation={interpretation || undefined}
                    />
                </div>
            )}

            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
            />
        </div>
    );
}

export default function TarotResultPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" /></div>}>
            <TarotResultContent />
        </Suspense>
    );
}
