/**
 * 侧边栏对话列表（内嵌在 Chat 项下方）
 *
 * 直接渲染在 AI > Chat 导航项下方，与导航共用滚动区域。
 * 初始仅显示少量对话，向下滚动/点击"加载更多"展示全部。
 *
 * 'use client' 标记说明：
 * - 使用 React hooks 和交互状态
 */
'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import {
    Search, Trash2, Archive, ArrowLeft, X, SquarePen,
} from 'lucide-react';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import type { ConversationListItem, ConversationSourceType } from '@/types';
import { useConversationList } from '@/lib/chat/ConversationListContext';
import { useKnowledgeBaseFeatureEnabled } from '@/components/knowledge-base/useKnowledgeBaseFeatureEnabled';
import { AddToKnowledgeBaseModal } from '@/components/knowledge-base/AddToKnowledgeBaseModal';
import { ConversationGroup } from '@/components/chat/sidebar/ConversationGroup';
import { SOURCE_TYPE_CONFIG, SOURCE_TYPE_ORDER } from '@/lib/chat/conversation-groups';
import { resolveConversationViewportTargetCount } from '@/lib/chat/conversation-list-window';
import { formatConversationMenuTitle as formatMenuTitle } from '@/lib/chat/conversation-title-display';

export function SidebarConversations() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const {
        conversations,
        conversationsLoading,
        loadingMoreConversations,
        hasLoadedConversations,
        hasMoreConversations,
        conversationListError,
        pendingSidebarTitle,
        retryConversationListLoad,
        handleDeleteConversation,
        handleRenameConversation,
        triggerConversationListLoad,
        loadMoreConversations,
    } = useConversationList();
    const { knowledgeBaseEnabled } = useKnowledgeBaseFeatureEnabled();

    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [collapsedGroups, setCollapsedGroups] = useState<Set<ConversationSourceType>>(new Set());
    const [actionConv, setActionConv] = useState<ConversationListItem | null>(null);
    const [actionView, setActionView] = useState<'menu' | 'rename' | 'delete'>('menu');
    const [actionMenuPos, setActionMenuPos] = useState<{ top: number; left: number } | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [archiveTarget, setArchiveTarget] = useState<ConversationListItem | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [viewportTargetCount, setViewportTargetCount] = useState<number | null>(null);
    const listViewportRef = useRef<HTMLDivElement | null>(null);
    const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
    const scrollContainerRef = useRef<HTMLElement | null>(null);

    // Determine active conversation from URL search params
    const activeId = useMemo(() => {
        if (!pathname?.startsWith('/chat')) return undefined;
        return searchParams.get('id') ?? undefined;
    }, [pathname, searchParams]);

    const groupedConversations = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        const filtered = query
            ? conversations.filter(conv => (conv.title ?? '').toLowerCase().includes(query))
            : conversations;

        const groups: Record<ConversationSourceType, ConversationListItem[]> = {
            chat: [], dream: [], bazi_wuxing: [], bazi_personality: [],
            tarot: [], liuyao: [], ziwei: [], mbti: [], hepan: [],
            palm: [], face: [], qimen: [], daliuren: [],
        };

        filtered.forEach(conv => {
            let type = conv.sourceType || 'chat';
            if (type === 'bazi_personality') {
                type = 'bazi_wuxing';
            }
            if (groups[type]) {
                groups[type].push(conv);
            } else {
                groups.chat.push(conv);
            }
        });

        return groups;
    }, [conversations, searchQuery]);

    const toggleGroup = useCallback((type: ConversationSourceType) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(type)) next.delete(type);
            else next.add(type);
            return next;
        });
    }, []);

    const handleSelect = useCallback((id: string) => {
        router.push(`/chat?id=${id}`);
    }, [router]);

    // Action menu helpers
    const closeActionSheet = useCallback(() => {
        setActionConv(null);
        setActionView('menu');
        setActionMenuPos(null);
    }, []);

    const openActionSheet = useCallback((conv: ConversationListItem, e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        // Use fixed positioning and ensure it stays within viewport
        setActionMenuPos({ 
            top: rect.bottom + 4, 
            left: rect.left 
        });
        setActionConv(conv);
        setActionView('menu');
    }, []);

    const startInlineRename = useCallback(() => {
        if (!actionConv || actionConv.sourceType !== 'chat') return;
        setEditingId(actionConv.id);
        setEditTitle(actionConv.title);
        closeActionSheet();
    }, [actionConv, closeActionSheet]);

    const saveRename = useCallback(() => {
        if (editingId && editTitle.trim()) {
            handleRenameConversation(editingId, editTitle.trim());
            setEditingId(null);
            setEditTitle('');
        }
    }, [editingId, editTitle, handleRenameConversation]);

    const cancelRename = useCallback(() => {
        setEditingId(null);
        setEditTitle('');
    }, []);

    const confirmDelete = useCallback(() => {
        if (!actionConv) return Promise.resolve();

        setDeleteLoading(true);
        return handleDeleteConversation(actionConv.id).finally(() => {
            setDeleteLoading(false);
            closeActionSheet();
        });
    }, [actionConv, closeActionSheet, handleDeleteConversation]);

    const openArchive = useCallback(() => {
        if (!actionConv) return;
        setArchiveTarget(actionConv);
        closeActionSheet();
    }, [actionConv, closeActionSheet]);

    const measureViewportTargetCount = useCallback(() => {
        const listViewport = listViewportRef.current;
        if (!listViewport) {
            scrollContainerRef.current = null;
            return null;
        }

        const scrollContainer = listViewport.closest('nav');
        if (!(scrollContainer instanceof HTMLElement)) {
            scrollContainerRef.current = null;
            return null;
        }

        const scrollRect = scrollContainer.getBoundingClientRect();
        const listRect = listViewport.getBoundingClientRect();
        const visibleTop = Math.max(listRect.top, scrollRect.top);
        const viewportHeight = Math.max(scrollRect.bottom - visibleTop, 0);

        if (viewportHeight <= 0) {
            scrollContainerRef.current = scrollContainer;
            return null;
        }

        scrollContainerRef.current = scrollContainer;
        return resolveConversationViewportTargetCount({ viewportHeight });
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const listViewport = listViewportRef.current;
        if (!listViewport) {
            return;
        }

        const updateViewportTargetCount = () => {
            const nextTargetCount = measureViewportTargetCount();
            setViewportTargetCount((current) => (current === nextTargetCount ? current : nextTargetCount));
        };

        updateViewportTargetCount();

        const handleResize = () => {
            updateViewportTargetCount();
        };

        window.addEventListener('resize', handleResize);

        if (typeof ResizeObserver === 'undefined') {
            return () => {
                window.removeEventListener('resize', handleResize);
            };
        }

        const observer = new ResizeObserver(() => {
            updateViewportTargetCount();
        });

        observer.observe(listViewport);
        if (scrollContainerRef.current) {
            observer.observe(scrollContainerRef.current);
        }

        return () => {
            observer.disconnect();
            window.removeEventListener('resize', handleResize);
        };
    }, [measureViewportTargetCount]);

    useEffect(() => {
        if (viewportTargetCount == null) {
            return;
        }

        triggerConversationListLoad(viewportTargetCount);
    }, [triggerConversationListLoad, viewportTargetCount]);

    // Trigger load on first interaction
    const handleInteraction = useCallback(() => {
        triggerConversationListLoad(measureViewportTargetCount() ?? viewportTargetCount ?? undefined);
    }, [measureViewportTargetCount, triggerConversationListLoad, viewportTargetCount]);

    useEffect(() => {
        if (
            !hasLoadedConversations
            || !hasMoreConversations
            || loadingMoreConversations
            || !loadMoreSentinelRef.current
            || !scrollContainerRef.current
        ) {
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            if (entries.some((entry) => entry.isIntersecting)) {
                void loadMoreConversations();
            }
        }, {
            root: scrollContainerRef.current,
            rootMargin: '120px 0px',
        });

        observer.observe(loadMoreSentinelRef.current);
        return () => observer.disconnect();
    }, [
        hasLoadedConversations,
        hasMoreConversations,
        loadMoreConversations,
        loadingMoreConversations,
        viewportTargetCount,
    ]);

    return (
        <>
            {/* 对话区域 — 紧凑内嵌在 Chat 项下方 */}
            <div className="mt-1" onClick={handleInteraction}>
                {/* 搜索区域 — 符合 Notion 风格，搜索时替换按钮 */}
                <div className="mb-1">
                    {isSearching ? (
                        <div className="relative flex items-center">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="搜索聊天..."
                                className="w-full pl-8 pr-8 py-1.5 text-[14px] rounded-md bg-background border border-border text-foreground placeholder:text-foreground-secondary focus:outline-none focus:ring-2 focus:ring-accent/10 focus:border-accent transition-all duration-200"
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                                onBlur={() => {
                                    if (!searchQuery) setIsSearching(false);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') {
                                        setIsSearching(false);
                                        setSearchQuery('');
                                    }
                                }}
                            />
                            <Search className="absolute left-3 w-4 h-4 text-foreground-secondary" />
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setIsSearching(false);
                                    setSearchQuery('');
                                }}
                                className="absolute right-2 p-0.5 rounded hover:bg-background-tertiary text-foreground-secondary hover:text-destructive transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsSearching(true);
                            }}
                            className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md transition-colors duration-150 text-[14px] font-medium text-foreground-secondary hover:bg-background-secondary hover:text-foreground"
                        >
                            <Search className="w-4.5 h-4.5 flex-shrink-0" />
                            <span className="truncate">搜索聊天</span>
                        </button>
                    )}
                </div>

                {/* 分组对话列表 */}
                <div ref={listViewportRef} className="space-y-0.5">
                    {conversationListError && !hasLoadedConversations && !conversationsLoading ? (
                        <div className="rounded-md border border-[#ead9bf] bg-[#fcf8ee] px-3 py-3 text-xs text-[#946c21]">
                            <div>{conversationListError}</div>
                            <button
                                type="button"
                                onClick={() => { void retryConversationListLoad(); }}
                                className="mt-2 rounded-md px-2 py-1 font-medium text-[#7c5f1c] transition-colors hover:bg-[#f4ead3]"
                            >
                                重试
                            </button>
                        </div>
                    ) : !hasLoadedConversations || conversationsLoading ? (
                        <div className="flex flex-col items-center justify-center text-foreground-secondary text-xs py-3 gap-1">
                            {hasLoadedConversations ? (
                                <>
                                    <SoundWaveLoader variant="inline" />
                                </>
                            ) : (
                                <div className="w-full space-y-1">
                                    <div className="h-5 rounded bg-background-secondary animate-pulse" />
                                    <div className="h-5 rounded bg-background-secondary animate-pulse" />
                                    <div className="h-5 rounded bg-background-secondary animate-pulse" />
                                </div>
                            )}
                        </div>
                    ) : conversations.length === 0 && !pendingSidebarTitle ? (
                        <div className="text-center text-foreground-secondary text-[11px] py-3">
                            暂无对话
                        </div>
                    ) : (
                        <>
                            {conversationListError ? (
                                <div className="mb-2 flex items-center justify-between gap-3 rounded-md border border-[#ead9bf] bg-[#fcf8ee] px-3 py-2 text-xs text-[#946c21]">
                                    <span className="min-w-0 flex-1">{conversationListError}</span>
                                    <button
                                        type="button"
                                        onClick={() => { void retryConversationListLoad(); }}
                                        className="shrink-0 rounded-md px-2 py-1 font-medium text-[#7c5f1c] transition-colors hover:bg-[#f4ead3]"
                                    >
                                        重试
                                    </button>
                                </div>
                            ) : null}
                            {SOURCE_TYPE_ORDER.map(type => {
                                const allItems = groupedConversations[type];
                                const showPendingInGroup = type === 'chat' && !!pendingSidebarTitle;
                                if (allItems.length === 0 && !showPendingInGroup) return null;

                                const config = SOURCE_TYPE_CONFIG[type];
                                const isGroupCollapsed = collapsedGroups.has(type);

                                return (
                                    <div key={type}>
                                        <ConversationGroup
                                            type={type}
                                            label={config.label}
                                            items={allItems}
                                            showLabel={type !== 'chat'}
                                            isGroupCollapsed={isGroupCollapsed}
                                            onToggleGroup={toggleGroup}
                                            activeId={activeId}
                                            actionConvId={actionConv?.id}
                                            isSidebarCollapsed={false}
                                            onSelect={handleSelect}
                                            onOpenAction={openActionSheet}
                                            editingId={editingId}
                                            editTitle={editTitle}
                                            onEditTitleChange={setEditTitle}
                                            onSaveRename={saveRename}
                                            onCancelRename={cancelRename}
                                            pendingTitle={pendingSidebarTitle}
                                            showPendingInGroup={showPendingInGroup}
                                            compact
                                        />
                                    </div>
                                );
                            })}
                        </>
                    )}
                    {hasLoadedConversations && hasMoreConversations && (
                        <div ref={loadMoreSentinelRef} className="py-2">
                            {loadingMoreConversations ? (
                                <div className="flex items-center justify-center gap-2 text-[10px] text-foreground-secondary">
                                    <SoundWaveLoader variant="inline" />
                                </div>
                            ) : (
                                <div className="text-center text-[10px] text-foreground-secondary">
                                    下滑加载更多
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Action menu - 使用 createPortal 渲染到 body 下，彻底解决遮挡问题 */}
            {typeof document !== 'undefined' && actionConv && actionMenuPos && createPortal(
                <div className="fixed inset-0 z-[1000]" onClick={closeActionSheet}>
                    <div className="absolute inset-0 bg-transparent" />
                    <div
                        className={`fixed z-[1001] bg-background rounded-lg border border-border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-left text-foreground ${actionView === 'delete' ? 'min-w-[260px] max-w-[320px]' : 'min-w-[180px] max-w-[240px]'}`}
                        style={{
                            top: Math.min(actionMenuPos.top, window.innerHeight - (actionView === 'delete' ? 280 : 220)),
                            left: Math.max(16, Math.min(actionMenuPos.left, window.innerWidth - (actionView === 'delete' ? 320 : 200))),
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {actionView === 'menu' && (
                            <div className="p-1.5">
                                <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-foreground-secondary truncate border-b border-border mb-1">
                                    {formatMenuTitle(actionConv)}
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    {actionConv.sourceType === 'chat' && (
                                        <button
                                            type="button"
                                            onClick={startInlineRename}
                                            className="w-full text-left px-2 py-1.5 rounded-md hover:bg-background-secondary active:bg-background-tertiary transition-colors duration-150 text-sm font-bold flex items-center gap-2"
                                        >
                                            <SquarePen className="w-4 h-4 text-foreground-secondary" />
                                            <span>重命名</span>
                                        </button>
                                    )}
                                    {knowledgeBaseEnabled && (
                                        <button
                                            type="button"
                                            onClick={openArchive}
                                            className="w-full text-left px-2 py-1.5 rounded-md hover:bg-background-secondary active:bg-background-tertiary transition-colors duration-150 text-sm font-bold flex items-center gap-2"
                                        >
                                            <Archive className="w-4 h-4 text-foreground-secondary" />
                                            <span>{actionConv.isArchived ? '已归档' : '归档'}</span>
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setActionView('delete')}
                                        className="w-full text-left px-2 py-1.5 rounded-md hover:bg-destructive/10 transition-colors duration-150 text-destructive text-sm font-bold flex items-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span>删除</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {actionView === 'delete' && actionConv && (
                            <div className="p-1.5">
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setActionView('menu')}
                                        disabled={deleteLoading}
                                        className="p-1 rounded-md hover:bg-background-secondary transition-colors duration-150 disabled:opacity-50"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                    </button>
                                    <div className="font-bold text-sm text-destructive">删除此聊天</div>
                                </div>

                                <div className="rounded-md border-destructive/20 bg-destructive/5 px-3 py-3">
                                    <div className="text-sm font-semibold text-foreground truncate">
                                        {formatMenuTitle(actionConv)}
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setActionView('menu')}
                                        disabled={deleteLoading}
                                        className="px-3 py-1.5 text-xs font-medium rounded-md border-border hover:bg-background-secondary transition-colors disabled:opacity-50"
                                    >
                                        取消
                                    </button>
                                    <button
                                        type="button"
                                        onClick={confirmDelete}
                                        disabled={deleteLoading}
                                        className="px-3 py-1.5 text-xs font-bold rounded-md bg-destructive hover:bg-destructive/90 transition-all duration-150 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {deleteLoading && <SoundWaveLoader variant="inline" />}
                                        删除
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>,
                document.body
            )}

            {/* Knowledge base archive modal */}
            {knowledgeBaseEnabled && archiveTarget && (
                <AddToKnowledgeBaseModal
                    open={true}
                    onClose={() => setArchiveTarget(null)}
                    sourceTitle={archiveTarget.title}
                    sourceType="conversation"
                    sourceId={archiveTarget.id}
                />
            )}
        </>
    );
}
