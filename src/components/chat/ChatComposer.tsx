/**
 * 消息输入框组件
 *
 * 'use client' 标记说明：
 * - 使用 React hooks (useState, useEffect, useRef, useCallback, useMemo)
 * - 有文本输入、@mention、附件上传等交互功能
 */
'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { Paperclip, Orbit, X, Sparkles, Square, Plus, FileText, ArrowUp, BookOpenText, AtSign, Globe, Settings, Check, Moon, Loader2 } from 'lucide-react';
import type { SelectedCharts } from './BaziChartSelector';
import type { AttachmentState, Mention, MentionType, PromptLayerDiagnostic } from '@/types';
import { DEFAULT_MODEL_ID } from '@/lib/ai-config';
import type { MembershipType } from '@/lib/membership';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { useToast } from '@/components/ui/Toast';
import { MentionPopover } from './MentionPopover';
import { buildMentionHighlightedParts } from './mentionHighlight';
import { mentionStyleMap, mentionTypeLabels } from './mentionStyles';
import { supabase } from '@/lib/supabase';
import { readLocalCache, writeLocalCache } from '@/lib/cache';
import { shouldRequestChatPreview } from '@/lib/chat-preview';
import { buildMentionToken, extractMentionTokens, filterMentionsByTokens, removeMentionsByTokens, type MentionToken } from '@/lib/mention-tokens';

type DataSourceSummary = {
    id: string;
    type: MentionType;
    name: string;
    preview: string;
    createdAt: string;
};

type DataSourceLoadError = { type: MentionType; message: string };

type KnowledgeBaseSummary = {
    id: string;
    name: string;
    description: string | null;
};

const findLastAtOutsideTokens = (value: string, tokens: MentionToken[]): number => {
    for (let i = value.length - 1; i >= 0; i -= 1) {
        if (value[i] !== '@') continue;
        const inToken = tokens.some(token => i >= token.start && i < token.end);
        if (!inToken) return i;
    }
    return -1;
};

interface ChatComposerProps {
    inputValue: string;
    isLoading: boolean;
    isSendingToList?: boolean;
    onInputChange: (value: string) => void;
    onSend: () => void;
    onStop?: () => void;
    disabled?: boolean;
    selectedCharts?: SelectedCharts;
    onSelectChart?: (type?: 'bazi' | 'ziwei') => void;
    onClearChart?: (type: 'bazi' | 'ziwei') => void;
    selectedModel?: string;
    onModelChange?: (modelId: string) => void;
    reasoningEnabled?: boolean;
    onReasoningChange?: (enabled: boolean) => void;
    userId?: string | null;
    membershipType?: MembershipType;
    // 附件和搜索相关
    attachmentState?: AttachmentState;
    onAttachmentChange?: (state: AttachmentState) => void;
    mentions?: Mention[];
    onMentionsChange?: (mentions: Mention[]) => void;
    promptKnowledgeBases?: KnowledgeBaseSummary[];
    contextMessages?: Array<{ content?: string }>;
    // 隐藏底部免责声明
    hideDisclaimer?: boolean;
    // 解梦模式
    dreamMode?: boolean;
    onDreamModeChange?: (enabled: boolean) => void;
    dreamContext?: { baziChartName?: string; dailyFortune?: string };
    dreamContextLoading?: boolean;
}

