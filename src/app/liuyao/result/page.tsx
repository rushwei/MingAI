/**
 * 六爻解卦结果页面
 *
 * 显示卦象和 AI 解读，包含传统六爻分析
 */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, RotateCw, AlertCircle, Loader2, BookOpen, RefreshCw, Copy, Check, BookOpenText } from 'lucide-react';
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
    type FullYaoInfoExtended,
    performFullAnalysis,
    yaosTpCode,
    getLiuQinMeaning,
    WANG_SHUAI_LABELS,
    KONG_WANG_LABELS,
    HUA_TYPE_LABELS,
    SPECIAL_STATUS_LABELS,
} from '@/lib/liuyao';
import { getHexagramText } from '@/lib/hexagram-texts';
import { getShiYingPosition, findPalace } from '@/lib/eight-palaces';
import { supabase } from '@/lib/supabase';
import { DEFAULT_MODEL_ID } from '@/lib/ai-config';
import { getMembershipInfo, type MembershipType } from '@/lib/membership';
import { readSessionJSON, updateSessionJSON } from '@/lib/cache';
import { extractAnalysisFromConversation } from '@/lib/ai-analysis-query';
import type { ChatMessage } from '@/types';
import { AuthModal } from '@/components/auth/AuthModal';
import { AddToKnowledgeBaseModal } from '@/components/knowledge-base/AddToKnowledgeBaseModal';
import { useHeaderMenu } from '@/components/layout/HeaderMenuContext';

