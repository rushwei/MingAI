/**
 * 六爻解卦结果页面
 *
 * 显示卦象和 AI 解读，包含传统六爻分析
 */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles, RotateCw, AlertCircle, Loader2, BookOpen, RefreshCw } from 'lucide-react';
import { HexagramDisplay } from '@/components/liuyao/HexagramDisplay';
import { TraditionalAnalysis } from '@/components/liuyao/TraditionalAnalysis';
import { MarkdownContent } from '@/components/ui/MarkdownContent';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { ThinkingBlock } from '@/components/chat/ThinkingBlock';
import {
    type DivinationResult,
    type Hexagram,
    type Yao,
    type LiuYaoFullAnalysis,
    performFullAnalysis,
    yaosTpCode,
} from '@/lib/liuyao';
import { getHexagramText } from '@/lib/hexagram-texts';
import { supabase } from '@/lib/supabase';
import { DEFAULT_MODEL_ID } from '@/lib/ai-config';
import { getMembershipInfo, type MembershipType } from '@/lib/membership';
import { extractAnalysisFromConversation } from '@/lib/ai-analysis-query';
import type { ChatMessage } from '@/types';
import { AuthModal } from '@/components/auth/AuthModal';
import { AddToKnowledgeBaseModal } from '@/components/knowledge-base/AddToKnowledgeBaseModal';

