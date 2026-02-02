'use client';

import { useState, useMemo, useCallback } from 'react';
import { MessageSquare, Trash2, Search, ChevronDown, ChevronRight, SquarePen, Loader2, Hand, User, PanelLeftClose, PanelLeft, ArrowLeftToLine, ArrowRightToLine, Archive, Ellipsis, ArrowLeft } from 'lucide-react';
import { Orbit, Gem, Dices, Brain, HeartHandshake } from 'lucide-react';
import type { Conversation, ConversationSourceType } from '@/types';
import { AddToKnowledgeBaseModal } from '@/components/knowledge-base/AddToKnowledgeBaseModal';

interface ConversationSidebarProps {
    conversations: Conversation[];
    activeId?: string;
    onSelect: (id: string) => void;
    onNew: () => void;
    onDelete: (id: string) => void;
    onRename?: (id: string, title: string) => void;
    isOpen: boolean;
    onClose: () => void;
    isLoading?: boolean;
    isCollapsed?: boolean;
    onCollapse?: (collapsed: boolean) => void;
    onToggle?: (isOpen: boolean) => void;
    hasLoaded?: boolean;
}

// 分组配置 - 图标与 fortune-hub 保持一致
const SOURCE_TYPE_CONFIG: Record<ConversationSourceType, {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string
}> = {
    chat: { label: '普通对话', icon: MessageSquare, color: 'text-foreground-secondary' },
    bazi_wuxing: { label: '八字五行/人格分析', icon: Orbit, color: 'text-foreground-secondary' },
    bazi_personality: { label: '八字五行/人格分析', icon: Orbit, color: 'text-foreground-secondary' },
    tarot: { label: '塔罗占卜', icon: Gem, color: 'text-foreground-secondary' },
    liuyao: { label: '六爻占卜', icon: Dices, color: 'text-foreground-secondary' },
    mbti: { label: 'MBTI 分析', icon: Brain, color: 'text-foreground-secondary' },
    hepan: { label: '合盘分析', icon: HeartHandshake, color: 'text-foreground-secondary' },
    palm: { label: '手相分析', icon: Hand, color: 'text-foreground-secondary' },
    face: { label: '面相分析', icon: User, color: 'text-foreground-secondary' },
    dream: { label: '周公解梦', icon: MessageSquare, color: 'text-foreground-secondary' },
};

// 显示顺序 - 八字合并为一个分组，用 bazi_wuxing 代表
const SOURCE_TYPE_ORDER: ConversationSourceType[] = [
    'chat', 'dream', 'bazi_wuxing', 'tarot', 'liuyao', 'mbti', 'hepan', 'palm', 'face'
];

