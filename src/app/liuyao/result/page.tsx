/**
 * 六爻解卦结果页面
 *
 * 显示卦象和 AI 解读，包含传统六爻分析
 */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, RotateCw, AlertCircle, BookOpen, RefreshCw, Copy, Check, BookOpenText, X, Album } from 'lucide-react';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import { HexagramDisplay } from '@/components/liuyao/HexagramDisplay';
import { TraditionalAnalysis } from '@/components/liuyao/TraditionalAnalysis';
import { YongShenTargetPicker } from '@/components/liuyao/YongShenTargetPicker';
import { MarkdownContent } from '@/components/ui/MarkdownContent';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { ThinkingBlock } from '@/components/chat/ThinkingBlock';
import {
    type DivinationResult,
    type Hexagram,
    type LiuQin,
    type LiuYaoFullAnalysis,
    type Yao,
    calculateDerivedHexagrams,
    calculateGuaShen,
    normalizeYongShenTargets,
    performFullAnalysis,
    yaosTpCode,
} from '@/lib/divination/liuyao';
import { resolveResultYongShenState, resolveResultYongShenTargets } from '@/lib/divination/liuyao-result-state';
import { getHexagramText } from '@/lib/divination/hexagram-texts';
import { supabase } from '@/lib/auth';
import { DEFAULT_MODEL_ID } from '@/lib/ai/ai-config';
import { getMembershipInfo, type MembershipType } from '@/lib/user/membership';
import { readSessionJSON, updateSessionJSON } from '@/lib/cache';
import { AuthModal } from '@/components/auth/AuthModal';
import { AddToKnowledgeBaseModal } from '@/components/knowledge-base/AddToKnowledgeBaseModal';
import { useKnowledgeBaseFeatureEnabled } from '@/components/knowledge-base/useKnowledgeBaseFeatureEnabled';
import { useHeaderMenu } from '@/components/layout/HeaderMenuContext';
import { CreditsModal } from '@/components/ui/CreditsModal';
import { useStreamingResponse, isCreditsError } from '@/lib/hooks/useStreamingResponse';
import { LIU_QIN_TIPS, SHEN_XI_TIPS, TERM_TIPS } from '@/lib/divination/liuyao-term-tips';
import { buildTraditionalInfo } from '@/lib/divination/liuyao-format-utils';
import { loadConversationAnalysisSnapshot } from '@/lib/chat/conversation-analysis';
import { resolveHistoryConversationId } from '@/lib/history/client';

type LiuyaoQuestionSession = {
    question: string;
    yongShenTargets: LiuQin[];
};

