'use client';

import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Paperclip, Orbit, X, Sparkles, Square, Plus, FileText, ArrowUp, BookOpenText, AtSign, Globe } from 'lucide-react';
import type { SelectedCharts } from './BaziChartSelector';
import type { AttachmentState, Mention, MentionType } from '@/types';
import { DEFAULT_MODEL_ID } from '@/lib/ai-config';
import type { MembershipType } from '@/lib/membership';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { useToast } from '@/components/ui/Toast';
import { MentionPopover } from './MentionPopover';
import { supabase } from '@/lib/supabase';

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

type MentionToken = {
    start: number;
    end: number;
    name: string;
};

const mentionStyleMap: Record<MentionType | 'default', { className: string }> = {
    knowledge_base: { className: 'text-emerald-500' },
    bazi_chart: { className: 'text-orange-500' },
    ziwei_chart: { className: 'text-purple-500' },
    tarot_reading: { className: 'text-fuchsia-500' },
    liuyao_divination: { className: 'text-amber-500' },
    mbti_reading: { className: 'text-blue-500' },
    hepan_chart: { className: 'text-rose-500' },
    face_reading: { className: 'text-orange-500' },
    palm_reading: { className: 'text-yellow-600' },
    ming_record: { className: 'text-slate-500' },
    daily_fortune: { className: 'text-lime-600' },
    monthly_fortune: { className: 'text-lime-600' },
    default: { className: 'text-foreground' }
};

const extractMentionTokens = (value: string, mentionList: Mention[]): MentionToken[] => {
    const tokens: MentionToken[] = [];
    const names = Array.from(new Set(mentionList.map(m => m.name).filter(Boolean)))
        .sort((a, b) => b.length - a.length);
    if (names.length === 0) return tokens;
    for (let i = 0; i < value.length; i += 1) {
        if (value[i] !== '@') continue;
        for (const name of names) {
            if (value.startsWith(`@${name}`, i)) {
                const start = i;
                const end = i + 1 + name.length;
                tokens.push({ start, end, name });
                i = end - 1;
                break;
            }
        }
    }
    return tokens;
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
    // 隐藏底部免责声明
    hideDisclaimer?: boolean;
}

