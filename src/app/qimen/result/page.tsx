/**
 * 奇门遁甲排盘结果页面
 *
 * 'use client' 标记说明：
 * - 使用 useState/useEffect 管理状态
 * - 使用 sessionStorage 读取排盘数据
 */
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, RotateCw, Loader2, RefreshCw, Copy, Check, BookOpenText } from 'lucide-react';
import { QimenGrid } from '@/components/qimen/QimenGrid';
import { MarkdownContent } from '@/components/ui/MarkdownContent';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { ThinkingBlock } from '@/components/chat/ThinkingBlock';
import { AuthModal } from '@/components/auth/AuthModal';
import { CreditsModal } from '@/components/ui/CreditsModal';
import { AddToKnowledgeBaseModal } from '@/components/knowledge-base/AddToKnowledgeBaseModal';
import { useKnowledgeBaseFeatureEnabled } from '@/components/knowledge-base/useKnowledgeBaseFeatureEnabled';
import { useHeaderMenu } from '@/components/layout/HeaderMenuContext';
import { useStreamingResponse, isCreditsError } from '@/lib/hooks/useStreamingResponse';
import { supabase } from '@/lib/auth';
import { readSessionJSON, updateSessionJSON } from '@/lib/cache';
import { DEFAULT_MODEL_ID } from '@/lib/ai/ai-config';
import { getMembershipInfo, type MembershipType } from '@/lib/user/membership';
import type { QimenOutput } from '@/lib/divination/qimen';
import { loadConversationAnalysisSnapshot } from '@/lib/chat/conversation-analysis';
import { resolveHistoryConversationId } from '@/lib/history/client';

/** 五行旺衰图例 */
const PHASE_LEGEND = [
    { label: '木旺', color: 'bg-green-500' },
    { label: '火相', color: 'bg-red-500' },
    { label: '水休', color: 'bg-blue-500' },
    { label: '金囚', color: 'bg-amber-500' },
    { label: '土死', color: 'bg-stone-500' },
];

interface QimenSessionData extends QimenOutput {
    question?: string;
    createdAt: string;
    chartId?: string;
    conversationId?: string;
}

