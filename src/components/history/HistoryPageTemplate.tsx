/**
 * 历史页面通用模板
 *
 * 封装: loadHistorySummariesPage, deleteHistorySummary, 搜索过滤, 删除确认弹窗, KB 模态框
 * 各历史页面只需提供配置即可复用全部逻辑。
 *
 * 'use client' - 需要 useState/useEffect/useRouter
 */
'use client';

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Trash2, Search, BookOpenText, MessageSquare } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '@/lib/auth';
import { AddToKnowledgeBaseModal } from '@/components/knowledge-base/AddToKnowledgeBaseModal';
import { ConfirmDeleteModal } from '@/components/common/ConfirmDeleteModal';
import {
    applyHistoryRestorePayload,
    deleteHistorySummary,
    loadHistoryRestore,
    loadHistorySummariesPage,
} from '@/lib/history/client';
import type { HistorySummaryItem, HistoryType } from '@/lib/history/registry';

/* ---------- 公共 formatDate ---------- */
function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

/* ---------- 类型定义 ---------- */
export type HistoryLayout = 'list' | 'grid';

export interface HistoryPageConfig {
    /** 历史类型 key */
    sourceType: HistoryType;
    /** 页面标题 */
    title: string;
    /** 副标题 */
    subtitle?: string;
    /** 标题图标 */
    icon?: LucideIcon;
    /** 图标颜色 class */
    iconColor?: string;
    /** 搜索框 placeholder */
    searchPlaceholder?: string;
    /** 空状态文案 */
    emptyMessage?: string;
    /** 空状态搜索无结果文案 */
    emptySearchMessage?: string;
    /** 空状态 CTA 文案 */
    emptyActionLabel?: string;
    /** 空状态 CTA 链接 */
    emptyActionHref?: string;
    /** 删除确认文案 */
    deleteMessage?: string;
    /** KB sourceType (默认与 sourceType 相同) */
    kbSourceType?: string;
    /** 布局模式 */
    layout?: HistoryLayout;
    /** 骨架屏数量 */
    skeletonCount?: number;
    /** 主题色 class (用于 hover border 等) */
    themeColor?: string;
    /** 自定义搜索过滤 */
    filterFn?: (item: HistorySummaryItem, query: string) => boolean;
    /** 自定义 KB 标题 */
    kbTitleFn?: (item: HistorySummaryItem) => string;
    /** 自定义卡片渲染 */
    renderCard?: (item: HistorySummaryItem, actions: CardActions) => ReactNode;
    /** loadHistoryRestore 的额外参数 (如 timezone) */
    restoreTimezone?: string;
    /** 数据变更时的 invalidate types */
    invalidateTypes?: string[];
}

export interface CardActions {
    onView: () => void;
    onDelete: () => void;
    onAddToKb: () => void;
    formatDate: (dateStr: string) => string;
}

const HISTORY_THEME_STYLES: Record<string, {
    cardBorder: string;
    badge: string;
}> = {
    accent: {
        cardBorder: 'hover:border-accent/30',
        badge: 'bg-accent/10 text-accent border-accent/10',
    },
    'amber-500': {
        cardBorder: 'hover:border-amber-500/30',
        badge: 'bg-amber-500/10 text-amber-500 border-amber-500/10',
    },
    'indigo-500': {
        cardBorder: 'hover:border-indigo-500/30',
        badge: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/10',
    },
    'purple-500': {
        cardBorder: 'hover:border-purple-500/30',
        badge: 'bg-purple-500/10 text-purple-500 border-purple-500/10',
    },
    'emerald-500': {
        cardBorder: 'hover:border-emerald-500/30',
        badge: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/10',
    },
    'rose-500': {
        cardBorder: 'hover:border-rose-500/30',
        badge: 'bg-rose-500/10 text-rose-500 border-rose-500/10',
    },
    'cyan-500': {
        cardBorder: 'hover:border-cyan-500/30',
        badge: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/10',
    },
};