export default function ResultPage() {
    const router = useRouter();
    const { setMenuItems, clearMenuItems } = useHeaderMenu();
    const { knowledgeBaseEnabled } = useKnowledgeBaseFeatureEnabled();
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
    const [showCreditsModal, setShowCreditsModal] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);
    const [pendingYongShenTargets, setPendingYongShenTargets] = useState<LiuQin[]>([]);
    // 使用共享的流式响应 hook
    const streaming = useStreamingResponse();
    const [copied, setCopied] = useState(false);
    const errorBanner = error ? (
        <div data-testid="analysis-error" className="flex items-center justify-center gap-2 text-red-500 mb-4">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
        </div>
    ) : null;
    const yongShenTargetState = useMemo(() => (
        resolveResultYongShenState(result?.yongShenTargets, pendingYongShenTargets)
    ), [pendingYongShenTargets, result?.yongShenTargets]);
    const appliedYongShenTargets = yongShenTargetState.appliedTargets;
    const requiresYongShenTargets = Boolean(result?.question?.trim());
    const missingYongShenTargets = requiresYongShenTargets && appliedYongShenTargets.length === 0;
    const hasAppliedTargets = appliedYongShenTargets.length > 0;
    const canAnalyze = requiresYongShenTargets && hasAppliedTargets;

    // 计算传统分析数据（使用起卦日期执行完整分析）
    const traditionalData = useMemo((): (LiuYaoFullAnalysis & {
        hexagramText?: ReturnType<typeof getHexagramText>;
        changedHexagramText?: ReturnType<typeof getHexagramText>;
        dayStem: string;
    }) | null => {
        if (!result || !canAnalyze) return null;

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
            result.createdAt,
            { yongShenTargets: appliedYongShenTargets }
        );

        const derived = calculateDerivedHexagrams(hexagramCode);
        const guaShen = calculateGuaShen(hexagramCode);

        // 获取卦辞
        const hexagramText = getHexagramText(result.hexagram.name);
        const changedHexagramText = result.changedHexagram
            ? getHexagramText(result.changedHexagram.name)
            : undefined;

        return {
            ...analysis,
            nuclearHexagram: analysis.nuclearHexagram ?? derived.nuclearHexagram,
            oppositeHexagram: analysis.oppositeHexagram ?? derived.oppositeHexagram,
            reversedHexagram: analysis.reversedHexagram ?? derived.reversedHexagram,
            guaShen: analysis.guaShen ?? guaShen,
            hexagramText,
            changedHexagramText,
            dayStem: analysis.ganZhiTime.day.gan, // 返回日干供显示
        };
    }, [appliedYongShenTargets, canAnalyze, result]);

    const yaoByPositionMemo = useMemo(() =>
        traditionalData ? new Map(traditionalData.fullYaos.map(y => [y.position, y] as const)) : new Map(),
    [traditionalData]);

    const generateCopyText = () => {
        if (!result || !canAnalyze) return '';
        const hexagramCode = yaosTpCode(result.yaos);
        const changedCode = result.changedHexagram
            ? yaosTpCode(result.yaos.map(y => ({
                ...y,
                type: y.change === 'changing' ? (y.type === 1 ? 0 : 1) as 0 | 1 : y.type,
            })))
            : undefined;

        return buildTraditionalInfo(
            result.yaos,
            hexagramCode,
            changedCode,
            result.question,
            result.createdAt,
            appliedYongShenTargets,
            result.hexagram,
            result.changedHexagram,
        );
    };

    const handleCopy = async () => {
        const text = generateCopyText();
        if (!text) return;
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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
        const parsed = readSessionJSON<{
            question: string;
            yaos: Yao[];
            hexagram: Hexagram;
            changedHexagram?: Hexagram;
            changedLines: number[];
            createdAt: string;
            yongShenTargets?: LiuQin[];
            divinationId?: string | null;
            conversationId?: string | null;
        }>('liuyao_result');
        if (parsed) {
            try {
                const questionPayload = readSessionJSON<LiuyaoQuestionSession | string>('liuyao_question');
                const questionSessionTargets = questionPayload && typeof questionPayload !== 'string'
                    ? questionPayload.yongShenTargets
                    : [];
                const normalizedTargets = resolveResultYongShenTargets(parsed.yongShenTargets, [], questionSessionTargets);
                setResult({
                    question: parsed.question,
                    yongShenTargets: normalizedTargets,
                    yaos: parsed.yaos as Yao[],
                    hexagram: parsed.hexagram as Hexagram,
                    changedHexagram: parsed.changedHexagram as Hexagram | undefined,
                    changedLines: parsed.changedLines as number[],
                    createdAt: new Date(parsed.createdAt),
                });
                setPendingYongShenTargets(normalizedTargets);
                if (normalizedTargets.length > 0 && normalizeYongShenTargets(parsed.yongShenTargets).length === 0) {
                    updateSessionJSON('liuyao_result', (prev) => ({
                        ...(prev || {}),
                        yongShenTargets: normalizedTargets,
                    }));
                }
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

    // 设置移动端 Header 菜单项
    useEffect(() => {
        const items = [];
        items.push({
            id: 'restart',
            label: '重新起卦',
            icon: <RotateCw className="w-4 h-4" />,
            onClick: () => router.push('/liuyao'),
        });
        if (knowledgeBaseEnabled && divinationId) {
            items.push({
                id: 'add-to-kb',
                label: '加入知识库',
                icon: <BookOpenText className="w-4 h-4" />,
                onClick: () => setKbModalOpen(true),
            });
        }
        items.push({
            id: 'traditional',
            label: showTraditional ? '隐藏传统分析' : '显示传统分析',
            icon: <BookOpen className="w-4 h-4" />,
            onClick: () => setShowTraditional(!showTraditional),
        });
        items.push({
            id: 'terms',
            label: '术语参考',
            icon: <Album className="w-4 h-4" />,
            onClick: () => setShowTermsModal(true),
        });
        setMenuItems(items);
        return () => clearMenuItems();
    }, [divinationId, knowledgeBaseEnabled, showTraditional, router, setMenuItems, clearMenuItems]);

    useEffect(() => {
        if (!result || interpretation) return;

        const loadAnalysis = async () => {
            let resolvedConversationId = conversationId;
            if (!resolvedConversationId && divinationId) {
                resolvedConversationId = await resolveHistoryConversationId('liuyao', divinationId, 'liuyao_result');
                if (resolvedConversationId) {
                    setConversationId(resolvedConversationId);
                }
            }

            if (!resolvedConversationId) return;

            const snapshot = await loadConversationAnalysisSnapshot(resolvedConversationId);
            if (!snapshot) return;

            if (snapshot.analysis) {
                setInterpretation(snapshot.analysis);
            }
            if (snapshot.reasoning) {
                setInterpretationReasoning(snapshot.reasoning);
            }
            if (snapshot.modelId) {
                setSelectedModel(snapshot.modelId);
            }
            setReasoningEnabled(snapshot.reasoningEnabled);
        };

        void loadAnalysis();
    }, [conversationId, divinationId, interpretation, result]);

    const handleGetInterpretation = async () => {
        if (!result || !user) return;
        if (!requiresYongShenTargets) {
            setError('请先明确问题后再解卦');
            return;
        }
        if (requiresYongShenTargets && !hasAppliedTargets) {
            setError('必须先选择分析目标');
            return;
        }
        if (!traditionalData) {
            setError('传统分析数据准备中，请稍后重试');
            return;
        }

        setIsLoading(true);
        streaming.reset();
        setError(null);
        setInterpretationReasoning(null);
        setInterpretation(null);

        try {
            const streamResult = await streaming.startStream('/api/liuyao', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                },
                body: JSON.stringify({
                    action: 'interpret',
                    question: result.question,
                    yongShenTargets: appliedYongShenTargets,
                    hexagram: result.hexagram,
                    changedHexagram: result.changedHexagram,
                    changedLines: result.changedLines,
                    yaos: result.yaos,
                    divinationId: divinationId,
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
                setInterpretation(streamResult.content);
                if (streamResult.reasoning) {
                    setInterpretationReasoning(streamResult.reasoning);
                }
            } else {
                setInterpretation('解读失败，请重试');
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : '解读失败');
        } finally {
            setIsLoading(false);
        }
    };

    const handleApplyYongShenTargets = async () => {
        if (!result) return;
        const normalized = normalizeYongShenTargets(pendingYongShenTargets);
        if (normalized.length === 0) {
            setError('请至少选择一个分析目标');
            return;
        }

        setError(null);
        setResult((prev) => {
            if (!prev) return prev;
            return { ...prev, yongShenTargets: normalized };
        });
        updateSessionJSON('liuyao_result', (prev) => ({
            ...(prev || {}),
            yongShenTargets: normalized,
        }));
        updateSessionJSON<LiuyaoQuestionSession>('liuyao_question', (prev) => ({
            question: prev?.question ?? result.question,
            yongShenTargets: normalized,
        }));

        if (!divinationId) return;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;
            await fetch('/api/liuyao', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    action: 'update',
                    divinationId,
                    yongShenTargets: normalized,
                }),
            });
        } catch (updateError) {
            console.error('回写分析目标失败:', updateError);
        }
    };

    if (!result) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
                {/* Background Effects Removed */}

                <div className="text-center relative z-10 animate-fade-in">
                    <div className="inline-flex relative mb-6">
                        <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full animate-pulse" />
                        <SoundWaveLoader variant="inline" />
                    </div>
                    <p className="text-foreground-secondary text-lg">正在推演卦象...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-8 relative overflow-x-hidden">
            <div className="max-w-5xl mx-auto px-4 py-4 relative z-10 animate-fade-in">
                {/* Header Navigation - 仅桌面端显示 */}
                <div className="hidden md:flex items-center justify-between mb-4">
                    <Link
                        href="/liuyao"
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-white/5 transition-all"
                    >
                        <span className="text-sm">返回</span>
                    </Link>

                    <div className="flex items-center gap-2">
                        <Link
                            href="/liuyao"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all border bg-white/5 border-white/10 text-foreground-secondary hover:bg-white/10"
                        >
                            <RotateCw className="w-3.5 h-3.5" />
                            重新起卦
                        </Link>
                        {knowledgeBaseEnabled && !!divinationId && (
                            <button
                                type="button"
                                onClick={() => setKbModalOpen(true)}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all border bg-white/5 border-white/10 text-foreground-secondary hover:bg-white/10"
                            >
                                <BookOpenText className="w-3.5 h-3.5" />
                                加入知识库
                            </button>
                        )}
                        <button
                            onClick={() => setShowTraditional(!showTraditional)}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all border ${showTraditional
                                ? 'bg-accent/10 border-accent/20 text-accent'
                                : 'bg-white/5 border-white/10 text-foreground-secondary hover:bg-white/10'
                                }`}
                        >
                            <BookOpen className="w-3.5 h-3.5" />
                            传统分析
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowTermsModal(true)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all border bg-white/5 border-white/10 text-foreground-secondary hover:bg-white/10"
                        >
                            <Album className="w-3.5 h-3.5" />
                            术语参考
                        </button>
                    </div>
                </div>

                {/* Question Section - Compact */}
                {result.question && (
                    <div className="text-center mb-4">
                        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                            <Sparkles className="w-4 h-4 text-purple-400" />
                            <span className="text-xs text-foreground-secondary">所问</span>
                            <span className="text-foreground font-medium">{result.question}</span>
                        </div>
                    </div>
                )}

                {!requiresYongShenTargets && (
                    <div className="mb-4 rounded-xl border border-sky-500/20 bg-sky-500/5 p-4 text-sm text-sky-200">
                        当前记录未提供明确问题，只展示原始卦象；补充问题和分析目标后，才能进行正式解卦。
                    </div>
                )}

                {missingYongShenTargets && (
                    <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                        <div className="mb-2 text-sm font-medium text-amber-500">必须先选择分析目标</div>
                        <YongShenTargetPicker
                            value={pendingYongShenTargets}
                            onChange={setPendingYongShenTargets}
                            variant="block"
                        />
                        <div className="mt-3 flex justify-end">
                            <button
                                type="button"
                                onClick={handleApplyYongShenTargets}
                                disabled={pendingYongShenTargets.length === 0}
                                className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-black transition-colors hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                应用目标并继续分析
                            </button>
                        </div>
                    </div>
                )}

                {/* Hexagram Display */}
                <div className="relative bg-white/[0.02] border border-white/5 rounded-xl backdrop-blur-sm p-6 md:p-8 mb-4 shadow-lg w-fit mx-auto">
                    {/* Copy Button */}
                    <button
                        onClick={handleCopy}
                        className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-white/10 bg-white/5 hover:bg-white/10 text-foreground-secondary hover:text-foreground transition-colors"
                        title="复制六爻数据"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? '已复制' : '复制'}</span>
                    </button>
                    <HexagramDisplay
                        yaos={result.yaos}
                        hexagram={result.hexagram}
                        changedHexagram={result.changedHexagram}
                        changedLines={result.changedLines}
                        showDetails={true}
                        fullYaos={traditionalData?.fullYaos}
                        showTraditional={showTraditional}
                        yongShenPositions={traditionalData?.yongShen
                            .flatMap((group) => {
                                if (typeof group.selected.position !== 'number') return [];
                                const line = yaoByPositionMemo.get(group.selected.position);
                                if (!line) return [];
                                return line.liuQin === group.selected.liuQin ? [group.selected.position] : [];
                            })}
                    />
                </div>

                {/* Traditional Analysis */}
                {showTraditional && traditionalData && (
                    <div className="mb-4 animate-fade-in-up">
                        <TraditionalAnalysis
                            analysis={traditionalData}
                            hexagramText={traditionalData.hexagramText}
                            changedHexagramText={traditionalData.changedHexagramText}
                            changedLines={result.changedLines}
                        />
                    </div>
                )}

                {/* AI Interpretation */}
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-2 md:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <h2 className="text-base font-bold flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple-400" />
                            AI 深度解卦
                        </h2>
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
                            {(interpretation || streaming.isStreaming) && (
                                <button
                                    data-testid="reanalyze-button"
                                    onClick={handleGetInterpretation}
                                    disabled={isLoading}
                                    className="p-2 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-white/10 transition-colors disabled:opacity-50"
                                    title="重新分析"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                </button>
                            )}
                        </div>
                    </div>

                    {(interpretation || streaming.isStreaming) ? (
                        <div>
                            {errorBanner}
                            {streaming.isStreaming && !streaming.content && !streaming.reasoning && !interpretation ? (
                                <div className="flex items-center gap-2 py-6 justify-center text-foreground-secondary">
                                    <SoundWaveLoader variant="inline" />
                                    <span className="text-sm">正在解读天机...</span>
                                </div>
                            ) : (
                                <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground-secondary prose-strong:text-purple-300">
                                    {(interpretationReasoning || streaming.reasoning) && (
                                        <ThinkingBlock
                                            content={interpretationReasoning || streaming.reasoning || ''}
                                            isStreaming={streaming.isStreaming && !interpretation}
                                            startTime={streaming.reasoningStartTime}
                                            duration={streaming.reasoningDuration}
                                        />
                                    )}
                                    <MarkdownContent
                                        content={interpretation || streaming.content || ''}
                                        className="text-sm text-foreground"
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            {errorBanner}

                            {user === null ? (
                                <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/5 rounded-xl p-6 text-center max-w-sm mx-auto">
                                    <div className="flex justify-center mb-3">
                                        <div className="p-3 rounded-full bg-purple-500/10 ring-1 ring-purple-500/20">
                                            <Sparkles className="w-6 h-6 text-purple-400" />
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-bold mb-2 text-foreground">AI 深度分析</h3>
                                    <p className="text-foreground-secondary mb-4 text-sm">
                                        登录后解锁完整 AI 深度解读
                                    </p>
                                    <button
                                        onClick={() => setShowAuthModal(true)}
                                        className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-600/20 transition-all hover:scale-[1.02] active:scale-95"
                                    >
                                        立即登录 / 注册
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handleGetInterpretation}
                                    disabled={isLoading || !canAnalyze}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold shadow-lg shadow-purple-600/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    {!requiresYongShenTargets ? '请先补充问题' : !hasAppliedTargets ? '请先选择分析目标' : '获取 AI 深度解读'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {knowledgeBaseEnabled && divinationId && (
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

            {showTermsModal && (
                <div className="fixed inset-0 z-[80]">
                    <button
                        type="button"
                        aria-label="关闭术语参考弹窗"
                        onClick={() => setShowTermsModal(false)}
                        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
                    />
                    <div className="absolute inset-0 flex items-center justify-center p-4">
                        <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-background/95 shadow-2xl backdrop-blur">
                            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                                <div>
                                    <div className="text-sm font-semibold text-foreground">术语参考</div>
                                    <div className="text-xs text-foreground-tertiary">六亲与神系速查</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowTermsModal(false)}
                                    className="rounded-md border border-white/15 p-1 text-foreground-secondary hover:text-foreground"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="max-h-[68vh] overflow-y-auto p-4 text-sm">
                                <div className="space-y-4">
                                    <div>
                                        <div className="mb-2 text-foreground font-medium">六亲</div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-foreground-secondary">
                                            {Object.entries(LIU_QIN_TIPS).map(([name, tip]) => (
                                                <div key={name}>
                                                    <span className="text-foreground">{name}</span>
                                                    {'：'}
                                                    {tip}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="border-t border-white/10 pt-3">
                                        <div className="mb-2 text-foreground font-medium">神系</div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-foreground-secondary">
                                            {Object.entries(SHEN_XI_TIPS).map(([name, tip]) => (
                                                <div key={name}>
                                                    <span className="text-foreground">{name}</span>
                                                    {'：'}
                                                    {tip}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="border-t border-white/10 pt-3">
                                        <div className="mb-2 text-foreground font-medium">其他</div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-foreground-secondary">
                                            {Object.entries(TERM_TIPS).map(([name, tip]) => (
                                                <div key={name}>
                                                    <span className="text-foreground">{name}</span>
                                                    {'：'}
                                                    {tip}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <CreditsModal
                isOpen={showCreditsModal}
                onClose={() => setShowCreditsModal(false)}
            />
        </div>
    );
}