export default function QimenResultPage() {
    const router = useRouter();
    const { setMenuItems, clearMenuItems } = useHeaderMenu();
    const { knowledgeBaseEnabled } = useKnowledgeBaseFeatureEnabled();
    const [result, setResult] = useState<QimenSessionData | null>(null);
    const [user, setUser] = useState<{ id: string } | null | undefined>(undefined);
    const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
    const [reasoningEnabled, setReasoningEnabled] = useState(false);
    const [membershipType, setMembershipType] = useState<MembershipType>('free');
    const [interpretation, setInterpretation] = useState<string | null>(null);
    const [interpretationReasoning, setInterpretationReasoning] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showCreditsModal, setShowCreditsModal] = useState(false);
    const [activeTab, setActiveTab] = useState<'summary' | 'imagery' | 'notes'>('summary');
    const [showKbModal, setShowKbModal] = useState(false);
    const [copied, setCopied] = useState(false);
    const hasSavedRef = useRef(false);
    const streaming = useStreamingResponse();

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const currentUser = session?.user ? { id: session.user.id } : null;
            setUser(currentUser);
            if (session?.user) {
                const info = await getMembershipInfo(session.user.id);
                if (info) setMembershipType(info.type);
            }

            const parsed = readSessionJSON<QimenSessionData>('qimen_result');
            if (!parsed) {
                router.push('/qimen');
                return;
            }
            setResult(parsed);

            // 若尚未保存过，自动保存排盘记录（拿到 chartId 后供 AI 解读关联）
            if (!parsed.chartId && session?.access_token && !hasSavedRef.current) {
                hasSavedRef.current = true;
                try {
                    const res = await fetch('/api/qimen', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`,
                        },
                        body: JSON.stringify({
                            action: 'save',
                            chartData: parsed,
                            question: parsed.question,
                        }),
                    });
                    const json = await res.json();
                    if (json?.success && json?.data?.chartId) {
                        updateSessionJSON('qimen_result', (prev) => ({
                            ...(prev || {}),
                            chartId: json.data.chartId,
                        }));
                        setResult(prev => prev ? { ...prev, chartId: json.data.chartId } : prev);
                    }
                } catch (e) {
                    console.error('[qimen] 自动保存排盘失败:', e);
                }
            }
        };
        void init();
    }, [router]);

    useEffect(() => {
        const items = [
            {
                id: 'restart',
                label: '重新起课',
                icon: <RotateCw className="w-4 h-4" />,
                onClick: () => router.push('/qimen'),
            },
        ];
        setMenuItems(items);
        return () => clearMenuItems();
    }, [router, setMenuItems, clearMenuItems]);

    // 从历史记录查看时，恢复之前的 AI 解读
    useEffect(() => {
        if ((!result?.conversationId && !result?.chartId) || interpretation) return;

        const loadAnalysis = async () => {
            let resolvedId = result.conversationId;
            if (!resolvedId && result.chartId) {
                resolvedId = (await resolveHistoryConversationId('qimen', result.chartId, 'qimen_result')) || undefined;
                if (resolvedId) {
                    setResult(prev => prev ? { ...prev, conversationId: resolvedId } : prev);
                    updateSessionJSON('qimen_result', (prev) => ({
                        ...(prev || {}),
                        conversationId: resolvedId,
                    }));
                }
            }
            if (!resolvedId) return;

            const snapshot = await loadConversationAnalysisSnapshot(resolvedId);
            if (!snapshot) return;

            if (snapshot.analysis) {
                setInterpretation(snapshot.analysis);
            }
            if (snapshot.reasoning) {
                setInterpretationReasoning(snapshot.reasoning);
            }
        };

        void loadAnalysis();
    }, [result?.conversationId, result?.chartId, interpretation]);

    const handleGetInterpretation = async () => {
        if (!result || !user) return;
        setIsLoading(true);
        streaming.reset();
        setError(null);
        setInterpretationReasoning(null);
        setInterpretation(null);

        try {
            const streamResult = await streaming.startStream('/api/qimen', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
                },
                body: JSON.stringify({
                    action: 'analyze',
                    chartData: result,
                    question: result.question,
                    modelId: selectedModel,
                    reasoning: reasoningEnabled,
                    stream: true,
                    chartId: result.chartId || null,
                }),
            });

            if (streamResult?.error && isCreditsError(streamResult.error)) {
                setShowCreditsModal(true);
                return;
            }
            if (streamResult?.error) {
                throw new Error(streamResult.error);
            }
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

    // 生成与 MCP formatQimenAsMarkdown 一致的复制文本
    const generateCopyText = (): string => {
        if (!result) return '';
        const dunText = result.dunType === 'yang' ? '阳遁' : '阴遁';
        const lines: string[] = [];

        lines.push('# 奇门遁甲排盘');
        lines.push('');
        lines.push('## 基本信息');
        lines.push(`- **公历**: ${result.solarDate}`);
        lines.push(`- **农历**: ${result.lunarDate}`);
        lines.push(`- **节气**: ${result.solarTerm ?? ''}${result.solarTermRange ? `（${result.solarTermRange}）` : ''}`);
        lines.push(`- **四柱**: ${result.fourPillars.year} ${result.fourPillars.month} ${result.fourPillars.day} ${result.fourPillars.hour}`);
        lines.push(`- **局**: ${dunText}${result.juNumber}局`);
        if (result.yuan) lines.push(`- **三元**: ${result.yuan}`);
        lines.push(`- **旬首**: ${result.xunShou}`);
        lines.push(`- **盘式**: ${result.panTypeLabel}（${result.juMethodLabel}）`);
        if (result.question) lines.push(`- **占问**: ${result.question}`);
        lines.push('');

        lines.push('## 值符值使');
        const zhiFuPalace = result.zhiFuPalace != null ? `${result.zhiFuPalace}宫` : '';
        const zhiShiPalace = result.zhiShiPalace != null ? `${result.zhiShiPalace}宫` : '';
        lines.push(`- **值符**: ${result.zhiFu}${zhiFuPalace ? `（${zhiFuPalace}）` : ''}`);
        lines.push(`- **值使**: ${result.zhiShi}${zhiShiPalace ? `（${zhiShiPalace}）` : ''}`);
        lines.push('');

        if (result.kongWang?.dayKong && result.yiMa?.branch) {
            lines.push('## 空亡与驿马');
            lines.push(`- **日空**: ${result.kongWang.dayKong.branches.join('、')}（${result.kongWang.dayKong.palaces.join('、')}宫）`);
            if (result.kongWang.hourKong?.branches?.length) {
                lines.push(`- **时空**: ${result.kongWang.hourKong.branches.join('、')}（${result.kongWang.hourKong.palaces.join('、')}宫）`);
            }
            lines.push(`- **驿马**: ${result.yiMa.branch}（${result.yiMa.palace}宫）`);
            lines.push('');
        }

        // 九宫盘 - 洛书排列（纯文本格式）
        lines.push('## 九宫盘');
        lines.push('');
        const palaces = result.palaces;
        const luoshuOrder = [3, 8, 1, 2, 4, 6, 7, 0, 5]; // 巽离坤 震中兑 艮坎乾
        for (const idx of luoshuOrder) {
            const p = palaces[idx];
            if (!p) continue;
            if (idx === 4) {
                lines.push(`【中五宫】地:${p.earthStem}`);
                continue;
            }
            const marks: string[] = [];
            if (p.isEmpty) marks.push('空');
            if (p.isHorseStar) marks.push('马');
            if (p.isRuMu) marks.push('墓');
            const markStr = marks.length > 0 ? ` [${marks.join(',')}]` : '';
            const formStr = p.patterns?.length > 0 ? ` 格局:${p.patterns.join(',')}` : '';
            lines.push(`【${p.palaceName}${p.palaceNumber}宫】${markStr} ${p.god} | 天:${p.heavenStem} 地:${p.earthStem} | ${p.star} | ${p.gate}${formStr}`);
        }

        // 九宫详情表
        lines.push('');
        lines.push('## 九宫详情');
        lines.push('');
        lines.push('| 宫位 | 方位 | 地盘 | 天盘 | 九星 | 八门 | 八神 | 格局 | 旺衰 | 标记 |');
        lines.push('|------|------|------|------|------|------|------|------|------|------|');
        for (const p of palaces) {
            const marks: string[] = [];
            if (p.isEmpty) marks.push('空亡');
            if (p.isHorseStar) marks.push('驿马');
            if (p.isRuMu) marks.push('入墓');
            const formStr = p.patterns?.join('、') || '-';
            const wangShuai = p.stemWangShuai || '-';
            const direction = p.direction || '-';
            lines.push(`| ${p.palaceName}${p.palaceNumber} | ${direction} | ${p.earthStem || '-'} | ${p.heavenStem || '-'} | ${p.star || '-'} | ${p.gate || '-'} | ${p.god || '-'} | ${formStr} | ${wangShuai} | ${marks.join('、') || '-'} |`);
        }

        // 格局总览
        if (result.globalFormations?.length) {
            lines.push('');
            lines.push('## 格局总览');
            lines.push('');
            for (const f of result.globalFormations) {
                lines.push(`- ${f}`);
            }
        }

        return lines.join('\n');
    };

    const handleCopy = async () => {
        const text = generateCopyText();
        if (!text) return;
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!result) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center animate-fade-in">
                    <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mx-auto mb-4" />
                    <p className="text-foreground-secondary text-lg">正在排盘...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-8 relative overflow-x-hidden">
            <div className="max-w-4xl mx-auto px-4 py-4 relative z-10 animate-fade-in">
                {/* Header Navigation - 桌面端 */}
                <div className="hidden md:flex items-center justify-between mb-4">
                    <Link
                        href="/qimen"
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-white/5 transition-all"
                    >
                        <span className="text-sm">返回</span>
                    </Link>
                    <Link
                        href="/qimen"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all border bg-white/5 border-white/10 text-foreground-secondary hover:bg-white/10"
                    >
                        <RotateCw className="w-3.5 h-3.5" />
                        重新起课
                    </Link>
                </div>

                {/* 占事 */}
                {result.question && (
                    <div className="text-center mb-4">
                        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                            <Sparkles className="w-4 h-4 text-indigo-400" />
                            <span className="text-xs text-foreground-secondary">占事</span>
                            <span className="text-foreground font-medium">{result.question}</span>
                        </div>
                    </div>
                )}

                {/* 顶部信息栏 */}
                <div className="relative bg-white/[0.02] border border-white/10 rounded-xl p-3 md:p-4 mb-4">
                    {/* 操作按钮 */}
                    <div className="absolute top-2 right-2 flex items-center gap-1">
                        {knowledgeBaseEnabled && result.chartId && (
                            <button
                                onClick={() => setShowKbModal(true)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-white/10 bg-white/5 hover:bg-white/10 text-foreground-secondary hover:text-foreground transition-colors"
                                title="加入知识库"
                            >
                                <BookOpenText className="w-3.5 h-3.5" />
                                <span>知识库</span>
                            </button>
                        )}
                        <button
                            onClick={handleCopy}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-white/10 bg-white/5 hover:bg-white/10 text-foreground-secondary hover:text-foreground transition-colors"
                            title="复制排盘数据"
                        >
                            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copied ? '已复制' : '复制'}</span>
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs md:text-sm text-foreground-secondary">
                        <span>{result.solarDate}</span>
                        <span>{result.lunarDate}</span>
                        <span>{result.panTypeLabel} - {result.juMethodLabel}</span>
                        <span>{result.solarTermRange}</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs md:text-sm mt-2">
                        <span className="text-foreground">
                            四柱：{result.fourPillars.year} {result.fourPillars.month} {result.fourPillars.day} {result.fourPillars.hour}
                        </span>
                        <span className="text-foreground-secondary">旬首：{result.xunShou}</span>
                        <span className="text-foreground-secondary">
                            {result.dunType === 'yang' ? '阳遁' : '阴遁'}{result.juNumber}局
                        </span>
                        <span className="text-foreground-secondary">值符：{result.zhiFu}</span>
                        <span className="text-foreground-secondary">值使：{result.zhiShi}</span>
                    </div>
                </div>

                {/* 五行颜色图例 */}
                <div className="flex items-center justify-center gap-3 mb-4">
                    {PHASE_LEGEND.map(({ label, color }) => (
                        <div key={label} className="flex items-center gap-1">
                            <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
                            <span className="text-[10px] md:text-xs text-foreground-secondary">{label}</span>
                        </div>
                    ))}
                </div>

                {/* 九宫格 */}
                <div className="mb-6">
                    <QimenGrid
                        palaces={result.palaces}
                        monthPhase={result.monthPhase}
                        juNumber={result.juNumber}
                        dunType={result.dunType}
                    />
                </div>

                {/* AI 解读区域 */}
                <div className="rounded-xl border border-white/10 bg-white/[0.02] p-2 md:p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                        <h2 className="text-base font-bold flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-indigo-400" />
                            AI 解读
                        </h2>
                        <div className="flex items-center gap-2">
                            {/* Tabs */}
                            <div className="hidden md:flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
                                {(['summary', 'imagery', 'notes'] as const).map(tab => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-2.5 py-1 rounded-md text-xs transition-all ${
                                            activeTab === tab
                                                ? 'bg-indigo-500/20 text-indigo-400'
                                                : 'text-foreground-secondary hover:text-foreground'
                                        }`}
                                    >
                                        {tab === 'summary' ? '概要' : tab === 'imagery' ? '意象' : '批注'}
                                    </button>
                                ))}
                            </div>
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

                    {error && (
                        <div className="flex items-center justify-center gap-2 text-red-500 mb-4">
                            <span className="text-sm">{error}</span>
                        </div>
                    )}

                    {(interpretation || streaming.isStreaming) ? (
                        <div>
                            {streaming.isStreaming && !streaming.content && !streaming.reasoning && !interpretation ? (
                                <div className="flex items-center gap-2 py-6 justify-center text-foreground-secondary">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span className="text-sm">正在解读天机...</span>
                                </div>
                            ) : (
                                <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground-secondary">
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
                            {user === null ? (
                                <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/5 rounded-xl p-6 text-center max-w-sm mx-auto">
                                    <div className="flex justify-center mb-3">
                                        <div className="p-3 rounded-full bg-indigo-500/10 ring-1 ring-indigo-500/20">
                                            <Sparkles className="w-6 h-6 text-indigo-400" />
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-bold mb-2 text-foreground">AI 深度分析</h3>
                                    <p className="text-foreground-secondary mb-4 text-sm">
                                        登录后解锁完整 AI 深度解读
                                    </p>
                                    <button
                                        onClick={() => setShowAuthModal(true)}
                                        className="w-full py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-95"
                                    >
                                        立即登录 / 注册
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={handleGetInterpretation}
                                    disabled={isLoading}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    获取 AI 深度解读
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
            <CreditsModal isOpen={showCreditsModal} onClose={() => setShowCreditsModal(false)} />
            {knowledgeBaseEnabled && result.chartId && (
                <AddToKnowledgeBaseModal
                    open={showKbModal}
                    onClose={() => setShowKbModal(false)}
                    sourceTitle={result.question || '奇门遁甲排盘'}
                    sourceType="qimen_chart"
                    sourceId={result.chartId}
                />
            )}
        </div>
    );
}
