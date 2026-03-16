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
    Send,
    BookOpenText,
} from 'lucide-react';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import Image from 'next/image';
import { TAROT_SPREADS, type DrawnCard, type TarotSpread } from '@/lib/divination/tarot';
import { readSessionJSON, updateSessionJSON } from '@/lib/cache';
import { supabase } from '@/lib/supabase';
import { MarkdownContent } from '@/components/ui/MarkdownContent';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { DEFAULT_MODEL_ID } from '@/lib/ai/ai-config';
import { getMembershipInfo, type MembershipType } from '@/lib/user/membership';
import { ThinkingBlock } from '@/components/chat/ThinkingBlock';
import { extractAnalysisFromConversation } from '@/lib/ai/ai-analysis-query';
import type { ChatMessage } from '@/types';
import { AuthModal } from '@/components/auth/AuthModal';
import { AddToKnowledgeBaseModal } from '@/components/knowledge-base/AddToKnowledgeBaseModal';
import { useHeaderMenu } from '@/components/layout/HeaderMenuContext';
import { useToast } from '@/components/ui/Toast';
import { CreditsModal } from '@/components/ui/CreditsModal';
import { useStreamingResponse, isCreditsError } from '@/lib/hooks/useStreamingResponse';

function TarotResultContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { setMenuItems, clearMenuItems } = useHeaderMenu();
    const { showToast } = useToast();
    const historyTimestamp = searchParams.get('t');
    const spreadId = searchParams.get('spreadId');
    const questionParam = searchParams.get('question');

    const [selectedSpread, setSelectedSpread] = useState<TarotSpread | null>(null);
    const [drawnCards, setDrawnCards] = useState<DrawnCard[]>([]);
    const [question, setQuestion] = useState(questionParam || '');
    const [interpretation, setInterpretation] = useState('');
    const [interpretationReasoning, setInterpretationReasoning] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isInterpreting, setIsInterpreting] = useState(false);
    const [revealedCards, setRevealedCards] = useState<number[]>([]);
    const [flippedToInterpretation, setFlippedToInterpretation] = useState<number[]>([]);
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
    const [kbModalOpen, setKbModalOpen] = useState(false);
    const [showCreditsModal, setShowCreditsModal] = useState(false);
    // 使用共享的流式响应 hook
    const streaming = useStreamingResponse();

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

    // 处理新抽牌
    useEffect(() => {
        // 只有在有 spreadId 时才执行新抽牌
        if (!spreadId) return;

        const drawCards = async () => {
            setIsLoading(true);
            setIsViewingHistory(false);
            setHasSaved(false);
            setReadingId(null);
            setConversationId(null);
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
    }, [spreadId]);

    type TarotSession = {
        spread?: TarotSpread;
        spreadId?: string;
        cards?: DrawnCard[];
        question?: string;
        readingId?: string | null;
        conversationId?: string | null;
        createdAt?: string;
    };

    // 处理历史记录加载
    useEffect(() => {
        // 如果有 spreadId，说明是新占卜，跳过加载历史
        if (spreadId) return;

        const parsed = readSessionJSON<TarotSession>('tarot_result');
        if (parsed) {
            try {
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
                    // 只有当 storage 中有 question 时才覆盖 (防止 null 覆盖空字符串)
                    if (parsed.question !== undefined) {
                        setQuestion(parsed.question);
                    }
                    setRevealedCards(parsed.cards.map((_: DrawnCard, i: number) => i));
                    setReadingId(parsed.readingId || null);
                    setConversationId(parsed.conversationId || null);
                    setHasSaved(true);
                    setIsViewingHistory(true);
                    setHistoryMissing(false);
                    setIsLoading(false);
                    // 不再移除 storage，以便页面刷新后能保持状态
                    // sessionStorage.removeItem('tarot_result');
                    return;
                }
            } catch {
                // 解析失败也不清除，避免丢失数据，让用户可以手动刷新
                console.error('Failed to parse tarot history');
            }
        }

        // 没有 spreadId 且没有有效的 sessionStorage 数据
        if (historyTimestamp) {
            setHistoryMissing(true);
            setIsLoading(false);
            return;
        }
        router.push('/tarot');
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
                updateSessionJSON('tarot_result', (prev) => ({
                    ...(prev || {}),
                    readingId: data.data?.readingId || null,
                }));
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
        streaming.reset();
        setInterpretationReasoning(null);
        setInterpretation('');

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                showToast('warning', '请先登录');
                setIsInterpreting(false);
                return;
            }

            const result = await streaming.startStream('/api/tarot', {
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
                    stream: true,
                }),
            });

            // 检测积分不足错误（使用返回值而非状态，避免异步问题）
            if (result?.error && isCreditsError(result.error)) {
                setShowCreditsModal(true);
            } else if (result?.error) {
                showToast('error', result.error);
            }

            // 更新最终内容
            if (result?.content) {
                setInterpretation(result.content);
                if (result.reasoning) {
                    setInterpretationReasoning(result.reasoning);
                }
            } else if (!result?.error) {
                setInterpretation('解读失败，请重试');
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

    // 设置移动端 Header 菜单项
    useEffect(() => {
        const items = [];
        if (readingId) {
            items.push({
                id: 'add-to-kb',
                label: '加入知识库',
                icon: <BookOpenText className="w-4 h-4" />,
                onClick: () => setKbModalOpen(true),
            });
        }
        items.push({
            id: 'reshuffle',
            label: isShuffling ? '洗牌中...' : '重新抽牌',
            icon: <RotateCcw className={`w-4 h-4 ${isShuffling ? 'animate-spin' : ''}`} />,
            onClick: handleReshuffle,
            disabled: isShuffling,
        });
        setMenuItems(items);
        return () => clearMenuItems();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [readingId, isShuffling, selectedSpread, setMenuItems, clearMenuItems]);

    if (isLoading) {
        return (
            <div className="max-w-2xl mx-auto px-4 py-8 text-center animate-fade-in">
                <div className="text-5xl mb-4 animate-pulse">🃏</div>
                <SoundWaveLoader variant="inline" />
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
        <div className="bg-background relative overflow-x-hidden">
            {/* Background Effects */}
            {/* Background Effects Removed */}

            <div className="max-w-3xl mx-auto px-4 py-4 md:py-8 relative z-10 animate-fade-in">
                {/* Header Navigation - 仅桌面端显示 */}
                <div className="hidden md:flex items-center justify-between mb-8">
                    <button
                        onClick={() => router.push('/tarot')}
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-white/5 transition-all"
                    >
                        <span className="text-sm font-medium">返回占卜</span>
                    </button>

                    <div className="flex items-center gap-2">
                        {!!readingId && (
                            <button
                                onClick={() => setKbModalOpen(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
                            >
                                <BookOpenText className="w-4 h-4" />
                                加入知识库
                            </button>
                        )}
                        <button
                            onClick={handleReshuffle}
                            disabled={isShuffling}
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all disabled:opacity-50"
                        >
                            <RotateCcw className={`w-4 h-4 ${isShuffling ? 'animate-spin' : ''}`} />
                            {isShuffling ? '洗牌中...' : '重新抽牌'}
                        </button>
                    </div>
                </div>

                {/* Card Table */}
                <div className="relative py-2 bg-white/[0.02] border border-white/5 rounded-[2rem] backdrop-blur-sm">
                    <div className={`grid gap-8 mb-8 px-4 justify-items-center relative z-10 ${drawnCards.length === 1 ? 'grid-cols-1' :
                        drawnCards.length <= 3 ? 'grid-cols-3' :
                            drawnCards.length <= 4 ? 'grid-cols-2 sm:grid-cols-4' :
                                'grid-cols-2 sm:grid-cols-5'
                        }`}>
                        {drawnCards.map((card, index) => {
                            const isRevealed = revealedCards.includes(index);
                            const isFlippedToInterpretation = flippedToInterpretation.includes(index);
                            return (
                                <div key={index} className="flex flex-col items-center group" style={{ perspective: '1000px' }}>
                                    <div className="text-xs font-bold text-foreground-secondary/70 uppercase tracking-widest mb-3">
                                        {selectedSpread?.positions[index]?.name}
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (!isRevealed) {
                                                void revealCard(index);
                                            } else {
                                                // 已揭示的卡片，点击翻转查看解读
                                                setFlippedToInterpretation(prev =>
                                                    prev.includes(index)
                                                        ? prev.filter(i => i !== index)
                                                        : [...prev, index]
                                                );
                                            }
                                        }}
                                        className={`relative w-28 h-48 sm:w-32 sm:h-52 rounded-xl transition-all duration-500 ${!isRevealed ? 'cursor-pointer hover:-translate-y-2 hover:shadow-[0_10px_30px_rgba(168,85,247,0.2)]' : 'cursor-pointer hover:shadow-[0_5px_20px_rgba(168,85,247,0.15)]'}`}
                                        style={{
                                            transformStyle: 'preserve-3d',
                                            transform: isFlippedToInterpretation ? 'rotateY(180deg)' : undefined,
                                        }}
                                    >
                                        {/* 卡片正面 - 牌面 */}
                                        <div
                                            className={`absolute inset-0 w-full h-full rounded-xl overflow-hidden shadow-2xl transition-all duration-500 ${isRevealed ? 'opacity-100' : 'bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-950 border border-white/10'}`}
                                            style={{ backfaceVisibility: 'hidden' }}
                                        >
                                            {isRevealed ? (
                                                <>
                                                    <Image
                                                        src={card.card.image}
                                                        alt={card.card.nameChinese}
                                                        fill
                                                        className={`object-cover ${card.orientation === 'reversed' ? 'rotate-180' : ''}`}
                                                    />
                                                    {/* 点击提示 */}
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-3">
                                                        <span className="text-xs text-white/90 font-medium flex items-center gap-1">
                                                            <RotateCcw className="w-3 h-3" />
                                                            点击查看解读
                                                        </span>
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center opacity-30 bg-[url('/noise.png')]">
                                                    <div className="w-16 h-16 rounded-full border-2 border-white/20 flex items-center justify-center">
                                                        <Sparkles className="w-8 h-8 text-white/40" />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* 卡片背面 - 解读 */}
                                        <div
                                            className="absolute inset-0 w-full h-full rounded-xl overflow-hidden shadow-2xl bg-gradient-to-br from-purple-900/90 via-indigo-900/90 to-purple-950/90 border border-purple-500/20 p-3 flex flex-col"
                                            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                                        >
                                            <div className="text-center mb-2">
                                                <h4 className="text-sm font-bold text-white truncate">{card.card.nameChinese}</h4>
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${card.orientation === 'reversed' ? 'text-rose-300 bg-rose-500/20' : 'text-emerald-300 bg-emerald-500/20'}`}>
                                                    {card.orientation === 'reversed' ? '逆位' : '正位'}
                                                </span>
                                            </div>
                                            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
                                                <p className="text-[10px] sm:text-xs text-white/80 leading-relaxed">
                                                    {(() => {
                                                        const meaning = card.orientation === 'reversed' ? card.card.reversedMeaning : card.card.uprightMeaning;
                                                        // 移除开头的"卡片名+正位/逆位："格式
                                                        return meaning.replace(/^[^:：]+[：:]\s*/, '');
                                                    })()}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap gap-1 mt-2 justify-center">
                                                {card.card.keywords.slice(0, 3).map((kw, i) => (
                                                    <span key={i} className="text-[8px] px-1.5 py-0.5 rounded bg-white/10 text-white/70">
                                                        {kw}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </button>

                                    <div className={`mt-4 text-center transition-opacity duration-500 ${isRevealed ? 'opacity-100' : 'opacity-0'}`}>
                                        <h4 className="font-bold text-foreground">{card.card.nameChinese}</h4>
                                        <span className={`text-xs px-2 py-0.5 rounded-full border ${card.orientation === 'reversed'
                                            ? 'text-rose-400 border-rose-400/20 bg-rose-400/5'
                                            : 'text-emerald-400 border-emerald-400/20 bg-emerald-400/5'
                                            }`}>
                                            {card.orientation === 'reversed' ? '逆位' : '正位'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Reveal Button */}
                    {revealedCards.length < drawnCards.length && (
                        <div className="flex justify-center mt-8">
                            <button
                                onClick={revealAll}
                                className="inline-flex items-center gap-2 px-8 py-3 rounded-xl font-bold shadow-lg shadow-purple-600/10 transition-all hover:scale-[1.02] active:scale-95"
                            >
                                翻开所有牌面
                            </button>
                        </div>
                    )}

                    {/* 翻转提示 */}
                    {revealedCards.length > 0 && revealedCards.length === drawnCards.length && (
                        <div className="text-center mt-4 pb-4 animate-fade-in">
                            <p className="text-xs text-foreground-secondary/60 flex items-center justify-center gap-2">
                                <RotateCcw className="w-3.5 h-3.5" />
                                点击卡片可翻转查看牌面解读
                            </p>
                        </div>
                    )}
                </div>

                {/* Interpretation Section */}
                {revealedCards.length === drawnCards.length && (
                    <div className="space-y-6 animate-fade-in-up">
                        {/* AI Deep Dive */}
                        <div className="relative rounded-3xl p-1 group">
                            {/* Background Effects Removed */}

                            <div className="relative bg-background/80 rounded-[20px] p-2 md:p-6">
                                <div className="flex flex-wrap items-center justify-between gap-4 mb-6 relative z-20">
                                    <div>
                                        <h2 className="text-base font-bold flex items-center gap-3">
                                            AI 深度洞察
                                        </h2>
                                        {/* <p className="text-sm text-foreground-secondary mt-1">
                                            基于 {selectedSpread?.name} 的全方位综合解读
                                        </p> */}
                                    </div>
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
                                                onClick={handleInterpret}
                                                disabled={isInterpreting}
                                                data-testid="reanalyze-button"
                                                className="p-2 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-white/10 transition-colors"
                                            >
                                                <RefreshCw className={`w-4 h-4 ${isInterpreting ? 'animate-spin' : ''}`} />
                                            </button>
                                        )}
                                    </div>
                                </div>


                                {interpretation ? (
                                    <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground-secondary prose-strong:text-purple-300 relative z-10">
                                        {interpretationReasoning && (
                                            <ThinkingBlock
                                                content={interpretationReasoning}
                                                isStreaming={streaming.isStreaming && !interpretation}
                                                startTime={streaming.reasoningStartTime}
                                                duration={streaming.reasoningDuration}
                                            />
                                        )}
                                        <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                                            <MarkdownContent content={interpretation} />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center sm:py-8 py-2">
                                        {!userId ? (
                                            <div className="max-w-sm mx-auto">
                                                <Send className="w-12 h-12 text-purple-500/30 mx-auto mb-4" />
                                                <button
                                                    onClick={() => setShowAuthModal(true)}
                                                    className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-lg shadow-purple-600/20 transition-all"
                                                >
                                                    登录解锁 AI 深度解读
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="max-w-sm mx-auto">
                                                <button
                                                    onClick={handleInterpret}
                                                    disabled={isInterpreting}
                                                    className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2"
                                                >
                                                    {isInterpreting ? (
                                                        <>
                                                            <SoundWaveLoader variant="inline" />
                                                            正在连接宇宙能量...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Send className="w-5 h-5" />
                                                            获取 AI 深度指引
                                                        </>
                                                    )}
                                                </button>
                                                <p className="text-xs text-foreground-secondary mt-3">
                                                    AI 将综合牌阵位置、正逆位关系为您提供专业解读
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Share Card - 暂时隐藏 */}
                        {/* <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8">
                            <h2 className="text-lg font-bold flex items-center gap-3 mb-6">
                                <Share2 className="w-5 h-5 text-purple-400" />
                                珍藏与分享
                            </h2>
                            <TarotShareCard
                                cards={drawnCards}
                                spread={selectedSpread}
                                question={question || undefined}
                                interpretation={interpretation || undefined}
                            />
                        </div> */}
                    </div >
                )
                }

                {readingId && (
                    <AddToKnowledgeBaseModal
                        open={kbModalOpen}
                        onClose={() => setKbModalOpen(false)}
                        sourceTitle={question || selectedSpread?.name || '塔罗占卜'}
                        sourceType="tarot_reading"
                        sourceId={readingId}
                    />
                )}

                <AuthModal
                    isOpen={showAuthModal}
                    onClose={() => setShowAuthModal(false)}
                />

                <CreditsModal
                    isOpen={showCreditsModal}
                    onClose={() => setShowCreditsModal(false)}
                />
            </div >
        </div >
    );
}

export default function TarotResultPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full" /></div>}>
            <TarotResultContent />
        </Suspense>
    );
}