export function ChatComposer({
    inputValue,
    isLoading,
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
    hideDisclaimer = false,
}: ChatComposerProps) {
    const hasBazi = selectedCharts?.bazi;
    const hasZiwei = selectedCharts?.ziwei;
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
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
    const mentionCacheTtlMs = 10 * 60 * 1000;
    const [promptPreviewTokens, setPromptPreviewTokens] = useState(0);
    const [promptPreviewBudget, setPromptPreviewBudget] = useState(0);
    const [promptPreviewLoading, setPromptPreviewLoading] = useState(false);

    // 权限判断
    const canUseWeb = membershipType !== 'free';
    const canUseBoth = membershipType === 'pro';
    const canUseKnowledgeBase = membershipType !== 'free';
    const hasFile = !!attachmentState?.file;
    const hasWebSearch = !!attachmentState?.webSearchEnabled;
    const promptProgress = promptPreviewBudget > 0
        ? Math.min(promptPreviewTokens / promptPreviewBudget, 1)
        : 0;
    const previewMentions = useMemo(() => mentions.filter(m => m.type !== 'knowledge_base'), [mentions]);

    useEffect(() => {
        if (!userId) {
            setPromptPreviewTokens(0);
            setPromptPreviewBudget(0);
            return;
        }
        let cancelled = false;
        const loadPreview = async () => {
            setPromptPreviewLoading(true);
            try {
                const resp = await fetch('/api/user/ai-settings/preview', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ modelId: selectedModel, mentions: previewMentions })
                });
                if (!resp.ok) return;
                const data = await resp.json();
                if (cancelled) return;
                setPromptPreviewTokens(data.totalTokens || 0);
                setPromptPreviewBudget(data.budgetTotal || 0);
            } finally {
                if (!cancelled) setPromptPreviewLoading(false);
            }
        };
        loadPreview();
        return () => { cancelled = true; };
    }, [selectedModel, userId, previewMentions]);

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
        setMentionOpen(true);
        setMentionQuery('');
        setMentionStartIndex(null);
        setMentionLoadError(null);
        setMentionDefaultCategory('knowledge');
        setMenuOpen(false);
        textareaRef.current?.focus();
        await refreshMentionData(true);
    };

    // 自动调整 textarea 高度
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.style.height = 'auto';
        const newHeight = Math.min(Math.max(textarea.scrollHeight, 24), 236);
        textarea.style.height = `${newHeight}px`;
    }, [inputValue, mentions]);

    const readMentionCache = useCallback(<T,>(key: string): T | null => {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            const parsed = JSON.parse(raw) as { ts: number; value: T };
            if (!parsed?.ts || Date.now() - parsed.ts > mentionCacheTtlMs) return null;
            return parsed.value;
        } catch {
            return null;
        }
    }, [mentionCacheTtlMs]);

    const writeMentionCache = useCallback(<T,>(key: string, value: T) => {
        try {
            localStorage.setItem(key, JSON.stringify({ ts: Date.now(), value }));
        } catch {
        }
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
                            const nameSet = new Set(extractMentionTokens(nextValue, mentions).map(t => t.name));
                            const nextMentions = mentions.filter(m => nameSet.has(m.name));
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
                                const nameSet = new Set(extractMentionTokens(nextValue, mentions).map(t => t.name));
                                const nextMentions = mentions.filter(m => nameSet.has(m.name));
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
        if (e.key === 'Enter' && !e.shiftKey && !disabled && !isLoading && inputValue.trim()) {
            e.preventDefault();
            onSend();
        }
    };

    const handleInputChange = (value: string) => {
        onInputChange(value);
        const tokens = extractMentionTokens(value, mentions);
        if (onMentionsChange) {
            const nameSet = new Set(tokens.map(token => token.name));
            const nextMentions = mentions.filter(m => nameSet.has(m.name));
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
        const next = [...mentions, mention].slice(0, 10);
        onMentionsChange(next);

        const token = `@${mention.name}`;
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
        const escape = (value: string) =>
            value
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        if (!inputValue) return '';
        const tokens = extractMentionTokens(inputValue, mentions);
        if (tokens.length === 0) return escape(inputValue);
        let result = '';
        let cursor = 0;
        for (const token of tokens) {
            if (token.start > cursor) {
                result += escape(inputValue.slice(cursor, token.start));
            }
            const matchedMention = mentions.find(m => m.name === token.name);
            const style = mentionStyleMap[matchedMention?.type || 'default'] || mentionStyleMap.default;
            result += `<span class="font-semibold ${style.className}"><span class="font-black">@</span>${escape(token.name)}</span>`;
            cursor = token.end;
        }
        if (cursor < inputValue.length) {
            result += escape(inputValue.slice(cursor));
        }
        return result;
    }, [inputValue, mentions]);

    const handleButtonClick = () => {
        if (isLoading && onStop) {
            onStop();
        } else if (inputValue.trim()) {
            onSend();
        }
    };

    return (
        <div className={`fixed left-0 right-0 bottom-[calc(3.5rem+var(--sab))] z-30 md:sticky md:bottom-0 md:left-auto md:right-auto border-border bg-gradient-to-t from-background/95 to-transparent backdrop-blur-[2px] md:backdrop-blur-none pb-3 ${disabled ? 'opacity-50' : ''}`}>
            <div className="max-w-3xl mx-auto md:p-0 p-2">
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

                    {promptKnowledgeBases.length > 0 && (
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
                            <div className="pointer-events-none absolute inset-0 text-base py-2 px-2 whitespace-pre-wrap break-words text-foreground">
                                {inputValue ? (
                                    <span dangerouslySetInnerHTML={{ __html: highlightedInput }} />
                                ) : (
                                    <span className="text-foreground-secondary/80">{disabled ? "请充值后继续使用" : "尽管问"}</span>
                                )}
                            </div>
                            <textarea
                                ref={textareaRef}
                                value={inputValue}
                                onChange={(e) => handleInputChange(e.target.value)}
                                onKeyDown={handleKeyDown}
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
                                    className={`p-2 rounded-lg transition-all ${menuOpen
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
                                            {onSelectChart && (
                                                <div className={`flex items-center w-full rounded-lg transition-all ${hasBazi
                                                    ? 'bg-orange-500/10 text-orange-600'
                                                    : 'hover:bg-background-secondary text-foreground-secondary'
                                                    }`}>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            onSelectChart('bazi');
                                                            setMenuOpen(false);
                                                        }}
                                                        className="flex-1 flex items-center gap-2 px-3 py-2.5 text-sm"
                                                        disabled={disabled}
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
                                                    : 'hover:bg-background-secondary text-foreground-secondary'
                                                    }`}>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            onSelectChart('ziwei');
                                                            setMenuOpen(false);
                                                        }}
                                                        className="flex-1 flex items-center gap-2 px-3 py-2.5 text-sm"
                                                        disabled={disabled}
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
                                            {!!userId && (
                                                <div className={`flex items-center w-full rounded-lg transition-all ${canUseKnowledgeBase
                                                    ? 'hover:bg-background-secondary text-foreground-secondary'
                                                    : 'opacity-50 text-foreground-secondary hover:bg-background-secondary'
                                                    }`}>
                                                    <button
                                                        type="button"
                                                        onClick={handleKnowledgeBaseOpen}
                                                        className="flex-1 flex items-center gap-2 w-full px-3 py-2.5 text-sm"
                                                        disabled={disabled}
                                                    >
                                                        <BookOpenText className="w-4.5 h-4.5" />
                                                        <span>{canUseKnowledgeBase ? '知识库' : '知识库 (Plus+)'}</span>
                                                    </button>
                                                </div>
                                            )}
                                            {/* 附件选项 */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    fileInputRef.current?.click();
                                                    setMenuOpen(false);
                                                }}
                                                className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm rounded-lg transition-all ${hasFile
                                                    ? 'bg-blue-500/10 text-blue-600'
                                                    : 'hover:bg-background-secondary text-foreground-secondary'
                                                    }`}
                                                disabled={disabled}
                                            >
                                                <Paperclip className="w-4.5 h-4.5" />
                                                <span>{hasFile ? '更换附件' : '上传附件'}</span>
                                            </button>
                                            {/* 搜索选项 */}
                                            <div className={`flex items-center w-full rounded-lg transition-all ${hasWebSearch
                                                ? 'bg-green-500/10 text-green-600'
                                                : !canUseWeb
                                                    ? 'opacity-50 text-foreground-secondary hover:bg-background-secondary'
                                                    : 'hover:bg-background-secondary text-foreground-secondary'
                                                }`}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        handleWebToggle();
                                                        setMenuOpen(false);
                                                    }}
                                                    className="flex-1 flex items-center gap-2 px-3 py-2.5 text-sm"
                                                    disabled={disabled}
                                                >
                                                    <Globe className="w-4.5 h-4.5" />
                                                    <span>{!canUseWeb ? '搜索 (Plus+)' : hasWebSearch ? '搜索已启用' : '搜索'}</span>
                                                </button>
                                            </div>
                                            {!!userId && (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setMentionOpen(true);
                                                        setMentionQuery('');
                                                        setMentionStartIndex(null);
                                                        setMenuOpen(false);
                                                        textareaRef.current?.focus();
                                                    }}
                                                    className="flex items-center gap-2 w-full px-3 py-2.5 text-sm rounded-lg transition-all hover:bg-background-secondary text-foreground-secondary"
                                                    disabled={disabled}
                                                >
                                                    <AtSign className="w-4.5 h-4.5" />
                                                    <span className="truncate flex flex-col items-start text-left">
                                                        <span className="truncate w-full">提及</span>
                                                        <span className="text-[11px] opacity-70">也可输入 @ 启动</span>
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

                            <div className="flex items-center gap-2">
                                <div className="relative group">
                                    <div className={`w-5 h-5 ${promptPreviewLoading ? 'opacity-60' : ''}`}>
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
                                                strokeDasharray={`${Math.round(promptProgress * 100)}, 100`}
                                                strokeLinecap="round"
                                            />
                                        </svg>
                                    </div>
                                    <div className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-background border border-border px-2 py-1 text-xs text-foreground-secondary opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                                        {promptPreviewLoading
                                            ? '正在加载预览'
                                            : `Prompt 消耗 ${promptPreviewTokens}/${promptPreviewBudget}`}
                                    </div>
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
                            disabled={disabled || (!isLoading && !inputValue.trim())}
                            className={`
                                px-2 py-2 rounded-full transition-all duration-200 flex items-center gap-2 flex-shrink-0
                                ${isLoading
                                    ? 'bg-red-500 text-white hover:bg-red-600'
                                    : inputValue.trim() && !disabled
                                        ? 'bg-foreground text-background hover:bg-foreground/90'
                                        : 'bg-background-tertiary text-foreground-secondary cursor-not-allowed'
                                }
                            `}
                        >
                            {isLoading ? (
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