export default function ResultPage() {
    const router = useRouter();
    const { setMenuItems, clearMenuItems } = useHeaderMenu();
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
    // 流式输出状态
    const [isStreaming, setIsStreaming] = useState(false);
    const [reasoningStartTime, setReasoningStartTime] = useState<number | undefined>(undefined);
    const [reasoningDuration, setReasoningDuration] = useState<number | undefined>(undefined);
    const [copied, setCopied] = useState(false);
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

    // 生成可复制的六爻分析文本（与 AI 分析格式一致）
    const generateCopyText = () => {
        if (!result || !traditionalData) return '';

        const { hexagram, changedHexagram, changedLines, question } = result;
        const { ganZhiTime, kongWang, fullYaos, yongShen, fuShen, shenSystem, timeRecommendations, hexagramText } = traditionalData;
        const yaoNames = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

        // 获取卦码和世应宫位
        const hexagramCode = yaosTpCode(result.yaos);
        const shiYing = getShiYingPosition(hexagramCode);
        const palace = findPalace(hexagramCode);

        const lines: string[] = [];

        // 问题
        if (question) {
            lines.push(`【求卦问题】${question}`);
            lines.push('');
        }

        // 卦象信息
        lines.push('【卦象信息】');
        lines.push(`本卦：${hexagram.name}`);
        lines.push(`上卦：${hexagram.upperTrigram}（${hexagram.nature}）`);
        lines.push(`下卦：${hexagram.lowerTrigram}`);
        lines.push(`五行：${hexagram.element}`);
        lines.push(`宫位：${palace?.name || '未知'}（${palace?.element || ''}）`);
        if (changedHexagram && changedLines.length > 0) {
            lines.push(`变卦：${changedHexagram.name}（${changedHexagram.upperTrigram}/${changedHexagram.lowerTrigram}）`);
            lines.push(`变爻：${changedLines.map(l => yaoNames[l - 1]).join('、')}`);
        } else {
            lines.push('无变爻');
        }

        // 起卦时间
        lines.push('');
        lines.push('【起卦时间】');
        lines.push(`${ganZhiTime.year.gan}${ganZhiTime.year.zhi}年 ${ganZhiTime.month.gan}${ganZhiTime.month.zhi}月 ${ganZhiTime.day.gan}${ganZhiTime.day.zhi}日 ${ganZhiTime.hour.gan}${ganZhiTime.hour.zhi}时`);
        lines.push(`旬空：${kongWang.xun}，空亡地支：${kongWang.kongDizhi.join('、')}`);
        lines.push(`世爻：第${shiYing.shi}爻 | 应爻：第${shiYing.ying}爻`);

        // 六爻排盘
        lines.push('');
        lines.push('【六爻排盘】');
        fullYaos.forEach((y) => {
            const extYao = y as FullYaoInfoExtended;
            const shiYingMark = y.isShiYao ? '【世】' : y.isYingYao ? '【应】' : '';
            const yongShenMark = y.position === yongShen.position ? '【用神】' : '';
            const changeMark = y.change === 'changing' ? '（动）' : '';
            const wangShuaiMark = WANG_SHUAI_LABELS[extYao.strength.wangShuai];
            const kongMark = extYao.kongWangState !== 'not_kong' ? KONG_WANG_LABELS[extYao.kongWangState] : '';
            const huaMark = extYao.changeAnalysis && extYao.changeAnalysis.huaType !== 'none'
                ? HUA_TYPE_LABELS[extYao.changeAnalysis.huaType]
                : '';
            const specialMark = extYao.strength.specialStatus !== 'none'
                ? SPECIAL_STATUS_LABELS[extYao.strength.specialStatus]
                : '';
            const changShengMark = extYao.changSheng ? `${extYao.changSheng.stage}` : '';
            const statusParts = [wangShuaiMark, kongMark, huaMark, specialMark, changShengMark].filter(Boolean);
            lines.push(`${yaoNames[y.position - 1]}：${y.liuQin} ${y.liuShen} ${y.naJia}${y.wuXing} ${shiYingMark}${yongShenMark}${changeMark} [${statusParts.join('·')}] ${extYao.influence.description}`);
        });

        // 用神分析
        lines.push('');
        lines.push('【用神分析】');
        lines.push(`用神：${yongShen.type}（${getLiuQinMeaning(yongShen.type)}）`);
        lines.push(`位置：第${yongShen.position}爻 | 五行：${yongShen.element} | 状态：${yongShen.strength === 'strong' ? '旺相' : yongShen.strength === 'moderate' ? '平和' : '衰弱'}`);
        if (yongShen.analysis) {
            lines.push(yongShen.analysis);
        }

        // 伏神
        if (fuShen && fuShen.length > 0) {
            lines.push('');
            lines.push(`伏神分析（用神${yongShen.type}不上卦）：`);
            fuShen.forEach(fs => {
                lines.push(`- ${fs.liuQin}伏于${yaoNames[fs.feiShenPosition - 1]}（${fs.feiShenLiuQin}）下，纳甲${fs.naJia}${fs.wuXing}，${fs.availabilityReason}`);
            });
        }

        // 神系
        if (shenSystem) {
            lines.push('');
            lines.push('神系分析：');
            if (shenSystem.yuanShen) {
                const pos = shenSystem.yuanShen.positions.length > 0 ? `在${shenSystem.yuanShen.positions.map(p => yaoNames[p - 1]).join('、')}` : '不上卦';
                lines.push(`原神（生用神）：${shenSystem.yuanShen.liuQin}（${shenSystem.yuanShen.wuXing}）${pos}`);
            }
            if (shenSystem.jiShen) {
                const pos = shenSystem.jiShen.positions.length > 0 ? `在${shenSystem.jiShen.positions.map(p => yaoNames[p - 1]).join('、')}` : '不上卦';
                lines.push(`忌神（克用神）：${shenSystem.jiShen.liuQin}（${shenSystem.jiShen.wuXing}）${pos}`);
            }
            if (shenSystem.chouShen) {
                const pos = shenSystem.chouShen.positions.length > 0 ? `在${shenSystem.chouShen.positions.map(p => yaoNames[p - 1]).join('、')}` : '不上卦';
                lines.push(`仇神（克原神）：${shenSystem.chouShen.liuQin}（${shenSystem.chouShen.wuXing}）${pos}`);
            }
        }

        // 卦辞
        if (hexagramText) {
            lines.push('');
            lines.push('【卦辞象辞】');
            lines.push(`卦辞：${hexagramText.gua}`);
            lines.push(`象辞：${hexagramText.xiang}`);
        }

        // 时间建议
        if (timeRecommendations.length > 0) {
            lines.push('');
            lines.push('【应期参考】');
            timeRecommendations.forEach(r => {
                const typeLabel = r.type === 'favorable' ? '利' : r.type === 'unfavorable' ? '忌' : '要';
                lines.push(`${typeLabel}（${r.timeframe}）：${r.description}`);
            });
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
            divinationId?: string | null;
            conversationId?: string | null;
        }>('liuyao_result');
        if (parsed) {
            try {
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

    // 设置移动端 Header 菜单项
    useEffect(() => {
        const items = [];
        items.push({
            id: 'restart',
            label: '重新起卦',
            icon: <RotateCw className="w-4 h-4" />,
            onClick: () => router.push('/liuyao'),
        });
        if (divinationId) {
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
        setMenuItems(items);
        return () => clearMenuItems();
    }, [divinationId, showTraditional, router, setMenuItems, clearMenuItems]);

    useEffect(() => {
        if (!result || interpretation) return;

        const persistConversationId = (id: string | null) => {
            if (!id) return;
            updateSessionJSON('liuyao_result', (prev) => ({
                ...(prev || {}),
                conversationId: id,
            }));
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
        setIsStreaming(true);
        setError(null);
        setInterpretationReasoning(null);
        setInterpretation(null);
        setReasoningStartTime(undefined);
        setReasoningDuration(undefined);

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
                    dayStem: traditionalData.dayStem,
                    divinationId: divinationId,
                    modelId: selectedModel,
                    reasoning: reasoningEnabled,
                    stream: true,  // 启用流式输出
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || '解读失败');
            }

            // 处理流式响应
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let accumulatedContent = '';
            let accumulatedReasoning = '';
            let streamReasoningStartTime: number | undefined = undefined;
            let buffer = '';

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() ?? '';

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') continue;

                            try {
                                const parsed = JSON.parse(data);
                                const delta = parsed.choices?.[0]?.delta;

                                // 处理推理内容
                                const reasoningContent = delta?.reasoning_content;
                                if (reasoningContent) {
                                    if (!accumulatedReasoning && !streamReasoningStartTime) {
                                        streamReasoningStartTime = Date.now();
                                        setReasoningStartTime(streamReasoningStartTime);
                                    }
                                    accumulatedReasoning += reasoningContent;
                                    setInterpretationReasoning(accumulatedReasoning);
                                }

                                // 处理正常内容
                                const content = delta?.content;
                                if (content) {
                                    accumulatedContent += content;
                                    setInterpretation(accumulatedContent);
                                }
                            } catch {
                                // 跳过解析错误
                            }
                        }
                    }
                }
            }

            // 流式结束，计算推理用时
            if (streamReasoningStartTime) {
                setReasoningDuration(Math.floor((Date.now() - streamReasoningStartTime) / 1000));
            }
            setIsStreaming(false);

            // 设置最终内容
            if (!accumulatedContent) {
                setInterpretation('解读失败，请重试');
            }

            // TODO: 流式模式下保存到数据库需要后端支持，目前先留待后续实现

        } catch (err) {
            setError(err instanceof Error ? err.message : '解读失败');
            setIsStreaming(false);
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
        <div className="min-h-screen bg-background pb-8 relative overflow-x-hidden">
            <div className="max-w-3xl mx-auto px-4 py-4 relative z-10 animate-fade-in">
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
                        {!!divinationId && (
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
                        yongShenPosition={traditionalData?.yongShen.position}
                    />
                </div>

                {/* Traditional Analysis */}
                {showTraditional && traditionalData && (
                    <div className="mb-4 animate-fade-in-up">
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
                <div className="relative rounded-xl p-px">
                    <div className="relative bg-background/80 backdrop-blur-xl rounded-xl p-2 md:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 relative z-20">
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
                                        <ThinkingBlock
                                            content={interpretationReasoning}
                                            isStreaming={isStreaming && !interpretation}
                                            startTime={reasoningStartTime}
                                            duration={reasoningDuration}
                                        />
                                    )}
                                    <MarkdownContent content={interpretation} className="text-sm text-foreground" />
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-4 relative z-10">
                                {errorBanner}

                                {user === null ? (
                                    <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/5 rounded-xl p-6 text-center max-w-sm mx-auto backdrop-blur-sm">
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
                                        disabled={isLoading}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold shadow-lg shadow-purple-600/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                    >
                                        {isLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                正在解读天机...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4" />
                                                获取 AI 深度解读
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
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
