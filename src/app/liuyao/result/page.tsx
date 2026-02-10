/**
 * 六爻解卦结果页面
 *
 * 显示卦象和 AI 解读，包含传统六爻分析
 */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, RotateCw, AlertCircle, Loader2, BookOpen, RefreshCw, Copy, Check, BookOpenText, X, Album } from 'lucide-react';
import { HexagramDisplay } from '@/components/liuyao/HexagramDisplay';
import { TraditionalAnalysis } from '@/components/liuyao/TraditionalAnalysis';
import { YongShenTargetPicker } from '@/components/liuyao/YongShenTargetPicker';
import { MarkdownContent } from '@/components/ui/MarkdownContent';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { ThinkingBlock } from '@/components/chat/ThinkingBlock';
import {
    type DivinationResult,
    type Hexagram,
    type Yao,
    type LiuQin,
    type LiuYaoFullAnalysis,
    performFullAnalysis,
    yaosTpCode,
    WANG_SHUAI_LABELS,
    KONG_WANG_LABELS,
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
import { CreditsModal } from '@/components/ui/CreditsModal';
import { useStreamingResponse, isCreditsError } from '@/lib/useStreamingResponse';
import { LIU_QIN_TIPS, SHEN_XI_TIPS, TERM_TIPS } from '@/lib/liuyao-term-tips';

const LIU_QIN_VALUES: LiuQin[] = ['父母', '兄弟', '子孙', '妻财', '官鬼'];

function normalizeYongShenTargets(value: unknown): LiuQin[] {
    if (!Array.isArray(value)) return [];
    const unique = new Set<LiuQin>();
    for (const item of value) {
        if (typeof item === 'string' && LIU_QIN_VALUES.includes(item as LiuQin)) {
            unique.add(item as LiuQin);
        }
    }
    return Array.from(unique);
}

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
    const effectiveYongShenTargets = useMemo(() => {
        if (result?.yongShenTargets?.length) return result.yongShenTargets;
        return [];
    }, [result?.yongShenTargets]);
    const requiresYongShenTargets = Boolean(result?.question?.trim());
    const missingYongShenTargets = requiresYongShenTargets && !result?.yongShenTargets?.length;
    const hasEffectiveTargets = !requiresYongShenTargets || effectiveYongShenTargets.length > 0;

    // 计算传统分析数据（使用起卦日期执行完整分析）
    const traditionalData = useMemo((): (LiuYaoFullAnalysis & {
        hexagramText?: ReturnType<typeof getHexagramText>;
        changedHexagramText?: ReturnType<typeof getHexagramText>;
        dayStem: string;
    }) | null => {
        if (!result || !hasEffectiveTargets) return null;

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
            { yongShenTargets: effectiveYongShenTargets }
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
    }, [effectiveYongShenTargets, hasEffectiveTargets, result]);

    // 生成可复制的六爻分析文本（与 AI 分析格式一致）
    const generateCopyText = () => {
        if (!result || !traditionalData) return '';

        const { hexagram, changedHexagram, question } = result;
        const {
            ganZhiTime,
            kongWang,
            kongWangByPillar,
            fullYaos,
            yongShen,
            fuShen,
            shenSystemByYongShen,
            timeRecommendations,
            hexagramText,
            globalShenSha,
        } = traditionalData;
        const yaoNames = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];
        const changedLines = fullYaos.filter(y => y.isChanging).map(y => y.position);
        const yongShenMarkers = new Set(
            yongShen
                .map(group => {
                    const { position, liuQin } = group.selected;
                    if (typeof position !== 'number' || typeof liuQin !== 'string') {
                        return null;
                    }
                    return `${position}:${liuQin}`;
                })
                .filter((value): value is string => Boolean(value))
        );

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
        if (kongWangByPillar) {
            lines.push(`年旬空：${kongWangByPillar.year.xun}，空亡地支：${kongWangByPillar.year.kongDizhi.join('、')}`);
            lines.push(`月旬空：${kongWangByPillar.month.xun}，空亡地支：${kongWangByPillar.month.kongDizhi.join('、')}`);
            lines.push(`日旬空：${kongWangByPillar.day.xun}，空亡地支：${kongWangByPillar.day.kongDizhi.join('、')}`);
            lines.push(`时旬空：${kongWangByPillar.hour.xun}，空亡地支：${kongWangByPillar.hour.kongDizhi.join('、')}`);
        } else {
            lines.push(`日旬空：${kongWang.xun}，空亡地支：${kongWang.kongDizhi.join('、')}`);
        }
        lines.push(`世爻：第${shiYing.shi}爻 | 应爻：第${shiYing.ying}爻`);

        // 六爻排盘
        lines.push('');
        lines.push('【六爻排盘】');
        fullYaos.forEach((y) => {
            const shiYingMark = y.isShiYao ? '【世】' : y.isYingYao ? '【应】' : '';
            const yongShenMark = yongShenMarkers.has(`${y.position}:${y.liuQin}`) ? '【用神】' : '';
            const changeMark = y.isChanging ? '（动）' : '';
            const statusParts = [
                WANG_SHUAI_LABELS[y.strength.wangShuai],
                y.kongWangState !== 'not_kong' ? KONG_WANG_LABELS[y.kongWangState] : '',
                y.movementLabel,
                y.changSheng?.stage,
                y.changedYao?.relation,
            ].filter(Boolean);
            const shenShaMark = y.shenSha.length > 0 ? ` 神煞:${y.shenSha.join('、')}` : '';
            lines.push(`${yaoNames[y.position - 1]}：${y.liuQin} ${y.liuShen} ${y.naJia}${y.wuXing} ${shiYingMark}${yongShenMark}${changeMark} [${statusParts.join('·')}] ${y.influence.description}${shenShaMark}`);
        });

        // 用神分析
        lines.push('');
        lines.push('【用神分析】');
        yongShen.forEach((group) => {
            lines.push(`目标：${group.targetLiuQin}（来源：手动指定）`);
            const main = group.selected;
            lines.push(`主用神：${main.liuQin}${main.position ? `（第${main.position}爻）` : ''} ${main.element} | ${main.strengthLabel} | ${main.movementLabel}`);
            if (main.factors.length > 0) {
                lines.push(`依据：${main.factors.join('、')}`);
            }
            if (group.candidates.length > 0) {
                lines.push(`候选（按参考优先级）：${group.candidates.map(c => `${c.liuQin}${c.position ? `@${yaoNames[c.position - 1]}` : ''}`).join('；')}`);
                if (group.candidates.length > 1) {
                    lines.push('说明：候选顺序越靠后，参考度越低。');
                }
            }
            const system = shenSystemByYongShen.find(item => item.targetLiuQin === group.targetLiuQin);
            if (system?.yuanShen) {
                lines.push(`原神：${system.yuanShen.liuQin}（${system.yuanShen.wuXing}）`);
            }
            if (system?.jiShen) {
                lines.push(`忌神：${system.jiShen.liuQin}（${system.jiShen.wuXing}）`);
            }
            if (system?.chouShen) {
                lines.push(`仇神：${system.chouShen.liuQin}（${system.chouShen.wuXing}）`);
            }
            const targetRecs = timeRecommendations.filter(item => item.targetLiuQin === group.targetLiuQin);
            if (targetRecs.length > 0) {
                lines.push(`应期：${targetRecs.map(rec => `${rec.startDate}~${rec.endDate}(${rec.confidence})`).join('；')}`);
            }
            lines.push('');
        });

        // 伏神
        if (fuShen && fuShen.length > 0) {
            lines.push('');
            lines.push('伏神分析：');
            fuShen.forEach(fs => {
                lines.push(`- ${fs.liuQin}伏于${yaoNames[fs.feiShenPosition - 1]}（${fs.feiShenLiuQin}）下，纳甲${fs.naJia}${fs.wuXing}，${fs.availabilityReason}`);
            });
        }

        if (globalShenSha.length > 0) {
            lines.push('');
            lines.push(`【全局神煞】${globalShenSha.join('、')}`);
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
                lines.push(`${typeLabel}（${r.targetLiuQin} ${r.startDate}~${r.endDate} 参考度${r.confidence}）：${r.description}`);
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
            yongShenTargets?: LiuQin[];
            divinationId?: string | null;
            conversationId?: string | null;
        }>('liuyao_result');
        if (parsed) {
            try {
                const normalizedTargets = normalizeYongShenTargets(parsed.yongShenTargets);
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
        items.push({
            id: 'terms',
            label: '术语参考',
            icon: <Album className="w-4 h-4" />,
            onClick: () => setShowTermsModal(true),
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
        if (!result || !user) return;
        if (requiresYongShenTargets && !hasEffectiveTargets) {
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
                    yongShenTargets: effectiveYongShenTargets,
                    hexagram: result.hexagram,
                    changedHexagram: result.changedHexagram,
                    changedLines: result.changedLines,
                    yaos: result.yaos,
                    dayStem: traditionalData.dayStem,
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
                        <Loader2 className="w-12 h-12 animate-spin text-accent relative z-10" />
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
                                const line = traditionalData.fullYaos.find(y => y.position === group.selected.position);
                                if (!line) return [];
                                return line.liuQin === group.selected.liuQin ? [group.selected.position] : [];
                            })}
                    />
                </div>

                {/* Traditional Analysis */}
                {showTraditional && traditionalData && (
                    <div className="mb-4 animate-fade-in-up">
                        <TraditionalAnalysis
                            fullYaos={traditionalData.fullYaos}
                            yongShen={traditionalData.yongShen}
                            shenSystemByYongShen={traditionalData.shenSystemByYongShen}
                            globalShenSha={traditionalData.globalShenSha}
                            timeRecommendations={traditionalData.timeRecommendations}
                            hexagramText={traditionalData.hexagramText}
                            changedHexagramText={traditionalData.changedHexagramText}
                            changedLines={result.changedLines}
                            ganZhiTime={traditionalData.ganZhiTime}
                            kongWang={traditionalData.kongWang}
                            kongWangByPillar={traditionalData.kongWangByPillar}
                            fuShen={traditionalData.fuShen}
                            warnings={traditionalData.warnings}
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
                                    <Loader2 className="w-4 h-4 animate-spin" />
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
                                    disabled={isLoading || (requiresYongShenTargets && !hasEffectiveTargets)}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-bold shadow-lg shadow-purple-600/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    {requiresYongShenTargets && !hasEffectiveTargets ? '请先选择分析目标' : '获取 AI 深度解读'}
                                </button>
                            )}
                        </div>
                    )}
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