export default function ResultPage() {
    const router = useRouter();
    const [result, setResult] = useState<DivinationResult | null>(null);
    const [divinationId, setDivinationId] = useState<string | null>(null); // 保存的起卦记录 ID
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [interpretation, setInterpretation] = useState<string | null>(null);
    const [interpretationReasoning, setInterpretationReasoning] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [user, setUser] = useState<{ id: string } | null | undefined>(undefined); // undefined = loading
    const [showTraditional, setShowTraditional] = useState(true);
    const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
    const [reasoningEnabled, setReasoningEnabled] = useState(false);
    const [membershipType, setMembershipType] = useState<MembershipType>('free');
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [kbModalOpen, setKbModalOpen] = useState(false);
    const errorBanner = error ? (
        <div data-testid="analysis-error" className="flex items-center justify-center gap-2 text-red-500 mb-4">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
        </div>
    ) : null;

    // 计算传统分析数据（使用起卦日期执行完整分析）
    const traditionalData = useMemo((): (LiuYaoFullAnalysis & {
        hexagramText?: ReturnType<typeof getHexagramText>;
        changedHexagramText?: ReturnType<typeof getHexagramText>;
        dayStem: string;
    }) | null => {
        if (!result) return null;

        // 计算卦码
        const hexagramCode = yaosTpCode(result.yaos);
        const changedCode = result.changedHexagram
            ? yaosTpCode(result.yaos.map(y => ({
                ...y,
                type: y.change === 'changing' ? (y.type === 1 ? 0 : 1) as 0 | 1 : y.type,
            })))
            : undefined;

        // 执行完整分析
        const analysis = performFullAnalysis(
            result.yaos,
            hexagramCode,
            changedCode,
            result.question,
            result.createdAt
        );

        // 获取卦辞
        const hexagramText = getHexagramText(result.hexagram.name);
        const changedHexagramText = result.changedHexagram
            ? getHexagramText(result.changedHexagram.name)
            : undefined;

        return {
            ...analysis,
            hexagramText,
            changedHexagramText,
            dayStem: analysis.ganZhiTime.day.gan, // 返回日干供显示
        };
    }, [result]);

    useEffect(() => {
        // 获取用户状态
        const loadSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const currentUser = session?.user ? { id: session.user.id } : null;
            setUser(currentUser);
            if (session?.user) {
                const info = await getMembershipInfo(session.user.id);
                if (info) {
                    setMembershipType(info.type);
                }
            } else {
                setMembershipType('free');
            }
        };
        loadSession();

        // 监听认证状态变化
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            const currentUser = session?.user ? { id: session.user.id } : null;
            setUser(currentUser);
            if (session?.user) {
                const info = await getMembershipInfo(session.user.id);
                if (info) {
                    setMembershipType(info.type);
                }
            } else {
                setMembershipType('free');
            }
        });

        // 从 sessionStorage 获取结果
        const storedResult = sessionStorage.getItem('liuyao_result');
        if (storedResult) {
            try {
                const parsed = JSON.parse(storedResult);
                setResult({
                    question: parsed.question,
                    yaos: parsed.yaos as Yao[],
                    hexagram: parsed.hexagram as Hexagram,
                    changedHexagram: parsed.changedHexagram as Hexagram | undefined,
                    changedLines: parsed.changedLines as number[],
                    createdAt: new Date(parsed.createdAt),
                });
                // 恢复 divinationId（用于 AI 解读时更新正确的记录）
                setDivinationId(parsed.divinationId || null);
                setConversationId(parsed.conversationId || null);
            } catch {
                router.push('/liuyao');
            }
        } else {
            router.push('/liuyao');
        }

        return () => subscription.unsubscribe();
    }, [router]);

    useEffect(() => {
        if (!result || interpretation) return;

        const persistConversationId = (id: string | null) => {
            if (!id) return;
            const stored = sessionStorage.getItem('liuyao_result');
            if (!stored) return;
            try {
                const parsed = JSON.parse(stored);
                parsed.conversationId = id;
                sessionStorage.setItem('liuyao_result', JSON.stringify(parsed));
            } catch {
                // ignore
            }
        };

        const loadAnalysis = async () => {
            let resolvedConversationId = conversationId;
            if (!resolvedConversationId && divinationId) {
                const { data } = await supabase
                    .from('liuyao_divinations')
                    .select('conversation_id')
                    .eq('id', divinationId)
                    .single();
                resolvedConversationId = data?.conversation_id || null;
                if (resolvedConversationId) {
                    setConversationId(resolvedConversationId);
                    persistConversationId(resolvedConversationId);
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
    }, [conversationId, divinationId, interpretation, result]);

    const handleGetInterpretation = async () => {
        if (!result || !user || !traditionalData) return;

        setIsLoading(true);
        setError(null);
        setInterpretationReasoning(null);

        try {
            const response = await fetch('/api/liuyao', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                },
                body: JSON.stringify({
                    action: 'interpret',
                    question: result.question,
                    hexagram: result.hexagram,
                    changedHexagram: result.changedHexagram,
                    changedLines: result.changedLines,
                    yaos: result.yaos,
                    dayStem: traditionalData.dayStem, // 传递起卦日干，确保 AI 分析与 UI 一致
                    divinationId: divinationId, // 使用 state 中的 divinationId
                    modelId: selectedModel,
                    reasoning: reasoningEnabled,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '解读失败');
            }

            setInterpretation(data.data.interpretation);
            setInterpretationReasoning(data.data.reasoning || null);
            if (data.data.conversationId) {
                setConversationId(data.data.conversationId);
                const stored = sessionStorage.getItem('liuyao_result');
                if (stored) {
                    try {
                        const parsed = JSON.parse(stored);
                        parsed.conversationId = data.data.conversationId;
                        sessionStorage.setItem('liuyao_result', JSON.stringify(parsed));
                    } catch {
                        // ignore
                    }
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '解读失败');
        } finally {
            setIsLoading(false);
        }
    };

    if (!result) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
                {/* Background Effects Removed */}

                <div className="text-center relative z-10 animate-fade-in">
                    <div className="inline-flex relative mb-6">
                        <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full animate-pulse" />
                        <Loader2 className="w-12 h-12 animate-spin text-accent relative z-10" />
                    </div>
                    <p className="text-foreground-secondary text-lg">正在推演卦象...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-20 relative overflow-x-hidden">
            {/* Background Effects */}
            {/* Background Effects Removed */}

            <div className="max-w-3xl mx-auto px-4 py-8 relative z-10 animate-fade-in">
                {/* Header Navigation */}
                <div className="flex items-center justify-between mb-8">
                    <Link
                        href="/liuyao"
                        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-white/5 transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="text-sm font-medium">返回</span>
                    </Link>

                    <div className="flex items-center gap-2">
                        {!!divinationId && (
                            <button
                                type="button"
                                onClick={() => setKbModalOpen(true)}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all border bg-white/5 border-white/10 text-foreground-secondary hover:bg-white/10"
                            >
                                加入知识库
                            </button>
                        )}
                        <button
                            onClick={() => setShowTraditional(!showTraditional)}
                            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all border ${showTraditional
                                ? 'bg-accent/10 border-accent/20 text-accent'
                                : 'bg-white/5 border-white/10 text-foreground-secondary hover:bg-white/10'
                                }`}
                        >
                            <BookOpen className="w-4 h-4" />
                            传统分析
                        </button>
                    </div>
                </div>

                {/* Question Section */}
                {result.question && (
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-purple-500/10 text-purple-400 mb-4 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                            <Sparkles className="w-6 h-6" />
                        </div>
                        <h1 className="text-2xl font-bold text-foreground mb-6">六爻神课</h1>

                        <div className="inline-block max-w-[90%] bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl px-6 py-4 shadow-lg">
                            <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider mb-2">所问之事</h3>
                            <p className="text-foreground font-medium text-lg leading-relaxed">{result.question}</p>
                        </div>
                    </div>
                )}

                {/* Hexagram Display */}
                <div className="bg-white/[0.02] border border-white/5 rounded-2xl md:rounded-[2rem] backdrop-blur-sm p-12 md:p-16 mb-10 shadow-xl w-fit mx-auto">
                    <HexagramDisplay
                        yaos={result.yaos}
                        hexagram={result.hexagram}
                        changedHexagram={result.changedHexagram}
                        changedLines={result.changedLines}
                        showDetails={true}
                        fullYaos={traditionalData?.fullYaos}
                        showTraditional={showTraditional}
                        yongShenPosition={traditionalData?.yongShen.position}
                    />
                </div>

                {/* Traditional Analysis */}
                {showTraditional && traditionalData && (
                    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-1 md:p-8 mb-10 animate-fade-in-up">
                        <div className="flex items-center gap-3 mb-6">
                            <span className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                                <BookOpen className="w-5 h-5" />
                            </span>
                            <h3 className="text-xl font-bold text-foreground">传统六爻分析</h3>
                        </div>
                        <TraditionalAnalysis
                            fullYaos={traditionalData.fullYaos}
                            yongShen={traditionalData.yongShen}
                            timeRecommendations={traditionalData.timeRecommendations}
                            hexagramText={traditionalData.hexagramText}
                            changedHexagramText={traditionalData.changedHexagramText}
                            changedLines={result.changedLines}
                            ganZhiTime={traditionalData.ganZhiTime}
                            kongWang={traditionalData.kongWang}
                            fuShen={traditionalData.fuShen}
                            shenSystem={traditionalData.shenSystem}
                            summary={traditionalData.summary}
                        />
                    </div>
                )}

                {/* AI Interpretation */}
                <div className="relative rounded-3xl p-1 group">
                    {/* Gradient Background Removed */}

                    <div className="relative bg-background/80 backdrop-blur-xl rounded-[20px] p-6 md:p-8">
                        <div className="flex flex-wrap items-center justify-between gap-4 mb-6 relative z-20">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-3">
                                    <span className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
                                        <Sparkles className="w-5 h-5" />
                                    </span>
                                    AI 深度解卦
                                </h2>
                            </div>
                            <div className="flex items-center gap-2">
                                <ModelSelector
                                    compact
                                    selectedModel={selectedModel}
                                    onModelChange={setSelectedModel}
                                    reasoningEnabled={reasoningEnabled}
                                    onReasoningChange={setReasoningEnabled}
                                    userId={user?.id}
                                    membershipType={membershipType}
                                />
                                {interpretation && (
                                    <button
                                        data-testid="reanalyze-button"
                                        onClick={handleGetInterpretation}
                                        disabled={isLoading}
                                        className="p-2 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-white/10 transition-colors"
                                        title="重新分析"
                                    >
                                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {interpretation ? (
                            <div className="relative z-10">
                                {errorBanner}
                                <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground-secondary prose-strong:text-purple-300">
                                    {interpretationReasoning && (
                                        <ThinkingBlock content={interpretationReasoning} />
                                    )}
                                    <MarkdownContent content={interpretation} className="text-sm text-foreground" />
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-8 relative z-10">
                                {errorBanner}

                                {user === null ? (
                                    <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/5 rounded-2xl p-8 text-center max-w-sm mx-auto backdrop-blur-sm">
                                        <div className="flex justify-center mb-4">
                                            <div className="p-4 rounded-full bg-purple-500/10 ring-1 ring-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                                                <Sparkles className="w-8 h-8 text-purple-400" />
                                            </div>
                                        </div>
                                        <h3 className="text-xl font-bold mb-3 text-foreground">AI 深度分析</h3>
                                        <p className="text-foreground-secondary mb-8 text-sm leading-relaxed">
                                            登录后解锁完整 AI 深度解读<br />获取更精准的个性化建议
                                        </p>
                                        <button
                                            onClick={() => setShowAuthModal(true)}
                                            className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-600/20 transition-all hover:scale-[1.02] active:scale-95"
                                        >
                                            立即登录 / 注册
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleGetInterpretation}
                                        disabled={isLoading}
                                        className="inline-flex items-center gap-2 px-8 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-lg shadow-purple-600/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                正在解读天机...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-5 h-5" />
                                                获取 AI 深度解读
                                                <span className="ml-2 text-xs font-normal opacity-80">(消耗 1 次对话)</span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Reshuffle Button */}
                <div className="text-center mt-12 pb-8">
                    <Link
                        href="/liuyao"
                        className="inline-flex items-center gap-2 px-6 py-3 
                            text-foreground-secondary hover:text-foreground
                            bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10
                            rounded-xl transition-all hover:scale-105"
                    >
                        <RotateCw className="w-4 h-4" />
                        <span className="font-medium">重新起卦</span>
                    </Link>
                </div>
            </div>

            {divinationId && (
                <AddToKnowledgeBaseModal
                    open={kbModalOpen}
                    onClose={() => setKbModalOpen(false)}
                    sourceTitle={result.question || '六爻占卜'}
                    sourceType="liuyao_divination"
                    sourceId={divinationId}
                />
            )}

            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
            />
        </div>
    );
}
