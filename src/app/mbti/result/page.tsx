/**
 * MBTI 测试结果页面
 * 
 * 支持两种模式：
 * 1. 测试结果模式（从测试完成跳转）- 显示维度分析、AI分析、重新测试
 * 2. 查看模式（直接访问）- 仅显示人格基本信息
 */
'use client'; // client component for sessionStorage and auth state.

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { RotateCw, Sparkles, RefreshCw } from 'lucide-react';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import { PersonalityCard } from '@/components/mbti/PersonalityCard';
import { buildViewResult, type TestResult } from '@/lib/divination/mbti';
import { supabase } from '@/lib/auth';
import { MarkdownContent } from '@/components/ui/MarkdownContent';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { DEFAULT_MODEL_ID } from '@/lib/ai/ai-config';
import { getMembershipInfo, type MembershipType } from '@/lib/user/membership';
import { ThinkingBlock } from '@/components/chat/ThinkingBlock';
import { AuthModal } from '@/components/auth/AuthModal';
import { AddToKnowledgeBaseModal } from '@/components/knowledge-base/AddToKnowledgeBaseModal';
import { readSessionJSON } from '@/lib/cache';
import { useHeaderMenu } from '@/components/layout/HeaderMenuContext';
import { CreditsModal } from '@/components/ui/CreditsModal';
import { useStreamingResponse, isCreditsError } from '@/lib/hooks/useStreamingResponse';
import { loadConversationAnalysisSnapshot } from '@/lib/chat/conversation-analysis';
import { resolveHistoryConversationId } from '@/lib/history/client';

function MBTIResultContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { setMenuItems, clearMenuItems } = useHeaderMenu();
    const viewType = searchParams.get('type');
    const isViewMode = searchParams.get('view') === 'true';

    // useState keeps client-only test result and AI analysis state.
    const [result, setResult] = useState<TestResult | null>(null);
    const [user, setUser] = useState<{ id: string } | null>(null);
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [analysisReasoning, setAnalysisReasoning] = useState<string | null>(null);
    const [loadingAI, setLoadingAI] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [checkingAuth, setCheckingAuth] = useState(true);
    const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
    const [reasoningEnabled, setReasoningEnabled] = useState(false);
    const errorBanner = error ? (
        <p data-testid="analysis-error" className="text-red-500 text-sm mb-4">{error}</p>
    ) : null;
    const [membershipType, setMembershipType] = useState<MembershipType>('free');
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [kbModalOpen, setKbModalOpen] = useState(false);
    const [showCreditsModal, setShowCreditsModal] = useState(false);
    // 使用共享的流式响应 hook
    const streaming = useStreamingResponse();

    useEffect(() => {
        // useEffect loads session/auth data after client mount.
        // 获取用户状态
        const checkAuth = async () => {
            try {
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
            } catch (err) {
                console.error('Auth check failed:', err);
                setUser(null);
                setMembershipType('free');
            } finally {
                setCheckingAuth(false);
            }
        };

        checkAuth();

        // 监听认证状态变化
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            const currentUser = session?.user ? { id: session.user.id } : null;
            setUser(currentUser);
            if (session?.user) {
                getMembershipInfo(session.user.id).then(info => {
                    if (info) {
                        setMembershipType(info.type);
                    }
                });
            } else {
                setMembershipType('free');
            }
        });

        // 从 sessionStorage 获取结果
        const stored = readSessionJSON<TestResult & { conversationId?: string | null }>('mbti_result');
        if (stored) {
            try {
                const parsed = stored;
                setResult(parsed);
                setConversationId(parsed.conversationId || null);
            } catch {
                if (!isViewMode) {
                    router.push('/mbti');
                }
            }
        } else if (isViewMode) {
            const viewResult = viewType ? buildViewResult(viewType.toUpperCase()) : null;
            if (viewResult) {
                setResult(viewResult);
            } else {
                router.push('/mbti');
            }
        } else {
            router.push('/mbti');
        }

        return () => subscription.unsubscribe();
    }, [router, isViewMode, viewType]);

    useEffect(() => {
        if (!result || aiAnalysis || !user) return;

        const loadAnalysis = async () => {
            let resolvedConversationId = conversationId;
            if (!resolvedConversationId) {
                const readingId = (result as unknown as { readingId?: string }).readingId;
                if (readingId) {
                    resolvedConversationId = await resolveHistoryConversationId('mbti', readingId, 'mbti_result');
                    if (resolvedConversationId) {
                        setConversationId(resolvedConversationId);
                    }
                }
            }

            if (!resolvedConversationId) return;

            const snapshot = await loadConversationAnalysisSnapshot(resolvedConversationId);
            if (!snapshot) return;

            if (snapshot.analysis) {
                setAiAnalysis(snapshot.analysis);
            }
            if (snapshot.reasoning) {
                setAnalysisReasoning(snapshot.reasoning);
            }
            if (snapshot.modelId) {
                setSelectedModel(snapshot.modelId);
            }
            setReasoningEnabled(snapshot.reasoningEnabled);
        };

        void loadAnalysis();
    }, [aiAnalysis, conversationId, result, user]);

    const handleGetAIAnalysis = async () => {
        if (!result || !user) return;

        setLoadingAI(true);
        streaming.reset();
        setError(null);
        setAnalysisReasoning(null);
        setAiAnalysis(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.access_token) {
                setError('请先登录');
                setLoadingAI(false);
                return;
            }

            const streamResult = await streaming.startStream('/api/mbti', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    action: 'analyze',
                    type: result.type,
                    scores: result.scores,
                    percentages: result.percentages,
                    readingId: (result as unknown as { readingId?: string }).readingId,
                    modelId: selectedModel,
                    reasoning: reasoningEnabled,
                    stream: true,
                }),
            });

            // 检测积分不足错误（使用返回值而非状态，避免异步问题）
            if (streamResult?.error && isCreditsError(streamResult.error)) {
                setShowCreditsModal(true);
                return;
            }

            if (streamResult?.error) {
                throw new Error(streamResult.error);
            }

            // 更新最终内容
            if (streamResult?.content) {
                setAiAnalysis(streamResult.content);
                if (streamResult.reasoning) {
                    setAnalysisReasoning(streamResult.reasoning);
                }
            } else {
                setAiAnalysis('分析失败，请重试');
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : '分析失败');
        } finally {
            setLoadingAI(false);
        }
    };

    // 从 result 中提取数据（在 early return 之前）
    const isTestMode = result ? (!isViewMode && result.scores && result.percentages) : false;
    const readingId = result ? (result as unknown as { readingId?: string }).readingId : undefined;

    // 设置移动端 Header 菜单项
    useEffect(() => {
        if (!result) return;
        const items = [];
        if (readingId) {
            items.push({
                id: 'add-to-kb',
                label: '加入知识库',
                onClick: () => setKbModalOpen(true),
            });
        }
        if (isTestMode) {
            items.push({
                id: 'retest',
                label: '重新测试',
                icon: <RotateCw className="w-4 h-4" />,
                onClick: () => router.push('/mbti'),
            });
        }
        setMenuItems(items);
        return () => clearMenuItems();
    }, [readingId, isTestMode, result, router, setMenuItems, clearMenuItems]);

    if (!result) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
                {/* Background Effects Removed */}
                <div className="relative z-10 text-center">
                    <SoundWaveLoader variant="block" text="正在加载测试结果" />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background relative overflow-x-hidden">
            {/* Background Effects */}
            {/* Background Effects Removed */}

            <div className="max-w-3xl mx-auto px-4 py-4 md:py-8 relative z-10">
                {/* 返回 - 仅桌面端显示 */}
                <Link
                    href="/mbti"
                    className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-white/5 transition-all mb-8"
                >
                    <span className="text-sm font-medium">返回 MBTI 首页</span>
                </Link>

                {/* 结果卡片 */}
                <PersonalityCard result={result} showDimensions={!!isTestMode} />

                {!!readingId && (
                    <div className="mt-4 flex justify-center">
                        <button
                            type="button"
                            onClick={() => setKbModalOpen(true)}
                            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-foreground transition-all"
                        >
                            加入知识库
                        </button>
                    </div>
                )}

                {/* AI 深度分析 - 仅测试模式显示 */}
                {isTestMode && (
                    <div className="mt-10 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-xl">
                        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
                            <h3 className="text-xl font-bold text-foreground flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10">
                                    <Sparkles className="w-5 h-5 text-blue-400" />
                                </div>
                                AI 深度分析
                            </h3>
                            <div className="flex items-center gap-3">
                                <ModelSelector
                                    compact
                                    selectedModel={selectedModel}
                                    onModelChange={setSelectedModel}
                                    reasoningEnabled={reasoningEnabled}
                                    onReasoningChange={setReasoningEnabled}
                                    userId={user?.id}
                                    membershipType={membershipType}
                                />
                                {aiAnalysis && (
                                    <button
                                        data-testid="reanalyze-button"
                                        onClick={handleGetAIAnalysis}
                                        disabled={loadingAI}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-foreground-secondary hover:text-foreground hover:bg-white/10 text-sm disabled:opacity-50 transition-all"
                                    >
                                        {loadingAI ? (
                                            <SoundWaveLoader variant="inline" />
                                        ) : (
                                            <RefreshCw className="w-4 h-4" />
                                        )}
                                        重新分析
                                    </button>
                                )}
                            </div>
                        </div>

                        {aiAnalysis ? (
                            <div>
                                {errorBanner}
                                <div className="prose prose-sm dark:prose-invert max-w-none">
                                    {analysisReasoning && (
                                        <ThinkingBlock
                                            content={analysisReasoning}
                                            isStreaming={streaming.isStreaming && !aiAnalysis}
                                            startTime={streaming.reasoningStartTime}
                                            duration={streaming.reasoningDuration}
                                        />
                                    )}
                                    <MarkdownContent content={aiAnalysis} />
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                {errorBanner}

                                {checkingAuth ? (
                                    <SoundWaveLoader variant="block" />
                                ) : !user ? (
                                    <div className="bg-gradient-to-br from-blue-500/10 via-purple-500/5 to-pink-500/10 border border-white/10 rounded-2xl p-8 text-center max-w-md mx-auto backdrop-blur-sm">
                                        <div className="flex justify-center mb-6">
                                            <div className="p-4 rounded-full bg-white/5 ring-1 ring-white/10 shadow-[0_0_20px_rgba(59,130,246,0.2)]">
                                                <Sparkles className="w-8 h-8 text-blue-300" />
                                            </div>
                                        </div>
                                        <h3 className="text-xl font-bold text-white mb-3">解锁 AI 深度解读</h3>
                                        <p className="text-foreground-secondary mb-8 leading-relaxed">
                                            登录后即可获取基于您性格维度的<br />专属 AI 深度分析与职场建议
                                        </p>
                                        <button
                                            onClick={() => setShowAuthModal(true)}
                                            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold hover:shadow-lg hover:shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-95"
                                        >
                                            立即登录 / 注册
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleGetAIAnalysis}
                                        disabled={loadingAI}
                                        className="group relative overflow-hidden inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-all hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 disabled:shadow-none"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none" />
                                        {loadingAI ? (
                                            <>
                                                <SoundWaveLoader variant="inline" />
                                                正在分析中...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-5 h-5" />
                                                获取 AI 深度分析
                                                <span className="text-xs font-normal opacity-80 bg-black/20 px-2 py-0.5 rounded-full ml-1">消耗 1 次</span>
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* 操作按钮 - 仅测试模式显示 */}
                {isTestMode && (
                    <div className="flex justify-center gap-4 mt-12 pb-10">
                        <Link
                            href="/mbti"
                            className="inline-flex items-center gap-2 px-8 py-4 
                                bg-white/5 text-foreground rounded-2xl border border-white/10
                                hover:bg-white/10 hover:border-white/20 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 font-medium"
                        >
                            <RotateCw className="w-5 h-5" />
                            重新测试
                        </Link>
                    </div>
                )}

                {/* 查看模式：显示开始测试按钮 */}
                {!isTestMode && (
                    <div className="text-center mt-12 pb-10">
                        <Link
                            href="/mbti"
                            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold
                                hover:from-blue-500 hover:to-indigo-500 hover:shadow-lg hover:-translate-y-0.5 transition-all shadow-blue-500/20"
                        >
                            <Sparkles className="w-5 h-5" />
                            开始 MBTI 测试
                        </Link>
                    </div>
                )}
            </div>

            <AuthModal
                isOpen={showAuthModal}
                onClose={() => setShowAuthModal(false)}
            />

            <CreditsModal
                isOpen={showCreditsModal}
                onClose={() => setShowCreditsModal(false)}
            />

            {readingId && (
                <AddToKnowledgeBaseModal
                    open={kbModalOpen}
                    onClose={() => setKbModalOpen(false)}
                    sourceTitle={`MBTI - ${result.type}`}
                    sourceType="mbti_reading"
                    sourceId={readingId}
                />
            )}
        </div>
    );
}

// 主导出组件，使用 Suspense 包裹
export default function MBTIResultPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
                {/* Background Effects Removed */}
                <SoundWaveLoader variant="block" />
            </div>
        }>
            <MBTIResultContent />
        </Suspense>
    );
}
