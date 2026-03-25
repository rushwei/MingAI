/**
 * 大六壬排盘结果页
 * 需要 useState + sessionStorage + 流式 AI
 */
'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Brain, ChevronDown, ChevronUp, RotateCcw, Copy, Check } from 'lucide-react';
import { renderDaliurenCanonicalJSON } from '@mingai/core/json';
import { useToast } from '@/components/ui/Toast';
import { readSessionJSON, updateSessionJSON } from '@/lib/cache';
import { TianDiPanGrid } from '@/components/daliuren/TianDiPanGrid';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { MarkdownContent } from '@/components/ui/MarkdownContent';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import { ThinkingBlock } from '@/components/chat/ThinkingBlock';
import { useStreamingResponse, isCreditsError } from '@/lib/hooks/useStreamingResponse';
import { AuthModal } from '@/components/auth/AuthModal';
import { CreditsModal } from '@/components/ui/CreditsModal';
import { extractAnalysisFromConversation } from '@/lib/ai/ai-analysis-query';
import type { ChatMessage } from '@/types';
import type { DaliurenOutput } from '@mingai/core/daliuren';
import { supabase } from '@/lib/auth';
import { loadConversation } from '@/lib/chat/conversation';
import { generateDaliurenResultText } from '@/lib/divination/daliuren';
import { useHeaderMenu } from '@/components/layout/HeaderMenuContext';
import { resolveHistoryConversationId } from '@/lib/history/client';
import { useAdminJsonCopy } from '@/lib/admin/useAdminJsonCopy';
import { DEFAULT_MODEL_ID } from '@/lib/ai/ai-config';
import { getMembershipInfo, type MembershipType } from '@/lib/user/membership';

const SHENSHA_DISPLAY = [
    '日德', '日禄', '生气', '桃花', '天喜', '天医', '成神',
    '丧门', '吊客', '病符', '月破', '破碎', '死气', '血忌',
    '驿马', '天马', '月德', '天德',
];

const SANCHUAN_COLORS = ['border-red-400/50', 'border-orange-400/50', 'border-yellow-400/50'] as const;
const WANG_SHUAI_COLORS: Record<string, string> = {
    旺: 'text-rose-400',
    相: 'text-amber-400',
    休: 'text-blue-400',
    囚: 'text-slate-400',
    死: 'text-stone-500',
};

