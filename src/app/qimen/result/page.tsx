/**
 * 奇门遁甲排盘结果页面
 *
 * 对齐 Notion 风格：极简列表、柔和边框、线性图标、去除渐变
 */
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, RotateCw, RefreshCw, Copy, Check, Info } from 'lucide-react';
import { renderQimenCanonicalJSON } from '@mingai/core/json';
import { QimenGrid } from '@/components/qimen/QimenGrid';
import { MarkdownContent } from '@/components/ui/MarkdownContent';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import { ThinkingBlock } from '@/components/chat/ThinkingBlock';
import { AuthModal } from '@/components/auth/AuthModal';
import { CreditsModal } from '@/components/ui/CreditsModal';
import { AddToKnowledgeBaseModal } from '@/components/knowledge-base/AddToKnowledgeBaseModal';
import { useKnowledgeBaseFeatureEnabled } from '@/components/knowledge-base/useKnowledgeBaseFeatureEnabled';
import { useHeaderMenu } from '@/components/layout/HeaderMenuContext';
import { useStreamingResponse, isCreditsError } from '@/lib/hooks/useStreamingResponse';
import { readSessionJSON, updateSessionJSON } from '@/lib/cache/session-storage';
import { DEFAULT_MODEL_ID } from '@/lib/ai/ai-config';
import { useSessionMembership } from '@/lib/hooks/useSessionMembership';
import { generateQimenResultText, toCoreQimenOutput, type QimenOutput } from '@/lib/divination/qimen-shared';
import { useAnalysisSnapshot } from '@/lib/hooks/useAnalysisSnapshot';
import { useAdminJsonCopy } from '@/lib/admin/useAdminJsonCopy';
import { CopyTextModal } from '@/components/divination/CopyTextModal';
import type { ChartTextDetailLevel } from '@/lib/divination/detail-level';

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
    const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
    const [reasoningEnabled, setReasoningEnabled] = useState(false);
    const [interpretation, setInterpretation] = useState<string | null>(null);
    const [interpretationReasoning, setInterpretationReasoning] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showCreditsModal, setShowCreditsModal] = useState(false);
    const [showKbModal, setShowKbModal] = useState(false);
    const [copied, setCopied] = useState(false);
    const [copyDetailLevel, setCopyDetailLevel] = useState<ChartTextDetailLevel>('default');
    const [showCopyModal, setShowCopyModal] = useState(false);
    const hasSavedRef = useRef(false);
    const streaming = useStreamingResponse();
    const { session, user, membershipInfo, sessionLoading, membershipLoading, membershipResolved } = useSessionMembership();
    const membershipPending = membershipLoading || !membershipResolved;
    const membershipType = membershipResolved ? (membershipInfo?.type ?? 'free') : 'free';
    const currentUser = user ? { id: user.id } : null;
    const coreResult = useMemo(() => (result ? toCoreQimenOutput(result) : null), [result]);
    const canonicalResult = useMemo(() => (coreResult ? renderQimenCanonicalJSON(coreResult) : null), [coreResult]);
    const { isAdmin, jsonCopied, copyJson } = useAdminJsonCopy(canonicalResult);

    useEffect(() => {
        if (sessionLoading) return;
        const init = async () => {
            const parsed = readSessionJSON<QimenSessionData>('qimen_result');
            if (!parsed) { router.push('/qimen'); return; }
            setResult(parsed);
            if (!parsed.chartId && session?.access_token && !hasSavedRef.current) {
                hasSavedRef.current = true;
                try {
                    const res = await fetch('/api/qimen', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` }, body: JSON.stringify({ action: 'save', chartData: parsed, question: parsed.question }) });
                    const json = await res.json();
                    if (json?.success && json?.data?.chartId) {
                        updateSessionJSON('qimen_result', (prev) => ({ ...(prev || {}), chartId: json.data.chartId }));
                        setResult(prev => prev ? { ...prev, chartId: json.data.chartId } : prev);
                    }
                } catch (e) { console.error(e); }
            }
        };
        void init();
    }, [router, session?.access_token, sessionLoading]);

    useEffect(() => {
        const items = [
            { id: 'restart', label: '重新起课', icon: <RotateCw className="w-4 h-4" />, onClick: () => router.push('/qimen') },
        ];
        if (isAdmin && canonicalResult) items.push({ id: 'copy-json', label: jsonCopied ? 'JSON 已复制' : 'JSON', icon: jsonCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />, onClick: () => { void copyJson(); } });
        setMenuItems(items);
        return () => clearMenuItems();
    }, [router, isAdmin, canonicalResult, jsonCopied, copyJson, setMenuItems, clearMenuItems]);

    useAnalysisSnapshot({
        conversationId: result?.conversationId,
        recordId: result?.chartId,
        divinationType: 'qimen',
        sessionKey: 'qimen_result',
        hasExistingAnalysis: !!interpretation,
        skip: !result?.conversationId && !result?.chartId,
        callbacks: {
            onAnalysis: setInterpretation,
            onReasoning: setInterpretationReasoning,
            onConversationIdResolved: (resolvedId) => {
                setResult(prev => prev ? { ...prev, conversationId: resolvedId } : prev);
                updateSessionJSON('qimen_result', (prev) => ({ ...(prev || {}), conversationId: resolvedId }));
            },
        },
    });

    const handleGetInterpretation = async () => {
        if (!result || !currentUser) return;
        setIsLoading(true); streaming.reset(); setError(null); setInterpretationReasoning(null); setInterpretation(null);
        try {
            const streamResult = await streaming.startStream('/api/qimen', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token || ''}` },
                body: JSON.stringify({ action: 'analyze', chartData: result, question: result.question, modelId: selectedModel, reasoning: reasoningEnabled, stream: true, chartId: result.chartId || null }),
            });
            if (streamResult?.error && isCreditsError(streamResult.error)) setShowCreditsModal(true);
            else if (streamResult?.content) { setInterpretation(streamResult.content); if (streamResult.reasoning) setInterpretationReasoning(streamResult.reasoning); }
        } catch (err) { setError(err instanceof Error ? err.message : '解读失败'); } finally { setIsLoading(false); }
    };

    const handleCopy = async () => {
        setShowCopyModal(true);
    };

    const handleConfirmCopy = async (level: ChartTextDetailLevel) => {
        if (!result) return;
        setCopyDetailLevel(level);
        await navigator.clipboard.writeText(generateQimenResultText(result, { detailLevel: level }));
        setCopied(true); setTimeout(() => setCopied(false), 2000);
        setShowCopyModal(false);
    };

    if (!result) return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <SoundWaveLoader variant="block" text="正在排盘" />
        </div>
    );

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in space-y-8">
                {/* 头部操作 */}
                <div className="hidden md:flex items-center justify-between border-b border-border/60 pb-6">
                    <Link href="/qimen" className="text-sm font-medium text-foreground/40 hover:text-foreground hover:bg-background-secondary px-2 py-1 rounded-md transition-colors">返回</Link>
                    <div className="flex items-center gap-2">
                        <button onClick={() => router.push('/qimen')} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border border-border hover:bg-background-secondary transition-colors"><RotateCw className="w-3.5 h-3.5" />重新起课</button>
                        <button onClick={handleCopy} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium border border-border hover:bg-background-secondary transition-colors">{copied ? <Check className="w-3.5 h-3.5 text-[#0f7b6c]" /> : <Copy className="w-3.5 h-3.5" />}复制排盘</button>
                    </div>
                </div>

                {/* 占事信息 */}
                {(canonicalResult?.基本信息.占问 || result.question) && (
                    <div className="bg-background border border-border rounded-md p-4 flex items-center gap-3">
                        <Sparkles className="w-4 h-4 text-[#a083ff]" />
                        <span className="text-xs font-bold text-foreground/30 uppercase tracking-widest shrink-0">占事</span>
                        <span className="text-sm font-medium text-foreground">{canonicalResult?.基本信息.占问 || result.question}</span>
                    </div>
                )}

                {/* 排盘参数 */}
                <div className="bg-background-secondary/30 border border-border rounded-md p-6 space-y-4 relative group">
                    <div className="flex items-center gap-3">
                        <Info className="w-4 h-4 text-foreground/30" />
                        <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/60">排盘参数</h2>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            { label: '公历时间', value: coreResult?.dateInfo.solarDate },
                            { label: '农历时间', value: coreResult?.dateInfo.lunarDate },
                            { label: '四柱干支', value: canonicalResult?.基本信息.四柱 },
                            { label: '起局信息', value: canonicalResult ? `${canonicalResult.基本信息.局式} ${canonicalResult.基本信息.旬首}` : '' }
                        ].map(item => (
                            <div key={item.label} className="bg-background border border-border/60 rounded-md p-3">
                                <div className="text-[10px] font-bold text-foreground/30 uppercase mb-1">{item.label}</div>
                                <div className="text-xs font-medium text-foreground/80">{item.value}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 图例 */}
                <div className="flex items-center justify-center gap-4 py-2 border-y border-gray-50">
                    {PHASE_LEGEND.map(({ label, color }) => (
                        <div key={label} className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${color}`} />
                            <span className="text-[10px] font-bold text-foreground/30 uppercase tracking-tighter">{label}</span>
                        </div>
                    ))}
                </div>

                {/* 九宫格 */}
                <div className="bg-background border border-border rounded-md overflow-hidden">
                    <QimenGrid palaces={canonicalResult?.九宫盘 || []} monthPhaseMap={coreResult?.monthPhase} ju={canonicalResult?.基本信息.局式 || ''} />
                </div>

                {/* AI 解读 */}
                <div className="bg-background border border-border rounded-md p-6 space-y-6">
                    <div className="flex items-center justify-between border-b border-border/60 pb-4">
                        <h2 className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider text-foreground/60"><Sparkles className="w-4 h-4 text-[#a083ff]" />AI 深度解读</h2>
                        <div className="flex items-center gap-2">
                            <ModelSelector compact selectedModel={selectedModel} onModelChange={setSelectedModel} reasoningEnabled={reasoningEnabled} onReasoningChange={setReasoningEnabled} userId={currentUser?.id} membershipType={membershipType} disabled={membershipPending} />
                            {(interpretation || streaming.isStreaming) && <button onClick={handleGetInterpretation} disabled={isLoading} className="p-1.5 rounded-md hover:bg-background-secondary transition-colors"><RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /></button>}
                        </div>
                    </div>
                    {error && (
                        <div className="p-3 bg-red-50 text-[#eb5757] text-xs rounded-md border border-red-100">
                            {error}
                        </div>
                    )}

                    {interpretation ? (
                        <div className="prose prose-sm max-w-none">
                            {interpretationReasoning && <ThinkingBlock content={interpretationReasoning} isStreaming={streaming.isStreaming && !interpretation} startTime={streaming.reasoningStartTime} duration={streaming.reasoningDuration} />}
                            <MarkdownContent content={interpretation} className="text-sm text-foreground leading-relaxed" />
                        </div>
                    ) : (
                        <div className="py-12 text-center space-y-6">
                            {sessionLoading || membershipPending ? (
                                <SoundWaveLoader variant="inline" />
                            ) : !currentUser ? (
                                <button onClick={() => setShowAuthModal(true)} className="px-8 py-2.5 bg-[#2383e2] text-white text-sm font-bold rounded-md hover:bg-[#2383e2]/90 transition-colors">登录解锁 AI 深度解读</button>
                            ) : (
                                <button onClick={handleGetInterpretation} disabled={isLoading || membershipPending} className="inline-flex items-center gap-2 px-8 py-2.5 bg-[#2383e2] text-white text-sm font-bold rounded-md hover:bg-[#2383e2]/90 transition-all active:scale-95 disabled:opacity-50"><Sparkles className="w-4 h-4" />获取 AI 解读</button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
            <CreditsModal isOpen={showCreditsModal} onClose={() => setShowCreditsModal(false)} />
            {knowledgeBaseEnabled && result.chartId && <AddToKnowledgeBaseModal open={showKbModal} onClose={() => setShowKbModal(false)} sourceTitle={result.question || '奇门遁甲排盘'} sourceType="qimen_chart" sourceId={result.chartId} />}
            <CopyTextModal
                isOpen={showCopyModal}
                value={copyDetailLevel}
                onChange={setCopyDetailLevel}
                onClose={() => setShowCopyModal(false)}
                onConfirm={handleConfirmCopy}
            />
        </div>
    );
}