export function ChatComposer({
    inputValue,
    isLoading,
    isSendingToList = false,
    onInputChange,
    onSend,
    onStop,
    disabled = false,
    selectedCharts,
    onSelectChart,
    onClearChart,
    selectedModel = DEFAULT_MODEL_ID,
    onModelChange,
    reasoningEnabled = false,
    onReasoningChange,
    userId,
    membershipType = 'free',
    attachmentState,
    onAttachmentChange,
    mentions = [],
    onMentionsChange,
    promptKnowledgeBases = [],
    contextMessages = [],
    hideDisclaimer = false,
    dreamMode = false,
    onDreamModeChange,
    dreamContext,
    dreamContextLoading = false,
}: ChatComposerProps) {
    const hasBazi = selectedCharts?.bazi;
    const hasZiwei = selectedCharts?.ziwei;
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const previewRequestIdRef = useRef(0);
    const [menuOpen, setMenuOpen] = useState(false);
    const { showToast } = useToast();
    const [mentionOpen, setMentionOpen] = useState(false);
    const [mentionQuery, setMentionQuery] = useState('');
    const [mentionStartIndex, setMentionStartIndex] = useState<number | null>(null);
    const [mentionDataSources, setMentionDataSources] = useState<DataSourceSummary[]>([]);
    const [mentionKnowledgeBases, setMentionKnowledgeBases] = useState<KnowledgeBaseSummary[]>([]);
    const [mentionLoadError, setMentionLoadError] = useState<string | null>(null);
    const [mentionDataSourceErrors, setMentionDataSourceErrors] = useState<DataSourceLoadError[]>([]);
    const [mentionLoading, setMentionLoading] = useState(false);
    const [mentionDefaultCategory, setMentionDefaultCategory] = useState<'knowledge' | 'data' | null>(null);
    const [knowledgeBaseOpen, setKnowledgeBaseOpen] = useState(false);
    const [knowledgeBaseSavingId, setKnowledgeBaseSavingId] = useState<string | null>(null);
    const mentionCacheTtlMs = 10 * 60 * 1000;
    const [promptPreviewTokens, setPromptPreviewTokens] = useState(0);
    const [promptPreviewBudget, setPromptPreviewBudget] = useState(0);
    const [promptPreviewLoading, setPromptPreviewLoading] = useState(false);
    const [promptPreviewLayers, setPromptPreviewLayers] = useState<PromptLayerDiagnostic[]>([]);
    const [promptHistoryTokens, setPromptHistoryTokens] = useState(0);
    const [promptContextTotal, setPromptContextTotal] = useState(0);
    const [promptDiagnosticsOpen, setPromptDiagnosticsOpen] = useState(false);
    const [promptPreviewUserTokens, setPromptPreviewUserTokens] = useState(0);

    // 权限判断
    const canUseWeb = membershipType !== 'free';
    const canUseBoth = membershipType === 'pro';
    const canUseKnowledgeBase = membershipType !== 'free';
    const hasFile = !!attachmentState?.file;
    const hasWebSearch = !!attachmentState?.webSearchEnabled;
    // 始终使用预览 API 的数据（实时反映当前模型的提示词预算）
    const promptUsageProgress = promptPreviewBudget > 0
        ? Math.min(promptPreviewTokens / promptPreviewBudget, 1)
        : 0;
    const contextProgress = promptContextTotal > 0
        ? Math.min(promptHistoryTokens / promptContextTotal, 1)
        : 0;
    const promptProgressPercent = Math.round(promptUsageProgress * 100);
    const contextProgressPercent = Math.round(contextProgress * 100);
    // 始终使用预览 API 的 layers（AI 回复后的诊断数据已无实际意义）
    const hasPromptDiagnostics = !!(promptPreviewLayers.length && promptPreviewBudget);
    const displayLayers = promptPreviewLayers;
    const displayUserMessageTokens = promptPreviewUserTokens;
    const promptUsageLabel = `提示词 ${promptProgressPercent}%`;
    const previewMentions = useMemo(
        () => (canUseKnowledgeBase ? mentions : mentions.filter(m => m.type !== 'knowledge_base')),
        [canUseKnowledgeBase, mentions]
    );
    const canRequestPreview = shouldRequestChatPreview({
        userId,
        isLoading,
        isSendingToList,
    });
    const promptKbIdSet = useMemo(() => new Set(promptKnowledgeBases.map(kb => kb.id)), [promptKnowledgeBases]);
    const mentionMap = useMemo(() => new Map(mentions.map(mention => [mention.id, mention])), [mentions]);
    const kbNameMap = useMemo(() => new Map(promptKnowledgeBases.map(kb => [kb.id, kb.name])), [promptKnowledgeBases]);
    const formatLayerLabel = useCallback((layerId: string) => {
        if (layerId.startsWith('mention_')) {
            const mentionId = layerId.replace('mention_', '');
            const mention = mentionMap.get(mentionId);
            if (!mention) return '提及·数据';
            const typeLabel = mentionTypeLabels[mention.type] || mentionTypeLabels.default;
            return `提及·${typeLabel}${mention.name ? `·${mention.name}` : ''}`;
        }
        if (layerId.startsWith('kb_')) {
            const kbId = layerId.replace('kb_', '');
            const kbName = kbNameMap.get(kbId);
            return `知识库${kbName ? `·${kbName}` : ''}`;
        }
        if (layerId === 'chart_context') {
            const parts: string[] = [];
            if (selectedCharts?.bazi?.name) parts.push(`八字·${selectedCharts.bazi.name}`);
            if (selectedCharts?.ziwei?.name) parts.push(`紫微·${selectedCharts.ziwei.name}`);
            return parts.length > 0 ? `命盘·${parts.join(' / ')}` : '命盘';
        }
        if (layerId === 'base_rules') return '通用准则';
        if (layerId === 'personality_role') return '专业分析师';
        if (layerId === 'expression_style') return '表达风格';
        if (layerId === 'user_profile') return '用户画像';
        if (layerId === 'custom_instructions') return '自定义指令';
        if (layerId === 'mangpai_data') return '盲派口诀';
        if (layerId === 'dream_bazi') return '解梦·命盘信息';
        if (layerId === 'dream_fortune') return '解梦·今日运势';
        return layerId;
    }, [mentionMap, kbNameMap, selectedCharts]);

    useEffect(() => {
        if (!userId) {
            setPromptPreviewTokens(0);
            setPromptPreviewBudget(0);
            setPromptPreviewLayers([]);
            setPromptPreviewUserTokens(0);
            setPromptHistoryTokens(0);
            setPromptContextTotal(0);
            setPromptPreviewLoading(false);
            return;
        }
        if (!canRequestPreview) {
            setPromptPreviewLoading(false);
            return;
        }

        const requestId = previewRequestIdRef.current + 1;
        previewRequestIdRef.current = requestId;
        const abortController = new AbortController();

        const loadPreview = async () => {
            setPromptPreviewLoading(true);
            try {
                // 构建命盘 ID 参数
                const chartIds = (hasBazi || hasZiwei) ? {
                    baziId: hasBazi?.id,
                    ziweiId: hasZiwei?.id,
                    baziAnalysisMode: hasBazi?.analysisMode
                } : undefined;

                const resp = await fetch('/api/chat/preview', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: selectedModel,
                        reasoning: reasoningEnabled,
                        mentions: previewMentions,
                        messages: contextMessages,
                        chartIds,
                        dreamMode
                    }),
                    signal: abortController.signal
                });
                if (!resp.ok || previewRequestIdRef.current !== requestId) return;
                const data = await resp.json();
                if (previewRequestIdRef.current !== requestId) return;
                setPromptPreviewTokens(data.totalTokens || 0);
                setPromptPreviewBudget(data.budgetTotal || 0);
                setPromptPreviewLayers(data.diagnostics || []);
                setPromptPreviewUserTokens(data.userMessageTokens || 0);
                setPromptHistoryTokens(data.historyTokens || 0);
                setPromptContextTotal(data.contextTotal || 0);
            } catch (error) {
                if (error instanceof DOMException && error.name === 'AbortError') {
                    return;
                }
                console.warn('加载提示词预览失败:', error);
            } finally {
                if (previewRequestIdRef.current === requestId) {
                    setPromptPreviewLoading(false);
                }
            }
        };
        void loadPreview();

        return () => {
            abortController.abort();
        };
    }, [canRequestPreview, selectedModel, reasoningEnabled, userId, previewMentions, contextMessages, hasBazi, hasZiwei, dreamMode]);

    useEffect(() => {
        if (!hasPromptDiagnostics) {
            setPromptDiagnosticsOpen(false);
        }
    }, [hasPromptDiagnostics]);

    // 文件选择处理
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !onAttachmentChange) return;

        // plus会员：选择文件时自动关闭搜索，并提示
        if (!canUseBoth && attachmentState?.webSearchEnabled) {
            onAttachmentChange({ file, webSearchEnabled: false });
            showToast('info', '同时使用搜索和附件仅限 Pro 用户，已自动关闭搜索');
        } else {
            onAttachmentChange({ ...attachmentState, file, webSearchEnabled: attachmentState?.webSearchEnabled ?? false });
        }
        // 清空input以便重复选择同一文件
        e.target.value = '';
    };

    // 搜索切换处理
    const handleWebToggle = () => {
        if (!onAttachmentChange) return;

        // Free 用户提示
        if (!canUseWeb) {
            showToast('info', '网络搜索仅限 Plus 以上用户使用');
            return;
        }

        const newWebSearch = !attachmentState?.webSearchEnabled;
        // plus会员：启用搜索时自动清除文件，并提示
        if (!canUseBoth && attachmentState?.file && newWebSearch) {
            onAttachmentChange({ file: undefined, webSearchEnabled: true });
            showToast('info', '同时使用搜索和附件仅限 Pro 用户，已自动清除附件');
        } else {
            onAttachmentChange({
                file: attachmentState?.file,
                webSearchEnabled: newWebSearch
            });
        }
    };

    const handleKnowledgeBaseOpen = async () => {
        if (!canUseKnowledgeBase) {
            showToast('info', '知识库仅限 Plus 以上会员使用');
            return;
        }
        setKnowledgeBaseOpen(true);
        setMentionLoadError(null);
        setMenuOpen(false);
        textareaRef.current?.focus();
        await refreshMentionData(true);
    };

    const toggleKnowledgeBaseSearch = useCallback(async (kbId: string) => {
        if (!userId) return;
        if (membershipType === 'free') {
            showToast('info', '仅限 Plus 以上会员使用');
            return;
        }
        const nextPromptIds = promptKbIdSet.has(kbId)
            ? Array.from(promptKbIdSet).filter(id => id !== kbId)
            : Array.from(new Set([...promptKbIdSet, kbId]));
        setKnowledgeBaseSavingId(kbId);
        const { error } = await supabase
            .from('user_settings')
            .upsert({ user_id: userId, prompt_kb_ids: nextPromptIds }, { onConflict: 'user_id' });
        setKnowledgeBaseSavingId(null);
        if (error) {
            showToast('error', '保存知识库失败');
            return;
        }
        showToast('success', promptKbIdSet.has(kbId) ? '已关闭知识库搜索' : '已启用知识库搜索');
        window.dispatchEvent(new CustomEvent('mingai:knowledge-base:prompt-updated'));
    }, [membershipType, promptKbIdSet, showToast, userId]);

    // 自动调整 textarea 高度
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.style.height = 'auto';
        const newHeight = Math.min(Math.max(textarea.scrollHeight, 24), 236);
        textarea.style.height = `${newHeight}px`;
        if (overlayRef.current) {
            overlayRef.current.scrollTop = textarea.scrollTop;
        }
    }, [inputValue, mentions]);

    const readMentionCache = useCallback(<T,>(key: string): T | null => {
        return readLocalCache<T>(key, mentionCacheTtlMs);
    }, [mentionCacheTtlMs]);

    const writeMentionCache = useCallback(<T,>(key: string, value: T) => {
        writeLocalCache(key, value);
    }, []);

    const refreshMentionData = useCallback(async (fresh = false) => {
        if (!userId) return;
        const dataKey = `mingai.data_sources.${userId}.v1`;
        const kbKey = `mingai.knowledge_bases.${userId}.v1`;
        try {
            setMentionLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;

            const [dsResp, kbResp] = await Promise.all([
                fetch(`/api/data-sources?limit=50${fresh ? '&fresh=1' : ''}`, {
                    headers: accessToken ? { authorization: `Bearer ${accessToken}` } : undefined
                }),
                canUseKnowledgeBase
                    ? fetch('/api/knowledge-base', {
                        headers: accessToken ? { authorization: `Bearer ${accessToken}` } : undefined
                    })
                    : Promise.resolve(null)
            ]);

            setMentionLoadError(null);

            if (dsResp.ok) {
                const ds = await dsResp.json() as { items?: DataSourceSummary[]; errors?: DataSourceLoadError[] };
                const items = ds.items || [];
                const errors = ds.errors || [];
                setMentionDataSources(items);
                setMentionDataSourceErrors(errors);
                writeMentionCache(dataKey, { items, errors });
            } else {
                setMentionLoadError('数据加载失败');
            }

            if (kbResp && kbResp.ok) {
                const kb = await kbResp.json() as { knowledgeBases?: KnowledgeBaseSummary[] };
                const list = kb.knowledgeBases || [];
                setMentionKnowledgeBases(list);
                writeMentionCache(kbKey, list);
            } else if (kbResp) {
                setMentionLoadError('数据加载失败');
            } else {
                setMentionKnowledgeBases([]);
            }
        } catch {
            setMentionLoadError('数据加载失败');
        } finally {
            setMentionLoading(false);
        }
    }, [canUseKnowledgeBase, userId, writeMentionCache]);

    useEffect(() => {
        if (!userId) return;

        const dataKey = `mingai.data_sources.${userId}.v1`;
        const kbKey = `mingai.knowledge_bases.${userId}.v1`;

        const cachedDs = readMentionCache<{ items: DataSourceSummary[]; errors?: DataSourceLoadError[] }>(dataKey);
        if (cachedDs?.items) {
            queueMicrotask(() => {
                setMentionDataSources(cachedDs.items);
                setMentionDataSourceErrors(cachedDs.errors || []);
            });
        }

        if (canUseKnowledgeBase) {
            const cachedKb = readMentionCache<KnowledgeBaseSummary[]>(kbKey);
            if (cachedKb) {
                queueMicrotask(() => setMentionKnowledgeBases(cachedKb));
            }
        } else {
            setMentionKnowledgeBases([]);
        }

        let cancelled = false;
        const refresh = async (fresh = false) => {
            if (cancelled) return;
            await refreshMentionData(fresh);
        };

        void refresh(false);

        const onInvalidate = () => void refresh(true);
        window.addEventListener('mingai:data-index:invalidate', onInvalidate as EventListener);
        return () => {
            cancelled = true;
            window.removeEventListener('mingai:data-index:invalidate', onInvalidate as EventListener);
        };
    }, [canUseKnowledgeBase, readMentionCache, refreshMentionData, userId]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (mentionOpen) return;
        if (e.key === 'Backspace' || e.key === 'Delete') {
            const textarea = textareaRef.current;
            if (textarea) {
                const tokens = extractMentionTokens(inputValue, mentions);
                if (textarea.selectionStart !== textarea.selectionEnd) {
                    const start = textarea.selectionStart;
                    const end = textarea.selectionEnd;
                    const overlaps = tokens.filter(token => token.start < end && token.end > start);
                    if (overlaps.length > 0) {
                        e.preventDefault();
                        const removeStart = Math.min(start, ...overlaps.map(t => t.start));
                        const removeEnd = Math.max(end, ...overlaps.map(t => t.end));
                        const nextValue = `${inputValue.slice(0, removeStart)}${inputValue.slice(removeEnd)}`;
                        onInputChange(nextValue);
                        if (onMentionsChange) {
                            const nextMentions = removeMentionsByTokens(mentions, tokens, overlaps);
                            onMentionsChange(nextMentions);
                        }
                        requestAnimationFrame(() => {
                            textareaRef.current?.setSelectionRange(removeStart, removeStart);
                        });
                        return;
                    }
                } else {
                    const caret = e.key === 'Backspace' ? textarea.selectionStart - 1 : textarea.selectionStart;
                    if (caret >= 0) {
                        const target = tokens.find(token => caret >= token.start && caret < token.end);
                        if (target) {
                            e.preventDefault();
                            const nextValue = `${inputValue.slice(0, target.start)}${inputValue.slice(target.end)}`;
                            onInputChange(nextValue);
                            if (onMentionsChange) {
                                const nextMentions = removeMentionsByTokens(mentions, tokens, [target]);
                                onMentionsChange(nextMentions);
                            }
                            requestAnimationFrame(() => {
                                textareaRef.current?.setSelectionRange(target.start, target.start);
                            });
                            return;
                        }
                    }
                }
            }
        }
        if (e.key === 'Enter' && !e.shiftKey && !disabled && !isLoading && !isSendingToList && !dreamContextLoading && inputValue.trim()) {
            e.preventDefault();
            onSend();
        }
    };

    const handleInputChange = (value: string) => {
        onInputChange(value);
        const tokens = extractMentionTokens(value, mentions);
        if (onMentionsChange) {
            const nextMentions = filterMentionsByTokens(mentions, tokens);
            if (nextMentions.length !== mentions.length) {
                onMentionsChange(nextMentions);
            }
        }
        const atIndex = findLastAtOutsideTokens(value, tokens);
        if (atIndex >= 0) {
            const prev = atIndex > 0 ? value[atIndex - 1] : '';
            const isEmailLike = !!prev && /[A-Za-z0-9._-]/.test(prev);
            const tail = value.slice(atIndex + 1);
            const hasSpaceInTail = /\s/.test(tail);
            if (!isEmailLike && !hasSpaceInTail) {
                setMentionOpen(true);
                setMentionQuery(tail || '');
                setMentionStartIndex(atIndex);
                return;
            }
        }
        setMentionOpen(false);
        setMentionQuery('');
        setMentionStartIndex(null);
    };

    const handleSelectMention = (mention: Mention) => {
        if (!onMentionsChange) return;
        if (mention.type === 'knowledge_base' && !canUseKnowledgeBase) {
            showToast('info', '知识库仅限 Plus 以上会员使用');
            return;
        }
        // 检查是否已存在相同的提及
        const isDuplicate = mentions.some(
            m => m.id === mention.id && m.type === mention.type
        );
        if (isDuplicate) {
            showToast('info', '已添加过该项');
            return;
        }
        const next = [...mentions, mention].slice(0, 10);
        onMentionsChange(next);

        const token = buildMentionToken(mention);
        if (mentionStartIndex != null) {
            const prefix = inputValue.slice(0, mentionStartIndex).trimEnd();
            const nextValue = `${prefix} ${token} `;
            onInputChange(nextValue.trimStart());
        } else {
            const nextValue = inputValue.trim()
                ? `${inputValue.trim()} ${token} `
                : `${token} `;
            onInputChange(nextValue);
        }

        setMentionOpen(false);
        setMentionQuery('');
        setMentionStartIndex(null);
        setMentionDefaultCategory(null);
        textareaRef.current?.focus();
    };

    const highlightedInput = useMemo(() => {
        return buildMentionHighlightedParts(inputValue, mentions);
    }, [inputValue, mentions]);

    const handleButtonClick = () => {
        if (isSendingToList) return;
        if (isLoading && onStop) {
            onStop();
        } else if (inputValue.trim()) {
            onSend();
        }
    };

    return (
        <div className={`fixed left-0 right-0 bottom-[calc(3.5rem+var(--sab))] ${knowledgeBaseOpen ? 'z-[60]' : 'z-30'} md:sticky md:bottom-0 md:left-auto md:right-auto border-border bg-gradient-to-t from-background/95 to-transparent backdrop-blur-[2px] md:backdrop-blur-none pb-3 ${disabled ? 'opacity-50' : ''}`}>
            <div className="relative max-w-3xl mx-auto md:p-0 p-2">
                {/* 知识库弹窗 */}
                {knowledgeBaseOpen && userId && (
                    <>
                        <div
                            className="fixed inset-0 z-[70] bg-background/20 backdrop-blur-[1px]"
                            onClick={() => setKnowledgeBaseOpen(false)}
                        />
                        <div className="absolute bottom-full left-0 right-0 mb-4 z-[80] px-4 md:px-0">
                            <div className="bg-background border border-border shadow-2xl rounded-2xl overflow-hidden flex flex-col max-h-[60vh] w-full animate-in slide-in-from-bottom-2 fade-in duration-200">
                                <div className="flex items-center justify-between p-3 px-4 border-b border-border/50 bg-muted/30">
                                    <div className="flex items-center gap-2">
                                        <div className="text-sm font-semibold">启用知识库搜索</div>
                                        <Link
                                            href="/user/knowledge-base"
                                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                                            onClick={() => setKnowledgeBaseOpen(false)}
                                        >
                                            <span>更多设置</span>
                                            <Settings className="w-3 h-3" />
                                        </Link>
                                    </div>
                                    <button
                                        onClick={() => setKnowledgeBaseOpen(false)}
                                        className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="overflow-y-auto p-2 space-y-1 min-h-[120px]">
                                    {mentionKnowledgeBases.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2">
                                            <BookOpenText className="w-8 h-8 opacity-20" />
                                            <div className="text-sm">暂无知识库</div>
                                            <Link
                                                href="/user/knowledge-base"
                                                className="text-xs text-primary hover:underline mt-1"
                                                onClick={() => setKnowledgeBaseOpen(false)}
                                            >
                                                去创建第一个知识库
                                            </Link>
                                        </div>
                                    ) : (
                                        mentionKnowledgeBases.map((kb) => {
                                            const enabled = promptKbIdSet.has(kb.id);
                                            return (
                                                <div
                                                    key={kb.id}
                                                    onClick={() => toggleKnowledgeBaseSearch(kb.id)}
                                                    className={`
                                                        group flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer
                                                        ${enabled
                                                            ? 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                                                            : 'bg-card border-border hover:border-primary/30 hover:shadow-sm'
                                                        }
                                                    `}
                                                >
                                                    <div className="min-w-0 flex-1 mr-3">
                                                        <div className={`text-sm font-medium truncate transition-colors ${enabled ? 'text-primary' : 'text-foreground'}`}>
                                                            {kb.name}
                                                        </div>
                                                        <div className="text-xs text-muted-foreground truncate mt-0.5">
                                                            {kb.description || '暂无描述'}
                                                        </div>
                                                    </div>
                                                    <div className={`
                                                        flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center transition-all
                                                        ${enabled
                                                            ? 'bg-primary border-primary text-primary-foreground'
                                                            : 'border-muted-foreground/30 group-hover:border-primary/50'
                                                        }
                                                    `}>
                                                        {enabled && !knowledgeBaseSavingId && <Check className="w-3 h-3" strokeWidth={3} />}
                                                        {knowledgeBaseSavingId === kb.id && <span className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {/* 输入框容器 */}
                <div className={`
                    relative flex flex-col gap-1 p-3 rounded-4xl
                    bg-background/90 border border-border
                    transition-all duration-300
                `}>
                    {/* 已上传文件显示卡片 */}
                    {hasFile && (
                        <div className="flex items-start gap-2 mb-2">
                            <div className="flex items-center gap-3 px-3 py-2.5 bg-background border border-border rounded-xl max-w-[280px]">
                                <div className="flex-shrink-0 w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">
                                        {attachmentState?.file?.name}
                                    </p>
                                    <p className="text-xs text-foreground-secondary">文件</p>
                                </div>
                                {!disabled && (
                                    <button
                                        type="button"
                                        onClick={() => onAttachmentChange?.({ ...attachmentState, file: undefined, webSearchEnabled: attachmentState?.webSearchEnabled ?? false })}
                                        className="flex-shrink-0 ml-1 p-0.5 rounded-full bg-foreground-secondary/20 hover:bg-foreground-secondary/40 text-foreground-secondary hover:text-foreground transition-colors"
                                        title="移除文件"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {(promptKnowledgeBases.length > 0 || dreamMode) && (
                        <div className="flex flex-wrap items-center gap-2 mb-2 px-2">
                            <span className="text-xs text-foreground-secondary">已参考</span>
                            {promptKnowledgeBases.map(kb => (
                                <span
                                    key={kb.id}
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-xs ${mentionStyleMap.knowledge_base.className}`}
                                    title={kb.description || kb.name}
                                >
                                    <BookOpenText className="w-3.5 h-3.5" />
                                    <span className="max-w-[160px] truncate">{kb.name}</span>
                                </span>
                            ))}
                            {/* 解梦模式已参考 */}
                            {dreamMode && (
                                <>
                                    {dreamContextLoading && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-600 text-xs">
                                            <Moon className="w-3.5 h-3.5" />
                                            <span>正在加载</span>
                                        </span>
                                    )}
                                    {dreamContext?.baziChartName && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-600 text-xs">
                                            <Moon className="w-3.5 h-3.5" />
                                            <span className="max-w-[160px] truncate">{dreamContext.baziChartName}</span>
                                        </span>
                                    )}
                                    {dreamContext?.dailyFortune && (
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-600 text-xs">
                                            <Moon className="w-3.5 h-3.5" />
                                            <span>今日运势</span>
                                        </span>
                                    )}
                                </>
                            )}
                        </div>
                    )}

                    {/* 输入框区域 */}
                    <div className="relative">
                        {mentionOpen && userId && (
                            <>
                                <div
                                    className="fixed inset-0 z-30"
                                    onClick={() => setMentionOpen(false)}
                                />
                                <MentionPopover
                                    query={mentionQuery}
                                    dataSources={mentionDataSources}
                                    knowledgeBases={mentionKnowledgeBases}
                                    loadError={mentionLoadError}
                                    dataSourceErrors={mentionDataSourceErrors}
                                    loading={mentionLoading}
                                    defaultCategory={mentionDefaultCategory || undefined}
                                    knowledgeBaseLocked={!canUseKnowledgeBase}
                                    onSelect={handleSelectMention}
                                    onClose={() => {
                                        setMentionOpen(false);
                                        setMentionDefaultCategory(null);
                                    }}
                                />
                            </>
                        )}

                        <div className="relative">
                            <div ref={overlayRef} className="pointer-events-none absolute inset-0 text-base py-2 px-2 whitespace-pre-wrap break-words text-foreground overflow-y-auto">
                                {inputValue ? (
                                    <span>
                                        {highlightedInput.map((part) => (
                                            part.kind === 'mention'
                                                ? (
                                                    <span key={`${part.start}-${part.end}`} className={part.className}>
                                                        {part.value}
                                                    </span>
                                                )
                                                : part.value
                                        ))}
                                    </span>
                                ) : (
                                    <span className="text-foreground-secondary/80">
                                        {disabled ? "请充值后继续使用" : dreamMode ? "🌙 做了什么梦" : "尽管问"}
                                    </span>
                                )}
                            </div>
                            <textarea
                                ref={textareaRef}
                                value={inputValue}
                                onChange={(e) => handleInputChange(e.target.value)}
                                onKeyDown={handleKeyDown}
                                onScroll={(e) => {
                                    if (overlayRef.current) {
                                        overlayRef.current.scrollTop = e.currentTarget.scrollTop;
                                    }
                                }}
                                placeholder=""
                                className="w-full bg-transparent resize-none text-base py-2 px-2 text-transparent caret-foreground focus:outline-none placeholder:text-foreground-secondary/80 disabled:cursor-not-allowed overflow-y-auto"
                                disabled={disabled}
                                rows={1}
                            />
                        </div>
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background/60 to-transparent" />
                    </div>

                    {/* 底部按钮栏 */}
                    <div className="flex items-center justify-between border-border/50">
                        {/* 左侧按钮组 */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                            {/* 统一的折叠菜单（电脑端和手机端都使用） */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setMenuOpen(!menuOpen)}
                                    className={`h-10 w-10 rounded-xl transition-all flex items-center justify-center ${menuOpen
                                        ? 'bg-background-tertiary text-foreground'
                                        : 'text-foreground-secondary hover:text-foreground hover:bg-background-tertiary'
                                        }`}
                                    title="更多选项"
                                >
                                    <Plus className={`w-5.5 h-5.5 transition-transform duration-200 ${menuOpen ? 'rotate-45' : ''}`} />
                                </button>

                                {menuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                                        <div className="absolute bottom-full left-0 mb-2 w-38 bg-background border border-border rounded-xl shadow-lg z-20 overflow-hidden p-1 flex flex-col gap-1">
                                            {/* 附件选项 */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    if (dreamMode) return;
                                                    fileInputRef.current?.click();
                                                    setMenuOpen(false);
                                                }}
                                                className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-all ${hasFile
                                                    ? 'bg-blue-500/10 text-blue-600'
                                                    : dreamMode
                                                        ? 'opacity-40 text-foreground-secondary cursor-not-allowed'
                                                        : 'hover:bg-background-secondary text-foreground-secondary'
                                                    }`}
                                                disabled={disabled || dreamMode}
                                            >
                                                <Paperclip className="w-4.5 h-4.5" />
                                                <span>{hasFile ? '更换附件' : '上传附件'}</span>
                                            </button>
                                            {/* 搜索选项 */}
                                            <div className={`flex items-center w-full rounded-lg transition-all ${hasWebSearch
                                                ? 'bg-green-500/10 text-green-600'
                                                : (!canUseWeb || dreamMode)
                                                    ? 'opacity-40 text-foreground-secondary cursor-not-allowed'
                                                    : 'hover:bg-background-secondary text-foreground-secondary'
                                                }`}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        if (dreamMode) return;
                                                        handleWebToggle();
                                                        setMenuOpen(false);
                                                    }}
                                                    className="flex-1 flex items-center gap-2 px-3 py-2 text-sm"
                                                    disabled={disabled || dreamMode}
                                                >
                                                    <Globe className="w-4.5 h-4.5" />
                                                    <span>{!canUseWeb ? '搜索 (Plus+)' : '搜索'}</span>
                                                </button>
                                            </div>
                                            {onSelectChart && (
                                                <div className={`flex items-center w-full rounded-lg transition-all ${hasBazi
                                                    ? 'bg-orange-500/10 text-orange-600'
                                                    : dreamMode
                                                        ? 'opacity-40 text-foreground-secondary cursor-not-allowed'
                                                        : 'hover:bg-background-secondary text-foreground-secondary'
                                                    }`}>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (dreamMode) return;
                                                            onSelectChart('bazi');
                                                            setMenuOpen(false);
                                                        }}
                                                        className="flex-1 flex items-center gap-2 px-3 py-2 text-sm"
                                                        disabled={disabled || dreamMode}
                                                    >
                                                        <Orbit className="w-4.5 h-4.5" />
                                                        <span className="truncate flex flex-col items-start text-left">
                                                            <span className="truncate w-full">{hasBazi?.name || '八字命盘'}</span>
                                                            {hasBazi?.analysisMode && (
                                                                <span className="text-[11px] opacity-70">
                                                                    {hasBazi.analysisMode === 'mangpai' ? '盲派分析' : '传统分析'}
                                                                </span>
                                                            )}
                                                        </span>
                                                    </button>
                                                    {hasBazi && !disabled && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onClearChart?.('bazi');
                                                            }}
                                                            className="p-1.5 mr-1 rounded-lg hover:bg-orange-500/20"
                                                            title="清除八字命盘"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                            {onSelectChart && (
                                                <div className={`flex items-center w-full rounded-lg transition-all ${hasZiwei
                                                    ? 'bg-purple-500/10 text-purple-600'
                                                    : dreamMode
                                                        ? 'opacity-40 text-foreground-secondary cursor-not-allowed'
                                                        : 'hover:bg-background-secondary text-foreground-secondary'
                                                    }`}>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (dreamMode) return;
                                                            onSelectChart('ziwei');
                                                            setMenuOpen(false);
                                                        }}
                                                        className="flex-1 flex items-center gap-2 px-3 py-2 text-sm"
                                                        disabled={disabled || dreamMode}
                                                    >
                                                        <Sparkles className="w-4.5 h-4.5" />
                                                        <span className="truncate">{hasZiwei?.name || '紫微命盘'}</span>
                                                    </button>
                                                    {hasZiwei && !disabled && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onClearChart?.('ziwei');
                                                            }}
                                                            className="p-1.5 mr-1 rounded-lg hover:bg-purple-500/20"
                                                            title="清除紫微命盘"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                            {/* 周公解梦按钮 */}
                                            {!!userId && onDreamModeChange && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        onDreamModeChange(!dreamMode);
                                                        setMenuOpen(false);
                                                        textareaRef.current?.focus();
                                                    }}
                                                    className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-all ${dreamMode
                                                        ? 'bg-purple-500/10 text-purple-600'
                                                        : 'hover:bg-background-secondary text-foreground-secondary'
                                                        }`}
                                                    disabled={disabled}
                                                >
                                                    <Moon className="w-4.5 h-4.5" />
                                                    <span>周公解梦</span>
                                                </button>
                                            )}
                                            {/* 知识库按钮 */}
                                            {!!userId && (
                                                <div className={`flex items-center w-full rounded-lg transition-all ${canUseKnowledgeBase
                                                    ? 'hover:bg-background-secondary text-foreground-secondary'
                                                    : 'opacity-50 text-foreground-secondary hover:bg-background-secondary'
                                                    }`}>
                                                    <button
                                                        type="button"
                                                        onClick={handleKnowledgeBaseOpen}
                                                        className="flex-1 flex items-center gap-2 w-full px-3 py-2 text-sm"
                                                        disabled={disabled}
                                                    >
                                                        <BookOpenText className="w-4.5 h-4.5" />
                                                        <span>{canUseKnowledgeBase ? '知识库' : '知识库 (Plus+)'}</span>
                                                    </button>
                                                </div>
                                            )}
                                            {/* 提及按钮 */}
                                            {!!userId && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const textarea = textareaRef.current;
                                                        const caret = textarea?.selectionStart ?? inputValue.length;
                                                        const before = inputValue.slice(0, caret);
                                                        const after = inputValue.slice(caret);
                                                        const nextValue = `${before}@${after}`;
                                                        onInputChange(nextValue);
                                                        setMentionOpen(true);
                                                        setMentionQuery('');
                                                        setMentionStartIndex(caret);
                                                        setMenuOpen(false);
                                                        requestAnimationFrame(() => {
                                                            textareaRef.current?.focus();
                                                            textareaRef.current?.setSelectionRange(caret + 1, caret + 1);
                                                        });
                                                    }}
                                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-all hover:bg-background-secondary text-foreground-secondary"
                                                    disabled={disabled}
                                                >
                                                    <AtSign className="w-4.5 h-4.5" />
                                                    <span className="truncate flex flex-col items-start text-left">
                                                        <span className="truncate w-full">提及</span>
                                                    </span>
                                                </button>
                                            )}
                                        </div>
                                    </>
                                )}

                                {/* 隐藏的文件输入 */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.txt,.md,.doc,.docx,.xlsx,.xls,.csv"
                                    onChange={handleFileChange}
                                />
                            </div>

                            <div className="flex items-center gap-2 pl-1 pr-2">
                                <div className="relative group">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (hasPromptDiagnostics) {
                                                setPromptDiagnosticsOpen(prev => !prev);
                                            }
                                        }}
                                        className={`relative w-5 h-5 flex items-center justify-center ${promptPreviewLoading ? 'opacity-60' : ''} ${hasPromptDiagnostics ? 'cursor-pointer' : 'cursor-default'}`}
                                        aria-label="提示词使用情况"
                                    >
                                        <svg viewBox="0 0 36 36" className="w-5 h-5">
                                            <path
                                                d="M18 2a16 16 0 1 1 0 32a16 16 0 0 1 0-32"
                                                fill="none"
                                                className="text-border"
                                                stroke="currentColor"
                                                strokeWidth="3"
                                            />
                                            <path
                                                d="M18 2a16 16 0 1 1 0 32a16 16 0 0 1 0-32"
                                                fill="none"
                                                className="text-accent"
                                                stroke="currentColor"
                                                strokeWidth="2.5"
                                                strokeDasharray={`${contextProgressPercent}, 100`}
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                        <div className="absolute inset-[3px] rounded-full bg-border/40 overflow-hidden">
                                            <div
                                                className="absolute inset-x-0 bottom-0 bg-accent"
                                                style={{ height: `${promptProgressPercent}%` }}
                                            />
                                        </div>
                                    </button>
                                    <div className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-background border border-border px-2 py-1 text-xs text-foreground-secondary opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                                        {promptPreviewLoading
                                            ? '正在加载预览'
                                            : `上下文 ${contextProgressPercent}% | ${promptUsageLabel}`}
                                    </div>
                                    {hasPromptDiagnostics && promptDiagnosticsOpen && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-40"
                                                onClick={() => setPromptDiagnosticsOpen(false)}
                                            />
                                            <div className="fixed left-2 right-2 bottom-[calc(5rem+var(--sab))] md:absolute md:left-1/2 md:right-auto md:bottom-full mb-2 md:-translate-x-1/2 md:w-64 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground shadow-lg z-50">
                                                <div className="flex items-center justify-between font-medium text-foreground-secondary">
                                                    <span>提示词使用</span>
                                                    <span className="tabular-nums">
                                                        {promptProgressPercent}%
                                                    </span>
                                                </div>
                                                <div className="mt-2 max-h-40 overflow-auto space-y-1">
                                                    {displayUserMessageTokens > 0 && (
                                                        <div className="flex items-center justify-between gap-2">
                                                            <span className="truncate text-foreground">
                                                                P2 · 用户前缀
                                                            </span>
                                                            <span className="tabular-nums text-foreground-secondary">
                                                                {displayUserMessageTokens}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {displayLayers.map((layer) => (
                                                        <div key={layer.id} className="flex items-center justify-between gap-2">
                                                            <span className={`truncate ${layer.included ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                                                                {layer.priority ? `${layer.priority} · ` : ''}
                                                                {!layer.included && layer.reason && (
                                                                    <span className="text-xs no-underline mr-1">
                                                                        ({layer.reason === 'budget_exceeded' ? '超出' : layer.reason === 'empty' ? '空' : '重复'})
                                                                    </span>
                                                                )}
                                                                {formatLayerLabel(layer.id)}
                                                            </span>
                                                            <span className="tabular-nums text-foreground-secondary">
                                                                {layer.tokens}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <ModelSelector
                                selectedModel={selectedModel}
                                onModelChange={onModelChange}
                                reasoningEnabled={reasoningEnabled}
                                onReasoningChange={onReasoningChange}
                                userId={userId}
                                membershipType={membershipType}
                                disabled={disabled}
                            />
                        </div>

                        {/* 发送/停止按钮 */}
                        <button
                            onClick={handleButtonClick}
                            disabled={disabled || isSendingToList || (!isLoading && (!inputValue.trim() || dreamContextLoading))}
                            className={`
                                px-2 py-2 rounded-full transition-all duration-200 flex items-center gap-2 flex-shrink-0
                                ${isSendingToList
                                    ? 'bg-background-tertiary text-foreground-secondary cursor-wait'
                                    : isLoading
                                    ? 'bg-red-500 text-white hover:bg-red-600'
                                    : inputValue.trim() && !disabled && !dreamContextLoading
                                        ? 'bg-foreground text-background hover:bg-foreground/90'
                                        : 'bg-background-tertiary text-foreground-secondary cursor-not-allowed'
                                }
                            `}
                        >
                            {isSendingToList ? (
                                <Loader2 className="w-4.5 h-4.5 animate-spin" />
                            ) : isLoading ? (
                                <>
                                    <Square className="w-4.5 h-4.5" strokeWidth={2.5} />
                                    {/* <span className="text-sm">停止</span> */}
                                </>
                            ) : (
                                <>
                                    <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
                                    {/* <span className="text-sm">发送</span> */}
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {!hideDisclaimer && (
                    <p className="text-center text-xs text-foreground-secondary/90 mt-1">
                        AI 回复仅供参考，请理性看待命理分析结果
                    </p>
                )}
            </div>
        </div>
    );
}

// 导出类型和配置以保持向后兼容
export type AIModel = string;
export { getModelName } from '@/lib/ai-config';