export default function DaliurenResultPage() {
    const router = useRouter();
    const { setMenuItems, clearMenuItems } = useHeaderMenu();
    const { showToast } = useToast();
    const [result, setResult] = useState<DaliurenOutput | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [membershipType, setMembershipType] = useState<MembershipType>('free');
    const [modelId, setModelId] = useState<string>(DEFAULT_MODEL_ID);
    const [reasoningEnabled, setReasoningEnabled] = useState(false);
    const [showShensha, setShowShensha] = useState(false);
    const [showGongDetails, setShowGongDetails] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showCreditsModal, setShowCreditsModal] = useState(false);
    const [divinationId, setDivinationId] = useState<string | undefined>();
    const [conversationId, setConversationId] = useState<string | undefined>();
    const [interpretation, setInterpretation] = useState<string | null>(null);
    const [interpretationReasoning, setInterpretationReasoning] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const hasAutoSavedRef = useRef(false);

    const streaming = useStreamingResponse();
    const canonicalResult = useMemo(
        () => (result ? renderDaliurenCanonicalJSON(result) : null),
        [result]
    );
    const { isAdmin, jsonCopied, copyJson } = useAdminJsonCopy(canonicalResult);

    const persistSessionIds = useCallback((next: {
        divinationId?: string;
        conversationId?: string;
    }) => {
        updateSessionJSON('daliuren_params', (prev) => ({
            ...(prev || {}),
            ...(next.divinationId ? { divinationId: next.divinationId } : {}),
            ...(next.conversationId ? { conversationId: next.conversationId } : {}),
        }));
    }, []);

    const saveDivinationRecord = useCallback(async (
        params: Record<string, unknown> | null,
        nextResult: DaliurenOutput,
        token: string,
    ): Promise<string | undefined> => {
        const response = await fetch('/api/daliuren', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ action: 'save', ...params, resultData: nextResult }),
        });
        const payload = await response.json().catch(() => null) as
            | { success?: boolean; error?: string; data?: { divinationId?: string } }
            | null;

        const nextDivinationId = payload?.data?.divinationId;
        if (nextDivinationId) {
            setDivinationId(nextDivinationId);
            persistSessionIds({ divinationId: nextDivinationId });
            return nextDivinationId;
        }

        if (!response.ok || payload?.success === false) {
            showToast('error', payload?.error || '保存排盘记录失败');
        }

        return undefined;
    }, [persistSessionIds, showToast]);

    useEffect(() => {
        const controller = new AbortController();

        const init = async () => {
            const params = readSessionJSON('daliuren_params') as Record<string, unknown> | null;
            if (!params?.date) {
                router.replace('/daliuren');
                return;
            }

            const session = await supabase.auth.getSession();
            const sessionUserId = session.data.session?.user?.id || null;
            setUserId(sessionUserId);
            if (sessionUserId) {
                const info = await getMembershipInfo(sessionUserId);
                if (info) {
                    setMembershipType(info.type);
                }
            } else {
                setMembershipType('free');
            }

            const nextDivinationId = typeof params.divinationId === 'string' ? params.divinationId : undefined;
            const nextConversationId = typeof params.conversationId === 'string' ? params.conversationId : undefined;

            try {
                const response = await fetch('/api/daliuren', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'calculate', ...params }),
                    signal: controller.signal,
                });
                const payload = await response.json().catch(() => null) as
                    | { success?: boolean; error?: string; data?: DaliurenOutput }
                    | null;

                if (controller.signal.aborted) return;

                if (nextDivinationId) setDivinationId(nextDivinationId);
                if (nextConversationId) setConversationId(nextConversationId);

                const nextResult = payload?.data;
                if (!response.ok || !nextResult) {
                    showToast('error', payload?.error || '排盘失败');
                    setIsLoading(false);
                    return;
                }

                setResult(nextResult);
                setIsLoading(false);

                if (!nextDivinationId && !hasAutoSavedRef.current) {
                    const token = session.data.session?.access_token;
                    if (token) {
                        hasAutoSavedRef.current = true;
                        await saveDivinationRecord(params, nextResult, token);
                    }
                }
            } catch (err) {
                if (err instanceof Error && err.name !== 'AbortError') {
                    showToast('error', '网络错误');
                    setIsLoading(false);
                }
            }
        };

        void init();

        return () => controller.abort();
    }, [router, saveDivinationRecord, showToast]);

    useEffect(() => {
        if (!divinationId || conversationId || streaming.isStreaming) return;

        let cancelled = false;

        const resolveConversationId = async () => {
            const resolvedConversationId = await resolveHistoryConversationId('daliuren', divinationId, 'daliuren_params');
            if (cancelled || !resolvedConversationId) return;
            setConversationId(resolvedConversationId);
            persistSessionIds({ conversationId: resolvedConversationId });
        };

        void resolveConversationId();

        return () => {
            cancelled = true;
        };
    }, [conversationId, divinationId, persistSessionIds, streaming.isStreaming]);

    useEffect(() => {
        if (!conversationId || interpretation || streaming.content) return;

        let cancelled = false;

        const loadSavedAnalysis = async () => {
            const conversation = await loadConversation(conversationId);
            if (cancelled || !conversation) return;

            const messages = (conversation.messages as ChatMessage[]) || [];
            const sourceData = (conversation.sourceData || undefined) as Record<string, unknown> | undefined;
            const { analysis, reasoning, modelId: savedModelId } = extractAnalysisFromConversation(messages, sourceData);
            if (analysis) {
                setInterpretation(analysis);
            }
            if (reasoning) {
                setInterpretationReasoning(reasoning);
                setReasoningEnabled(true);
            }
            if (savedModelId) {
                setModelId(savedModelId);
            }
        };

        void loadSavedAnalysis();

        return () => {
            cancelled = true;
        };
    }, [conversationId, interpretation, streaming.content]);

    const filteredShensha = useMemo(() => {
        if (!canonicalResult) return [];
        return Object.entries(canonicalResult.shenSha)
            .flatMap(([value, names]) => names.map((name) => ({ name, value })))
            .filter((item) => SHENSHA_DISPLAY.includes(item.name));
    }, [canonicalResult]);

    const handleCopy = useCallback(async () => {
        if (!result) return;
        try {
            await navigator.clipboard.writeText(generateDaliurenResultText(result));
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            showToast('success', '结果已复制到剪贴板');
        } catch {
            showToast('error', '复制失败，请手动复制');
        }
    }, [result, showToast]);

    useEffect(() => {
        if (!result) return;
        setMenuItems([
            {
                id: 'copy',
                label: copied ? '已复制' : '复制',
                icon: copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />,
                onClick: () => { void handleCopy(); },
            },
            ...(isAdmin && canonicalResult ? [{
                id: 'copy-json',
                label: jsonCopied ? 'JSON 已复制' : '复制 JSON',
                icon: jsonCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />,
                onClick: () => { void copyJson(); },
            }] : []),
        ]);
        return () => clearMenuItems();
    }, [result, copied, isAdmin, canonicalResult, jsonCopied, handleCopy, copyJson, setMenuItems, clearMenuItems]);

    const handleInterpret = useCallback(async () => {
        if (!result) return;
        const params = readSessionJSON('daliuren_params') as Record<string, unknown> | null;
        setInterpretation(null);
        setInterpretationReasoning(null);
        setError(null);

        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        if (!token) { setShowAuthModal(true); return; }

        let currentDivinationId = divinationId;
        if (!currentDivinationId) {
            currentDivinationId = await saveDivinationRecord(params, result, token);
        }

        const streamResult = await streaming.startStream('/api/daliuren', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                action: 'interpret',
                resultData: result,
                question: params?.question,
                divinationId: currentDivinationId,
                modelId,
                reasoning: reasoningEnabled,
                stream: true,
            }),
        });

        const err = streamResult?.error;
        if (err) {
            if (isCreditsError(err)) {
                setShowCreditsModal(true);
            } else if (err.includes('401') || err.includes('认证') || err.includes('请先登录')) {
                setShowAuthModal(true);
            } else {
                setError(err);
            }
            return;
        }

        if (streamResult?.reasoning) {
            setInterpretationReasoning(streamResult.reasoning);
        }

        if (currentDivinationId) {
            const resolvedConversationId = await resolveHistoryConversationId('daliuren', currentDivinationId, 'daliuren_params');
            if (resolvedConversationId) {
                setConversationId(resolvedConversationId);
                persistSessionIds({ conversationId: resolvedConversationId });
            }
        }
    }, [divinationId, modelId, persistSessionIds, reasoningEnabled, result, saveDivinationRecord, streaming]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <SoundWaveLoader variant="block" text="正在起课..." />
            </div>
        );
    }

    if (!result) return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
            <p className="text-sm text-foreground-secondary">排盘失败，请返回重试</p>
            <button
                onClick={() => router.back()}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-background-secondary text-sm text-foreground hover:bg-background-tertiary transition-colors"
            >
                <RotateCcw className="w-4 h-4" />
                返回
            </button>
        </div>
    );

    const { basicInfo, siKe, sanChuan, gongInfos } = canonicalResult!;

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* 头部 */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/50 px-4 py-3">
                <div className="max-w-lg mx-auto flex items-center justify-between">
                    <button onClick={() => router.back()} className="text-foreground-secondary hover:text-foreground">
                        <RotateCcw className="w-5 h-5" />
                    </button>
                    <div className="text-center">
                        <div className="text-sm font-bold text-foreground">{basicInfo.keName}</div>
                        <div className="text-xs text-cyan-500">
                            {basicInfo.keTi.subTypes.join('·')}{basicInfo.keTi.extraTypes.length > 0 ? '·' + basicInfo.keTi.extraTypes.join('·') : ''}
                        </div>
                        <div className="text-[10px] text-foreground-secondary">取传法：{basicInfo.keTi.method}</div>
                    </div>
                    <button
                        onClick={() => { void handleCopy(); }}
                        className="inline-flex items-center gap-1 rounded-lg border border-border/40 px-2 py-1 text-xs text-foreground-secondary hover:text-foreground hover:border-cyan-500/40 transition-colors"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? '已复制' : '复制'}</span>
                    </button>
                    {isAdmin && canonicalResult && (
                        <button
                            onClick={() => { void copyJson(); }}
                            className="inline-flex items-center gap-1 rounded-lg border border-border/40 px-2 py-1 text-xs text-foreground-secondary hover:text-foreground hover:border-cyan-500/40 transition-colors"
                        >
                            {jsonCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{jsonCopied ? 'JSON 已复制' : '复制 JSON'}</span>
                        </button>
                    )}
                </div>
            </div>

            <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
                {/* 基础信息 */}
                <div className="bg-background-secondary/50 rounded-xl p-4 border border-border/30">
                    <div className="text-xs text-foreground-secondary mb-2">{basicInfo.date}</div>
                    <div className="text-xs text-foreground-tertiary mb-2">农历：{basicInfo.lunarDate || '-'}</div>
                    <div className="text-sm font-mono text-foreground mb-2">{basicInfo.bazi}</div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground-secondary">
                        <span>月将：{basicInfo.yueJiang}</span>
                        <span>旬空：{basicInfo.kongWang.join('')}</span>
                        <span>驿马：{basicInfo.yiMa} · 天马：{basicInfo.tianMa} · 丁马：{basicInfo.dingMa}</span>
                        <span>{basicInfo.diurnal}占</span>
                    </div>
                    {(basicInfo.benMing || basicInfo.xingNian) && (
                        <div className="mt-2 text-xs text-foreground-secondary flex flex-wrap gap-x-4 gap-y-1">
                            {basicInfo.benMing && <span>本命：{basicInfo.benMing}</span>}
                            {basicInfo.xingNian && <span>行年：{basicInfo.xingNian}</span>}
                        </div>
                    )}
                </div>

                {/* 神煞 */}
                <div className="bg-background-secondary/50 rounded-xl border border-border/30 overflow-hidden">
                    <button
                        onClick={() => setShowShensha(!showShensha)}
                        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground"
                    >
                        <span>神煞（{filteredShensha.length}）</span>
                        {showShensha ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {showShensha && (
                        <div className="px-4 pb-4 flex flex-wrap gap-2">
                            {filteredShensha.map(s => (
                                <span key={s.name} className="text-xs bg-background rounded-lg px-2 py-1 border border-border/30">
                                    {s.name}<span className="text-cyan-500 ml-1">{s.value}</span>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* 三传 */}
                <div className="bg-background-secondary/50 rounded-xl p-4 border border-border/30">
                    <h3 className="text-sm font-bold text-foreground mb-3">三传</h3>
                    <div className="grid grid-cols-3 gap-2">
                        {(['初传', '中传', '末传'] as const).map((label, i) => {
                            const data = sanChuan[i];
                            return (
                                <div key={label} className={`flex flex-col items-center p-2 rounded-lg border ${SANCHUAN_COLORS[i]} bg-background`}>
                                    <div className="text-xs text-foreground-secondary">{label}</div>
                                    <div className="text-lg font-bold text-foreground">{data?.branch}</div>
                                    <div className="text-xs text-foreground-secondary">{data?.tianJiang}</div>
                                    <div className="text-xs text-cyan-500">{data?.liuQin}</div>
                                    {data?.dunGan && data.dunGan !== '-' && <div className="text-xs text-foreground-tertiary">{data.dunGan}</div>}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 四课 */}
                <div className="bg-background-secondary/50 rounded-xl p-4 border border-border/30">
                    <h3 className="text-sm font-bold text-foreground mb-3">四课</h3>
                    <div className="grid grid-cols-4 gap-1">
                        {(['四课', '三课', '二课', '一课'] as const).map((label) => {
                            const data = siKe.find((item) => item.ke === label);
                            return (
                                <div key={label} className="flex flex-col items-center p-2 rounded-lg bg-background border border-border/20">
                                    <div className="text-xs text-cyan-400">{data?.tianJiang}</div>
                                    <div className="text-sm font-bold">{data?.upper}</div>
                                    <div className="text-xs text-foreground-secondary">{data?.lower}</div>
                                    <div className="text-xs text-foreground-tertiary">{label}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 天地盘 */}
                <div className="bg-background-secondary/50 rounded-xl p-4 border border-border/30">
                    <h3 className="text-sm font-bold text-foreground mb-3">天地盘</h3>
                    <TianDiPanGrid result={canonicalResult!} />
                </div>

                {/* 十二宫详情 */}
                <div className="bg-background-secondary/50 rounded-xl p-4 border border-border/30">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-foreground">十二宫详情</h3>
                        <button
                            type="button"
                            onClick={() => setShowGongDetails((prev) => !prev)}
                            className="text-xs text-foreground-secondary hover:text-foreground flex items-center gap-1"
                        >
                            {showGongDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            {showGongDetails ? '收起' : '展开'}
                        </button>
                    </div>
                    {showGongDetails ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                                <thead>
                                    <tr className="text-foreground-secondary">
                                        <th className="py-2 px-2 text-left">地盘</th>
                                        <th className="py-2 px-2 text-left">天盘</th>
                                        <th className="py-2 px-2 text-left">天将</th>
                                        <th className="py-2 px-2 text-left">遁干</th>
                                        <th className="py-2 px-2 text-left">长生</th>
                                        <th className="py-2 px-2 text-left">五行</th>
                                        <th className="py-2 px-2 text-left">旺衰</th>
                                        <th className="py-2 px-2 text-left">建除</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {gongInfos.map((gong, index) => (
                                        <tr key={`${gong.diZhi}-${index}`} className="border-t border-border/30">
                                            <td className="py-2 px-2">{gong.diZhi}</td>
                                            <td className="py-2 px-2">{gong.tianZhi}</td>
                                            <td className="py-2 px-2">{gong.tianJiang}</td>
                                            <td className="py-2 px-2">{gong.dunGan || '-'}</td>
                                            <td className="py-2 px-2">{gong.changSheng || '-'}</td>
                                            <td className="py-2 px-2">{gong.wuXing || '-'}</td>
                                            <td className={`py-2 px-2 ${gong.wangShuai ? WANG_SHUAI_COLORS[gong.wangShuai] || '' : ''}`}>{gong.wangShuai}</td>
                                            <td className="py-2 px-2">{gong.jianChu || '-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-xs text-foreground-secondary">包含遁干、建除、五行旺衰等完整十二宫数据。</div>
                    )}
                </div>

                {/* AI 解读 */}
                <div className="bg-background-secondary/50 rounded-xl p-4 border border-border/30">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <Brain className="w-4 h-4 text-cyan-500" />
                            AI 解读
                        </h3>
                        <ModelSelector
                            selectedModel={modelId}
                            onModelChange={setModelId}
                            reasoningEnabled={reasoningEnabled}
                            onReasoningChange={setReasoningEnabled}
                            userId={userId}
                            membershipType={membershipType}
                        />
                    </div>

                    {error && (
                        <p data-testid="analysis-error" className="text-red-500 text-sm mb-4">
                            {error}
                        </p>
                    )}

                    {streaming.reasoning && !streaming.content && (
                        <div className="mb-4">
                            <ThinkingBlock
                                content={streaming.reasoning}
                                isStreaming={streaming.isStreaming}
                                startTime={streaming.reasoningStartTime}
                                duration={streaming.reasoningDuration}
                            />
                        </div>
                    )}

                    {!streaming.isStreaming && interpretationReasoning && (
                        <div className="mb-4">
                            <ThinkingBlock
                                content={interpretationReasoning}
                                duration={streaming.reasoningDuration}
                            />
                        </div>
                    )}

                    {streaming.content ? (
                        <MarkdownContent content={streaming.content} />
                    ) : interpretation ? (
                        <MarkdownContent content={interpretation} />
                    ) : (
                        <div className="text-sm text-foreground-secondary text-center py-4">
                            点击下方按钮获取 AI 解读
                        </div>
                    )}

                    {!streaming.isStreaming && (
                        <button
                            onClick={handleInterpret}
                            className="w-full mt-3 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
                        >
                            <BookOpen className="w-4 h-4" />
                            {streaming.content || interpretation ? '重新解读' : '开始 AI 解读'}
                        </button>
                    )}

                    {streaming.isStreaming && (
                        <div className="flex items-center justify-center gap-2 mt-3 text-sm text-foreground-secondary">
                            <SoundWaveLoader variant="inline" />
                            正在解读中...
                        </div>
                    )}
                </div>
            </div>

            <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
            <CreditsModal isOpen={showCreditsModal} onClose={() => setShowCreditsModal(false)} />
        </div>
    );
}