export function ConversationSidebar({
    conversations,
    activeId,
    onSelect,
    onNew,
    onDelete,
    onRename,
    isOpen,
    onClose,
    isLoading = false,
    isCollapsed: externalCollapsed,
    onCollapse,
    onToggle,
    hasLoaded = true,
}: ConversationSidebarProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [actionConv, setActionConv] = useState<Conversation | null>(null);
    const [actionView, setActionView] = useState<'menu' | 'rename' | 'delete'>('menu');
    const [archiveTarget, setArchiveTarget] = useState<Conversation | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<ConversationSourceType>>(new Set());
    const [internalCollapsed, setInternalCollapsed] = useState(false);

    const [actionMenuPos, setActionMenuPos] = useState<{ top: number, left: number } | null>(null);

    // 使用外部或内部折叠状态
    const isCollapsed = externalCollapsed ?? internalCollapsed;
    const handleCollapse = (collapsed: boolean) => {
        if (onCollapse) {
            onCollapse(collapsed);
        } else {
            setInternalCollapsed(collapsed);
        }
    };

    // 按类型分组对话
    const groupedConversations = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();
        const filtered = query
            ? conversations.filter(conv => (conv.title ?? '').toLowerCase().includes(query))
            : conversations;

        const groups: Record<ConversationSourceType, Conversation[]> = {
            chat: [], dream: [], bazi_wuxing: [], bazi_personality: [],
            tarot: [], liuyao: [], mbti: [], hepan: [],
            palm: [], face: []
        };

        filtered.forEach(conv => {
            let type = conv.sourceType || 'chat';
            // 将八字人格分析合并到八字分析分组
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
            if (next.has(type)) {
                next.delete(type);
            } else {
                next.add(type);
            }
            return next;
        });
    }, []);

    const closeActionSheet = useCallback(() => {
        setActionConv(null);
        setActionView('menu');
        setEditingId(null);
        setEditTitle('');
        setActionMenuPos(null);
    }, []);

    const openActionSheet = useCallback((conv: Conversation, e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();

        // 计算位置：始终显示在按钮的右侧，稍微向下一点，或者如果空间不足则显示在左侧
        // 由于侧边栏在左侧，默认向右展开是比较安全的
        // rect.right 是按钮的右边缘

        const top = rect.bottom + 4;
        // 用户调整：菜单左边对齐 "..." 按钮的左边
        const left = rect.left;

        // 简单处理：记录点击位置，具体渲染时微调
        setActionMenuPos({ top, left });

        setActionConv(conv);
        setActionView('menu');
        setEditingId(null);
        setEditTitle('');
    }, []);

    const openRenameView = useCallback(() => {
        if (!actionConv) return;
        if (!onRename || actionConv.sourceType !== 'chat') return;
        setEditingId(actionConv.id);
        setEditTitle(actionConv.title);
        setActionView('rename');
    }, [actionConv, onRename]);

    const saveRename = useCallback(() => {
        if (editingId && onRename && editTitle.trim()) {
            onRename(editingId, editTitle.trim());
            closeActionSheet();
        }
    }, [editingId, onRename, editTitle, closeActionSheet]);

    const openDeleteView = useCallback(() => {
        if (!actionConv) return;
        setActionView('delete');
    }, [actionConv]);

    const confirmDelete = useCallback(() => {
        if (!actionConv) return;
        onDelete(actionConv.id);
        closeActionSheet();
    }, [actionConv, onDelete, closeActionSheet]);

    const openArchive = useCallback(() => {
        if (!actionConv) return;
        setArchiveTarget(actionConv);
        closeActionSheet();
    }, [actionConv, closeActionSheet]);

    // 格式化菜单标题显示
    const formatMenuTitle = useCallback((conv: Conversation) => {
        let title = conv.title.replace(/ -> /g, ' 变 ');
        // 对于六爻和塔罗，从标题中提取内容部分
        if ((conv.sourceType === 'liuyao' || conv.sourceType === 'tarot') && title.includes(' - ')) {
            title = title.split(' - ').slice(1).join(' - ');
        }
        // 八字人格/五行分析：只显示分析类型
        if ((conv.sourceType === 'bazi_personality' || conv.sourceType === 'bazi_wuxing') && title.includes(' - ')) {
            title = title.split(' - ').slice(1).join(' - ');
        }
        // 合盘：只显示合盘类型
        if (conv.sourceType === 'hepan' && title.includes(' - ')) {
            title = title.split(' - ').slice(1).join(' - ');
        }
        // 手相/面相：去掉前缀
        if ((conv.sourceType === 'palm' || conv.sourceType === 'face') && title.includes(' - ')) {
            title = title.split(' - ').slice(1).join(' - ');
        }
        return title;
    }, []);

    // 渲染单个对话项
    const renderConversationItem = useCallback((conv: Conversation) => {
        const isActionActive = actionConv?.id === conv.id;

        // 从 sourceData 中提取信息
        const question = typeof conv.sourceData?.question === 'string' ? conv.sourceData.question : null;

        // 处理标题和副标题
        let mainTitle = conv.title.replace(/ -> /g, ' 变 ');
        let subTitle: string | null = null;
        let changedTitle: string | null = null;

        // 六爻/塔罗：从标题中提取内容部分（去掉问题前缀），问题显示在下方
        if ((conv.sourceType === 'liuyao' || conv.sourceType === 'tarot') && mainTitle.includes(' - ')) {
            mainTitle = mainTitle.split(' - ').slice(1).join(' - ');
            subTitle = question;
        }

        // 六爻：分离主卦和变卦
        if (conv.sourceType === 'liuyao' && mainTitle.includes(' 变 ')) {
            const parts = mainTitle.split(' 变 ');
            mainTitle = parts[0];
            changedTitle = parts.slice(1).join(' 变 ');
        }

        // 八字人格/五行分析：标题显示"人格分析"或"五行分析"，命盘人名放下方
        if ((conv.sourceType === 'bazi_personality' || conv.sourceType === 'bazi_wuxing') && mainTitle.includes(' - ')) {
            const parts = mainTitle.split(' - ');
            subTitle = parts[0]; // 人名
            mainTitle = parts.slice(1).join(' - '); // 分析类型
        }

        // 合盘：标题显示合盘类型，名字放下方
        if (conv.sourceType === 'hepan' && mainTitle.includes(' - ')) {
            const parts = mainTitle.split(' - ');
            subTitle = parts[0]; // 名字组合
            mainTitle = parts.slice(1).join(' - '); // 合盘类型
        }

        // 手相/面相：去掉前缀，只保留具体分析类型
        if ((conv.sourceType === 'palm' || conv.sourceType === 'face') && mainTitle.includes(' - ')) {
            mainTitle = mainTitle.split(' - ').slice(1).join(' - ');
        }

        return (
            <div
                key={conv.id}
                className={`
                    group flex items-start gap-3 px-4 py-2 rounded-lg cursor-pointer
                    transition-colors text-sm
                    ${(activeId === conv.id || isActionActive) ? 'bg-background-secondary' : 'hover:bg-background-secondary'}
                `}
                onClick={() => onSelect(conv.id)}
            >
                <div className="flex-1 min-w-0">
                    <span className="text-sm truncate flex items-center gap-1">
                        <span className="truncate">{mainTitle}</span>
                        {changedTitle && (
                            <>
                                <span className="text-[10px] text-foreground-secondary shrink-0">变</span>
                                <span className="truncate">{changedTitle}</span>
                            </>
                        )}
                    </span>
                    {subTitle && (
                        <p className="text-[11px] text-foreground-secondary truncate mt-0.5">
                            {subTitle}
                        </p>
                    )}
                </div>
                {conv.isArchived && (
                    <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-border bg-background-tertiary text-[10px] text-foreground-secondary flex-shrink-0 mt-0.5"
                        title={
                            Array.isArray(conv.archivedKbIds) && conv.archivedKbIds.length
                                ? `已归档到 ${conv.archivedKbIds.length} 个知识库`
                                : '已归档到知识库'
                        }
                    >
                        <Archive className="w-3 h-3" />
                        {!isCollapsed && <span>归档</span>}
                    </span>
                )}
                <div className={`flex items-center flex-shrink-0 transition-opacity mt-0.5 ${isActionActive ? 'opacity-100' : 'opacity-100 lg:opacity-0 lg:group-hover:opacity-100'}`}>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            openActionSheet(conv, e);
                        }}
                        className="p-1.5 hover:bg-background-tertiary rounded text-foreground-secondary hover:text-foreground"
                        aria-label="更多操作"
                    >
                        <Ellipsis className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }, [actionConv?.id, activeId, isCollapsed, onSelect, openActionSheet]);

    return (
        <>
            {/* 遮罩层 - 移动端 */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={onClose}
                />
            )}

            {/* 侧边栏 */}
            <aside
                className={`
                    fixed lg:relative top-15 lg:top-0 bottom-15 lg:bottom-0 left-0 z-50
                    flex flex-row items-center
                    transition-transform duration-300 ease-out
                    ${isOpen ? 'translate-x-0' : '-translate-x-[calc(100%-40px)] lg:translate-x-0'}
                `}
            >
                {/* 内容区域 */}
                <div
                    className={`
                        h-full 
                        ${isCollapsed ? 'lg:w-14' : 'lg:w-64'} w-64
                        border-r ${isCollapsed ? 'border-transparent' : 'border-border'}
                        bg-background
                        flex flex-col
                        transition-all duration-300
                        shadow-2xl lg:shadow-none
                        rounded-r-2xl lg:rounded-none
                    `}
                >
                    {/* 操作按钮 (新聊天、搜索) */}
                    <div className="px-2 py-2 space-y-1">
                        <div className={`flex items-center gap-1 ${isCollapsed ? 'flex-col' : ''}`}>
                            {!isCollapsed && (
                                <button
                                    onClick={onNew}
                                    className="flex items-center gap-3 px-3 py-2.5 h-12 rounded-lg hover:bg-background-secondary transition-colors text-sm flex-1"
                                    title="新聊天"
                                >
                                    <SquarePen className="w-5 h-5 flex-shrink-0" />
                                    <span className="whitespace-nowrap">新聊天</span>
                                </button>
                            )}

                            {/* 桌面端：折叠/展开按钮 */}
                            <button
                                onClick={() => handleCollapse(!isCollapsed)}
                                className={`
                                    hidden lg:flex items-center justify-center 
                                    p-2.5 h-12 w-10 
                                    rounded-lg hover:bg-background-secondary transition-colors text-foreground-secondary hover:text-foreground
                                    ${isCollapsed ? 'w-full h-10' : ''}
                                `}
                                title={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
                            >
                                {isCollapsed ? (
                                    <ArrowRightToLine className="w-5 h-5" />
                                ) : (
                                    <ArrowLeftToLine className="w-5 h-5" />
                                )}
                            </button>
                        </div>

                        {!isCollapsed && (
                            <button
                                onClick={() => {
                                    if (isCollapsed) {
                                        handleCollapse(false);
                                    }
                                    setIsSearching(!isSearching);
                                }}
                                className={`flex items-center gap-3 px-3 py-2.5 h-12 rounded-lg transition-colors text-sm ${isSearching ? 'bg-background-secondary' : 'hover:bg-background-secondary'} w-full`}
                                title="搜索聊天"
                            >
                                <Search className="w-5 h-5 flex-shrink-0" />
                                <span className="whitespace-nowrap">搜索聊天</span>
                            </button>
                        )}
                    </div>

                    {/* 搜索框 - 仅在展开状态显示 */}
                    {isSearching && !isCollapsed && (
                        <div className="px-3 pb-3">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="搜索对话标题..."
                                className="w-full px-3 py-2 text-sm rounded-lg bg-background-secondary border border-border focus:outline-none focus:ring-2 focus:ring-accent/30"
                                autoFocus
                            />
                        </div>
                    )}

                    {/* 分组对话列表 - 仅在展开状态显示 */}
                    {!isCollapsed && (
                        <div className="flex-1 overflow-y-auto px-2 pb-2">
                            {!hasLoaded || isLoading ? (
                                <div className="flex flex-col items-center justify-center text-foreground-secondary text-sm py-8 gap-2">
                                    {hasLoaded ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            <span>加载中...</span>
                                        </>
                                    ) : (
                                        <div className="w-full px-3 space-y-3">
                                            <div className="h-4 w-24 rounded-md bg-background-secondary animate-pulse" />
                                            <div className="space-y-2">
                                                <div className="h-9 rounded-lg bg-background-secondary animate-pulse" />
                                                <div className="h-9 rounded-lg bg-background-secondary animate-pulse" />
                                                <div className="h-9 rounded-lg bg-background-secondary animate-pulse" />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : conversations.length === 0 ? (
                                <div className="text-center text-foreground-secondary text-sm py-8">
                                    暂无对话记录
                                </div>
                            ) : (
                                SOURCE_TYPE_ORDER.map(type => {
                                    const items = groupedConversations[type];
                                    if (items.length === 0) return null;

                                    const config = SOURCE_TYPE_CONFIG[type];
                                    const isCollapsed = collapsedGroups.has(type);

                                    return (
                                        <div key={type} className="mb-2">
                                            {/* 分组标题 */}
                                            <button
                                                onClick={() => toggleGroup(type)}
                                                className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm flex items-center gap-2 w-full px-3 py-1.5 text-xs text-foreground-secondary hover:text-foreground transition-colors"
                                            >
                                                {isCollapsed ? (
                                                    <ChevronRight className="w-3 h-3" />
                                                ) : (
                                                    <ChevronDown className="w-3 h-3" />
                                                )}
                                                <span>{config.label}</span>
                                                <span className="ml-auto text-foreground-tertiary">
                                                    {items.length}
                                                </span>
                                            </button>

                                            {/* 分组内容 */}
                                            {!isCollapsed && (
                                                <div className="space-y-0.5 mt-1">
                                                    {items.map(conv => renderConversationItem(conv))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>

                {/* 
                   手机端把手部分 (白色/背景色)
                   仅在手机端显示，且位于内容右侧
                */}
                <div
                    className="lg:hidden group relative flex flex-col items-start z-20 cursor-pointer -ml-[1px]"
                    onClick={() => {
                        if (onToggle) {
                            onToggle(!isOpen);
                        } else {
                            onClose();
                        }
                    }}
                >
                    {/* 上方反向圆角 - 镜像 HistoryDrawer */}
                    <svg width="16" height="16" className="relative -mb-[1px] z-30 pointer-events-none transform scale-x-[-1]">
                        {/* 填充 */}
                        <path d="M 16 0 L 16 16 L 0 16 A 16 16 0 0 0 16 0 Z" className="fill-background" />
                        {/* 描边 */}
                        <path d="M 0 16 A 16 16 0 0 0 16 0" className="stroke-border fill-none" strokeWidth="1" />
                    </svg>

                    {/* 按钮主体 */}
                    <button
                        className={`
                            relative
                            flex items-center justify-center
                            w-10 h-16
                            bg-background
                            rounded-r-xl
                            transition-colors duration-200
                            border-y border-r border-border
                            border-l-0
                            shadow-[4px_0_8px_rgba(0,0,0,0.02)]
                        `}
                        title={isOpen ? "收起" : "打开"}
                    >
                        <div className="transition-all duration-300 transform scale-100 text-foreground-secondary group-hover:text-foreground">
                            {isOpen ? (
                                <PanelLeftClose className="w-5 h-5" />
                            ) : (
                                <PanelLeft className="w-5 h-5" />
                            )}
                        </div>
                    </button>

                    {/* 下方反向圆角 - 镜像 HistoryDrawer */}
                    <svg width="16" height="16" className="relative -mt-[1px] z-30 pointer-events-none transform scale-x-[-1]">
                        {/* 填充 */}
                        <path d="M 16 16 L 16 0 L 0 0 A 16 16 0 0 1 16 16 Z" className="fill-background" />
                        {/* 描边 */}
                        <path d="M 0 0 A 16 16 0 0 1 16 16" className="stroke-border fill-none" strokeWidth="1" />
                    </svg>
                </div>
            </aside>

            {actionConv && actionMenuPos && (
                <div className="fixed inset-0 z-[60]" onClick={closeActionSheet}>
                    {/* 透明遮罩，点击关闭 */}
                    <div className="absolute inset-0 bg-transparent" />

                    {/* 菜单内容 */}
                    <div
                        className="fixed z-[61] min-w-[160px] max-w-[240px] bg-background rounded-xl border border-border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-left"
                        style={{
                            top: Math.min(actionMenuPos.top, window.innerHeight - 200), // 防止超出底部
                            left: isCollapsed
                                ? actionMenuPos.left + 48 // 折叠时显示在右侧
                                : actionMenuPos.left, // 展开时显示在点击位置右侧附近
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {actionView === 'menu' && (
                            <div className="p-1.5">
                                <div className="px-2 py-1.5 text-xs text-foreground-secondary truncate border-b border-border/50 mb-1">
                                    {formatMenuTitle(actionConv)}
                                </div>
                                <div className="flex flex-col gap-0.5">
                                    {onRename && actionConv.sourceType === 'chat' && (
                                        <button
                                            type="button"
                                            onClick={openRenameView}
                                            className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-background-secondary transition-colors text-sm flex items-center gap-2"
                                        >
                                            <SquarePen className="w-4 h-4 text-foreground-secondary" />
                                            <span>重命名</span>
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={openArchive}
                                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-background-secondary transition-colors text-sm flex items-center gap-2"
                                    >
                                        <Archive className="w-4 h-4 text-foreground-secondary" />
                                        <span>{actionConv.isArchived ? '已归档' : '归档'}</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={openDeleteView}
                                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors text-red-500 text-sm flex items-center gap-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span>删除</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {actionView === 'rename' && (
                            <div className="p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <button
                                        type="button"
                                        onClick={() => setActionView('menu')}
                                        className="p-1 rounded hover:bg-background-secondary transition-colors"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                    </button>
                                    <div className="font-medium text-sm">重命名</div>
                                </div>
                                <input
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="w-full bg-background-secondary border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/20 mb-2"
                                    autoFocus
                                />
                                <div className="flex gap-2 justify-end">
                                    <button
                                        type="button"
                                        onClick={saveRename}
                                        disabled={!editTitle.trim()}
                                        className="px-3 py-1.5 text-xs rounded-lg bg-accent text-white hover:bg-accent/90 disabled:opacity-50 transition-colors"
                                    >
                                        保存
                                    </button>
                                </div>
                            </div>
                        )}

                        {actionView === 'delete' && (
                            <div className="p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <button
                                        type="button"
                                        onClick={() => setActionView('menu')}
                                        className="p-1 rounded hover:bg-background-secondary transition-colors"
                                    >
                                        <ArrowLeft className="w-4 h-4" />
                                    </button>
                                    <div className="font-medium text-sm text-red-500">确认删除？</div>
                                </div>
                                <div className="flex gap-2 justify-end mt-2">
                                    <button
                                        type="button"
                                        onClick={confirmDelete}
                                        className="px-3 py-1.5 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                                    >
                                        删除
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {archiveTarget && (
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
