/**
 * 大六壬排盘结果页
 * 需要 useState + sessionStorage + 流式 AI
 */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Brain, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { readSessionJSON } from '@/lib/cache';
import { TianDiPanGrid } from '@/components/daliuren/TianDiPanGrid';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { MarkdownContent } from '@/components/ui/MarkdownContent';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import { useStreamingResponse } from '@/lib/hooks/useStreamingResponse';
import { AuthModal } from '@/components/auth/AuthModal';
import { CreditsModal } from '@/components/ui/CreditsModal';
import { extractAnalysisFromConversation } from '@/lib/ai/ai-analysis-query';
import type { ChatMessage } from '@/types';
import type { DaliurenOutput } from '@mingai/mcp-core/daliuren';
import { supabase } from '@/lib/auth';
import { loadConversation } from '@/lib/chat/conversation';

const SHENSHA_DISPLAY = [
    '日德', '日禄', '生气', '桃花', '天喜', '天医', '成神',
    '丧门', '吊客', '病符', '月破', '破碎', '死气', '血忌',
    '驿马', '天马', '月德', '天德',
];

const SANCHUAN_COLORS = ['border-red-400/50', 'border-orange-400/50', 'border-yellow-400/50'] as const;

export default function DaliurenResultPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [result, setResult] = useState<DaliurenOutput | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [modelId, setModelId] = useState<string | undefined>();
    const [showShensha, setShowShensha] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showCreditsModal, setShowCreditsModal] = useState(false);
    const [divinationId, setDivinationId] = useState<string | undefined>();
    const [conversationId, setConversationId] = useState<string | undefined>();
    const [interpretation, setInterpretation] = useState<string | null>(null);

    const streaming = useStreamingResponse();

    useEffect(() => {
        const params = readSessionJSON('daliuren_params') as Record<string, unknown> | null;
        if (!params?.date) {
            router.replace('/daliuren');
            return;
        }
        const nextDivinationId = typeof params.divinationId === 'string' ? params.divinationId : undefined;
        const nextConversationId = typeof params.conversationId === 'string' ? params.conversationId : undefined;
        const controller = new AbortController();
        fetch('/api/daliuren', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'calculate', ...params }),
            signal: controller.signal,
        })
            .then(r => r.json())
            .then(({ data }: { data: DaliurenOutput }) => {
                if (nextDivinationId) setDivinationId(nextDivinationId);
                if (nextConversationId) setConversationId(nextConversationId);
                if (data) setResult(data);
                else showToast('error', '排盘失败');
                setIsLoading(false);
            })
            .catch(err => {
                if (err.name !== 'AbortError') {
                    showToast('error', '网络错误');
                    setIsLoading(false);
                }
            });
        return () => controller.abort();
    }, [router, showToast]);

    useEffect(() => {
        if (!conversationId || interpretation || streaming.content) return;

        let cancelled = false;

        const loadSavedAnalysis = async () => {
            const conversation = await loadConversation(conversationId);
            if (cancelled || !conversation) return;

            const messages = (conversation.messages as ChatMessage[]) || [];
            const sourceData = (conversation.sourceData || undefined) as Record<string, unknown> | undefined;
            const { analysis } = extractAnalysisFromConversation(messages, sourceData);
            if (analysis) {
                setInterpretation(analysis);
            }
        };

        void loadSavedAnalysis();

        return () => {
            cancelled = true;
        };
    }, [conversationId, interpretation, streaming.content]);

    const filteredShensha = useMemo(() => {
        if (!result) return [];
        return result.shenSha.filter(s => SHENSHA_DISPLAY.includes(s.name));
    }, [result]);

    const handleInterpret = async () => {
        if (!result) return;
        const params = readSessionJSON('daliuren_params') as Record<string, unknown> | null;
        setInterpretation(null);

        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token;
        if (!token) { setShowAuthModal(true); return; }

        let currentDivinationId = divinationId;
        if (!currentDivinationId) {
            const saveRes = await fetch('/api/daliuren', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ action: 'save', ...params, resultData: result }),
            }).then(r => r.json()).catch(() => null) as { data?: { divinationId?: string } } | null;
            if (saveRes?.data?.divinationId) {
                currentDivinationId = saveRes.data.divinationId;
                setDivinationId(currentDivinationId);
            }
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
            }),
        });

        const err = streamResult?.error;
        if (err) {
            if (err.includes('积分')) setShowCreditsModal(true);
            else if (err.includes('401') || err.includes('认证')) setShowAuthModal(true);
        }
    };

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

    const { dateInfo, siKe, sanChuan, keTi, keName } = result;

    return (
        <div className="min-h-screen bg-background pb-20">
            {/* 头部 */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border/50 px-4 py-3">
                <div className="max-w-lg mx-auto flex items-center justify-between">
                    <button onClick={() => router.back()} className="text-foreground-secondary hover:text-foreground">
                        <RotateCcw className="w-5 h-5" />
                    </button>
                    <div className="text-center">
                        <div className="text-sm font-bold text-foreground">{keName}</div>
                        <div className="text-xs text-cyan-500">
                            {keTi.subTypes.join('·')}{keTi.extraTypes.length > 0 ? '·' + keTi.extraTypes.join('·') : ''}
                        </div>
                    </div>
                    <div className="w-5" />
                </div>
            </div>

            <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
                {/* 基础信息 */}
                <div className="bg-background-secondary/50 rounded-xl p-4 border border-border/30">
                    <div className="text-xs text-foreground-secondary mb-2">{dateInfo.solarDate}</div>
                    <div className="text-sm font-mono text-foreground mb-2">{dateInfo.bazi}</div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground-secondary">
                        <span>月将：{dateInfo.yueJiang}（{dateInfo.yueJiangName}）</span>
                        <span>旬空：{dateInfo.kongWang.join('')}</span>
                        <span>驿马：{dateInfo.yiMa} · 天马：{dateInfo.tianMa}</span>
                        <span>{dateInfo.diurnal ? '昼' : '夜'}占</span>
                    </div>
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
                            const data = [sanChuan.chu, sanChuan.zhong, sanChuan.mo][i];
                            return (
                                <div key={label} className={`flex flex-col items-center p-2 rounded-lg border ${SANCHUAN_COLORS[i]} bg-background`}>
                                    <div className="text-xs text-foreground-secondary">{label}</div>
                                    <div className="text-lg font-bold text-foreground">{data[0]}</div>
                                    <div className="text-xs text-foreground-secondary">{data[1]}</div>
                                    <div className="text-xs text-cyan-500">{data[2]}</div>
                                    {data[3] && <div className="text-xs text-foreground-tertiary">{data[3]}</div>}
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
                            const data: string[] = {
                                '一课': siKe.yiKe,
                                '二课': siKe.erKe,
                                '三课': siKe.sanKe,
                                '四课': siKe.siKe,
                            }[label];
                            return (
                                <div key={label} className="flex flex-col items-center p-2 rounded-lg bg-background border border-border/20">
                                    <div className="text-xs text-cyan-400">{data[1]}</div>
                                    <div className="text-sm font-bold">{data[0]?.slice(0, 1)}</div>
                                    <div className="text-xs text-foreground-secondary">{data[0]?.slice(1)}</div>
                                    <div className="text-xs text-foreground-tertiary">{label}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* 天地盘 */}
                <div className="bg-background-secondary/50 rounded-xl p-4 border border-border/30">
                    <h3 className="text-sm font-bold text-foreground mb-3">天地盘</h3>
                    <TianDiPanGrid result={result} />
                </div>

                {/* AI 解读 */}
                <div className="bg-background-secondary/50 rounded-xl p-4 border border-border/30">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                            <Brain className="w-4 h-4 text-cyan-500" />
                            AI 解读
                        </h3>
                        <ModelSelector selectedModel={modelId} onModelChange={setModelId} />
                    </div>

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