function resolveHistoryTheme(themeColor: string) {
    return HISTORY_THEME_STYLES[themeColor] || HISTORY_THEME_STYLES.accent;
}

/* ---------- 默认卡片 (grid 布局) ---------- */
function DefaultGridCard({ item, actions, themeColor }: { item: HistorySummaryItem; actions: CardActions; themeColor: string }) {
    const theme = resolveHistoryTheme(themeColor);
    return (
        <div
            className={`group relative bg-background-secondary rounded-2xl p-5 border border-border ${theme.cardBorder} hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col`}
            onClick={actions.onView}
        >
            <div className="flex items-center justify-between mb-3">
                <span className={`px-2.5 py-1 text-xs font-medium rounded-lg border ${theme.badge}`}>
                    {item.title}
                </span>
                <span className="text-xs text-foreground-tertiary font-mono">
                    {actions.formatDate(item.createdAt)}
                </span>
            </div>
            {item.modelName && (
                <div className="mb-3">
                    <span className="text-[10px] text-foreground-secondary px-2 py-0.5 rounded-md bg-background border border-border inline-block">
                        {item.modelName}
                    </span>
                </div>
            )}
            <div className="flex-1">
                {item.question && <p className="text-xs text-foreground-secondary line-clamp-2">{item.question}</p>}
            </div>
            <div className="pt-3 mt-4 border-t border-border flex items-center justify-between opacity-60 group-hover:opacity-100 transition-opacity">
                <div className="text-xs text-foreground-secondary flex items-center gap-1">
                    <Calendar className="w-3 h-3" />查看详情
                </div>
                <div className="flex items-center gap-1">
                    <button type="button" onClick={e => { e.stopPropagation(); actions.onAddToKb(); }}
                        className="p-1.5 rounded-lg hover:bg-emerald-500/10 text-foreground-secondary hover:text-emerald-500 transition-colors" title="加入知识库">
                        <BookOpenText className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={e => { e.stopPropagation(); actions.onDelete(); }}
                        className="p-1.5 rounded-lg hover:bg-red-500/10 text-foreground-secondary hover:text-red-500 transition-colors" title="删除">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ---------- 默认卡片 (list 布局) ---------- */
function DefaultListCard({ item, actions, themeColor }: { item: HistorySummaryItem; actions: CardActions; themeColor: string }) {
    const theme = resolveHistoryTheme(themeColor);
    return (
        <div
            className={`bg-background-secondary rounded-xl p-4 border border-border ${theme.cardBorder} transition-colors cursor-pointer`}
            onClick={actions.onView}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        <span className={`px-2 py-0.5 text-xs rounded-full border ${theme.badge}`}>
                            {item.badges?.[0] || item.title}
                        </span>
                        <div className="flex items-center gap-2 ml-auto">
                            <span className="flex items-center gap-1 text-xs text-foreground-secondary">
                                <Calendar className="w-3 h-3" />{actions.formatDate(item.createdAt)}
                            </span>
                            {item.modelName && (
                                <span className="text-xs text-foreground-secondary px-2 py-0.5 rounded bg-background">{item.modelName}</span>
                            )}
                        </div>
                    </div>
                    <p className="text-sm font-medium">{item.title}</p>
                </div>
                <div className="flex items-center gap-1">
                    <button type="button" onClick={e => { e.stopPropagation(); actions.onAddToKb(); }}
                        className="p-2 rounded-lg hover:bg-emerald-500/10 text-foreground-secondary hover:text-emerald-500 transition-colors" title="加入知识库">
                        <BookOpenText className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={e => { e.stopPropagation(); actions.onDelete(); }}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-foreground-secondary hover:text-red-500 transition-colors" title="删除">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ---------- 骨架屏 ---------- */
function SkeletonGrid({ count }: { count: number }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: count }, (_, i) => (
                <div key={i} className="bg-background-secondary rounded-2xl p-5 border border-border">
                    <div className="flex items-center justify-between mb-3">
                        <div className="h-6 w-20 rounded-lg bg-foreground/10 animate-pulse" />
                        <div className="h-4 w-24 rounded bg-foreground/5 animate-pulse" />
                    </div>
                    <div className="h-3 w-full rounded bg-foreground/5 animate-pulse mb-2" />
                    <div className="h-3 w-2/3 rounded bg-foreground/5 animate-pulse" />
                    <div className="pt-3 mt-4 border-t border-border flex justify-between">
                        <div className="h-3 w-16 rounded bg-foreground/5 animate-pulse" />
                        <div className="flex gap-1">
                            <div className="w-7 h-7 rounded-lg bg-foreground/5 animate-pulse" />
                            <div className="w-7 h-7 rounded-lg bg-foreground/5 animate-pulse" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function SkeletonList({ count }: { count: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }, (_, i) => (
                <div key={i} className="bg-background-secondary rounded-xl p-4 border border-border">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="h-5 w-20 rounded-full bg-foreground/10 animate-pulse" />
                                <div className="ml-auto h-4 w-28 rounded bg-foreground/5 animate-pulse" />
                            </div>
                            <div className="h-5 w-32 rounded bg-foreground/10 animate-pulse" />
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-8 h-8 rounded-lg bg-foreground/5 animate-pulse" />
                            <div className="w-8 h-8 rounded-lg bg-foreground/5 animate-pulse" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ---------- 主组件 ---------- */
export function HistoryPageTemplate(config: HistoryPageConfig) {
    const {
        sourceType, title, subtitle, icon: Icon, iconColor,
        searchPlaceholder = '搜索...', emptyMessage = '暂无历史记录',
        emptySearchMessage = '未找到匹配的记录', emptyActionLabel = '开始新的',
        emptyActionHref, deleteMessage, kbSourceType, layout = 'grid',
        skeletonCount = layout === 'grid' ? 6 : 4, themeColor = 'accent',
        filterFn, kbTitleFn, renderCard, restoreTimezone, invalidateTypes,
    } = config;

    const router = useRouter();
    const [items, setItems] = useState<HistorySummaryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [kbModalOpen, setKbModalOpen] = useState(false);
    const [kbTarget, setKbTarget] = useState<HistorySummaryItem | null>(null);
    const basePath = `/${sourceType}`;

    const loadItems = useCallback(async () => {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
            router.push(basePath);
            return;
        }

        const firstPage = await loadHistorySummariesPage(sourceType);
        setItems(firstPage.items);
        setLoading(false);

        if (!firstPage.pagination.hasMore || firstPage.pagination.nextOffset == null) {
            return;
        }

        let offset = firstPage.pagination.nextOffset;
        const bufferedItems = [...firstPage.items];
        for (let page = 0; page < 49; page += 1) {
            const nextPage = await loadHistorySummariesPage(sourceType, { offset });
            bufferedItems.push(...nextPage.items);
            setItems([...bufferedItems]);
            if (!nextPage.pagination.hasMore || nextPage.pagination.nextOffset == null) {
                break;
            }
            offset = nextPage.pagination.nextOffset;
        }
    }, [router, sourceType, basePath]);

    useEffect(() => {
        const timer = setTimeout(() => { void loadItems(); }, 0);
        return () => clearTimeout(timer);
    }, [loadItems]);

    const handleDelete = async (id: string) => {
        const success = await deleteHistorySummary(sourceType, id);
        if (success) {
            setItems(prev => prev.filter(r => r.id !== id));
            if (invalidateTypes?.length) {
                window.dispatchEvent(new CustomEvent('mingai:data-index:invalidate', { detail: { types: invalidateTypes } }));
            }
        }
        setDeleteConfirmId(null);
    };

    const handleView = async (item: HistorySummaryItem) => {
        const payload = await loadHistoryRestore(sourceType, item.id, restoreTimezone);
        if (!payload) return;
        router.push(applyHistoryRestorePayload(payload, item.id));
    };

    const defaultFilter = (item: HistorySummaryItem, query: string) => {
        const q = query.toLowerCase();
        return (item.title || '').toLowerCase().includes(q)
            || (item.question || '').toLowerCase().includes(q)
            || (item.badges || []).join(' ').toLowerCase().includes(q);
    };

    const filteredItems = items.filter(item => {
        if (!searchQuery.trim()) return true;
        return (filterFn || defaultFilter)(item, searchQuery);
    });

    const makeActions = (item: HistorySummaryItem): CardActions => ({
        onView: () => void handleView(item),
        onDelete: () => setDeleteConfirmId(item.id),
        onAddToKb: () => { setKbTarget(item); setKbModalOpen(true); },
        formatDate,
    });

    const resolvedKbSourceType = kbSourceType || `${sourceType}_reading`;
    const resolvedEmptyHref = emptyActionHref || basePath;

    return (
        <div className="min-h-screen bg-background">
            <div className={`${layout === 'grid' ? 'max-w-6xl' : 'max-w-4xl'} mx-auto px-4 py-4 md:py-8`}>
                <div className="hidden md:flex items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-2">
                            {Icon && <Icon className={`w-6 h-6 ${iconColor || ''}`} />}
                            {title}
                        </h1>
                        {subtitle && <p className="text-foreground-secondary text-sm mt-1">{subtitle}</p>}
                    </div>
                </div>

                <div className="flex items-center gap-3 mb-6 bg-background-secondary/50 p-2 rounded-2xl border border-border">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" />
                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="w-full pl-9 pr-4 py-2 rounded-xl bg-background border-none focus:outline-none focus:ring-2 focus:ring-accent/20 text-sm placeholder:text-foreground-tertiary" />
                    </div>
                </div>

                {loading ? (
                    layout === 'grid' ? <SkeletonGrid count={skeletonCount} /> : <SkeletonList count={skeletonCount} />
                ) : filteredItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-background-secondary/30 rounded-3xl border border-border border-dashed">
                        <div className="w-16 h-16 rounded-full bg-background-secondary flex items-center justify-center mb-4">
                            <MessageSquare className="w-8 h-8 text-foreground-tertiary" />
                        </div>
                        <h3 className="text-lg font-medium mb-1">{searchQuery ? emptySearchMessage : emptyMessage}</h3>
                        {!searchQuery && (
                            <Link href={resolvedEmptyHref}
                                className="mt-6 px-6 py-2.5 bg-accent text-white rounded-xl hover:bg-accent/90 transition-all shadow-lg shadow-accent/20 font-medium text-sm">
                                {emptyActionLabel}
                            </Link>
                        )}
                    </div>
                ) : layout === 'grid' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredItems.map(item => {
                            const actions = makeActions(item);
                            return renderCard
                                ? <div key={item.id}>{renderCard(item, actions)}</div>
                                : <DefaultGridCard key={item.id} item={item} actions={actions} themeColor={themeColor} />;
                        })}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredItems.map(item => {
                            const actions = makeActions(item);
                            return renderCard
                                ? <div key={item.id}>{renderCard(item, actions)}</div>
                                : <DefaultListCard key={item.id} item={item} actions={actions} themeColor={themeColor} />;
                        })}
                    </div>
                )}
            </div>

            <ConfirmDeleteModal open={!!deleteConfirmId} onClose={() => setDeleteConfirmId(null)}
                onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)} message={deleteMessage} />

            {kbTarget && (
                <AddToKnowledgeBaseModal open={kbModalOpen}
                    onClose={() => { setKbModalOpen(false); setKbTarget(null); }}
                    sourceTitle={kbTitleFn ? kbTitleFn(kbTarget) : kbTarget.question || kbTarget.title}
                    sourceType={resolvedKbSourceType} sourceId={kbTarget.id} />
            )}
        </div>
    );
}
