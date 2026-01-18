'use client';

import { useState, useMemo } from 'react';
import { MessageSquare, Trash2, X, Check, Search, ChevronDown, ChevronRight, SquarePen, Pencil, Loader2, Hand, User, PanelLeftClose, PanelLeft } from 'lucide-react';
import { Orbit, Gem, Dices, Brain, HeartHandshake } from 'lucide-react';
import type { Conversation, ConversationSourceType } from '@/types';

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
}

// 分组配置 - 图标与 fortune-hub 保持一致
const SOURCE_TYPE_CONFIG: Record<ConversationSourceType, {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string
}> = {
    chat: { label: '普通对话', icon: MessageSquare, color: 'text-foreground-secondary' },
    bazi_wuxing: { label: '八字五行分析', icon: Orbit, color: 'text-foreground-secondary' },
    bazi_personality: { label: '八字人格分析', icon: Orbit, color: 'text-foreground-secondary' },
    tarot: { label: '塔罗占卜', icon: Gem, color: 'text-foreground-secondary' },
    liuyao: { label: '六爷占卜', icon: Dices, color: 'text-foreground-secondary' },
    mbti: { label: 'MBTI 分析', icon: Brain, color: 'text-foreground-secondary' },
    hepan: { label: '合盘分析', icon: HeartHandshake, color: 'text-foreground-secondary' },
    palm: { label: '手相分析', icon: Hand, color: 'text-foreground-secondary' },
    face: { label: '面相分析', icon: User, color: 'text-foreground-secondary' },
};

// 显示顺序
const SOURCE_TYPE_ORDER: ConversationSourceType[] = [
    'chat', 'bazi_wuxing', 'bazi_personality', 'tarot', 'liuyao', 'mbti', 'hepan', 'palm', 'face'
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
}: ConversationSidebarProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<ConversationSourceType>>(new Set());
    const [internalCollapsed, setInternalCollapsed] = useState(false);

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
            chat: [], bazi_wuxing: [], bazi_personality: [],
            tarot: [], liuyao: [], mbti: [], hepan: [],
            palm: [], face: []
        };

        filtered.forEach(conv => {
            const type = conv.sourceType || 'chat';
            if (groups[type]) {
                groups[type].push(conv);
            } else {
                groups.chat.push(conv);
            }
        });

        return groups;
    }, [conversations, searchQuery]);

    const toggleGroup = (type: ConversationSourceType) => {
        setCollapsedGroups(prev => {
            const next = new Set(prev);
            if (next.has(type)) {
                next.delete(type);
            } else {
                next.add(type);
            }
            return next;
        });
    };

    const handleStartEdit = (conv: Conversation) => {
        setEditingId(conv.id);
        setEditTitle(conv.title);
    };

    const handleSaveEdit = () => {
        if (editingId && onRename && editTitle.trim()) {
            onRename(editingId, editTitle.trim());
        }
        setEditingId(null);
        setEditTitle('');
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditTitle('');
    };

    const handleDeleteClick = (id: string) => {
        setDeleteConfirmId(id);
    };

    const handleConfirmDelete = () => {
        if (deleteConfirmId) {
            onDelete(deleteConfirmId);
            setDeleteConfirmId(null);
        }
    };

    const handleCancelDelete = () => {
        setDeleteConfirmId(null);
    };

    // 渲染单个对话项
    const renderConversationItem = (conv: Conversation) => {
        return (
            <div
                key={conv.id}
                className={`
                    group flex items-center gap-3 px-4 py-2 rounded-lg cursor-pointer
                    transition-colors text-sm
                    ${activeId === conv.id ? 'bg-background-secondary' : 'hover:bg-background-secondary'}
                `}
                onClick={() => editingId !== conv.id && onSelect(conv.id)}
            >
                {editingId === conv.id ? (
                    <div className="flex-1 flex items-center gap-1 min-w-0">
                        <input
                            type="text"
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            className="flex-1 min-w-0 px-2 py-1 text-sm bg-background border border-border rounded"
                            onClick={e => e.stopPropagation()}
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveEdit();
                                if (e.key === 'Escape') handleCancelEdit();
                            }}
                            autoFocus
                        />
                        <button
                            onClick={e => { e.stopPropagation(); handleSaveEdit(); }}
                            className="p-1.5 hover:bg-green-500/20 rounded flex-shrink-0"
                        >
                            <Check className="w-4 h-4 text-green-500" />
                        </button>
                        <button
                            onClick={e => { e.stopPropagation(); handleCancelEdit(); }}
                            className="p-1.5 hover:bg-red-500/20 rounded flex-shrink-0"
                        >
                            <X className="w-4 h-4 text-red-500" />
                        </button>
                    </div>
                ) : (
                    <>
                        <span className="flex-1 text-sm truncate min-w-0">{conv.title}</span>
                        <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {onRename && conv.sourceType === 'chat' && (
                                <button
                                    onClick={e => { e.stopPropagation(); handleStartEdit(conv); }}
                                    className="p-1.5 hover:bg-background-tertiary rounded"
                                >
                                    <Pencil className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={e => { e.stopPropagation(); handleDeleteClick(conv.id); }}
                                className="p-1.5 hover:bg-red-500/20 rounded"
                            >
                                <Trash2 className="w-4 h-4 text-red-500" />
                            </button>
                        </div>
                    </>
                )}
            </div>
        );
    };

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
                    fixed lg:relative top-14 lg:top-0 bottom-14 lg:bottom-0 left-0 z-50
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
                        bg-background border-r border-border
                        flex flex-col
                        transition-all duration-300
                        shadow-2xl lg:shadow-none
                        rounded-r-2xl lg:rounded-none
                    `}
                >
                    {/* 操作按钮 (新聊天、搜索) */}
                    <div className="px-2 py-2 space-y-1">
                        <div className={`flex items-center gap-1 ${isCollapsed ? 'flex-col' : ''}`}>
                            <button
                                onClick={onNew}
                                className={`flex items-center gap-3 px-3 py-2.5 h-12 rounded-lg hover:bg-background-secondary transition-colors text-sm ${isCollapsed ? 'lg:justify-center w-full' : 'flex-1'}`}
                                title="新聊天"
                            >
                                <SquarePen className="w-5 h-5 flex-shrink-0" />
                                <span className={`${isCollapsed ? 'lg:hidden' : ''} whitespace-nowrap`}>新聊天</span>
                            </button>

                            {/* 桌面端：折叠/展开按钮 */}
                            <button
                                onClick={() => handleCollapse(!isCollapsed)}
                                className={`
                                    hidden lg:flex items-center justify-center 
                                    p-2.5 h-12 w-10 
                                    rounded-lg hover:bg-background-secondary transition-colors text-foreground-secondary hover:text-foreground
                                    ${isCollapsed ? 'order-first w-full h-10' : ''}
                                `}
                                title={isCollapsed ? "展开侧边栏" : "收起侧边栏"}
                            >
                                {isCollapsed ? (
                                    <PanelLeft className="w-5 h-5" />
                                ) : (
                                    <PanelLeftClose className="w-5 h-5" />
                                )}
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                if (isCollapsed) {
                                    handleCollapse(false);
                                }
                                setIsSearching(!isSearching);
                            }}
                            className={`flex items-center gap-3 px-3 py-2.5 h-12 rounded-lg transition-colors text-sm ${isSearching ? 'bg-background-secondary' : 'hover:bg-background-secondary'} ${isCollapsed ? 'lg:justify-center' : 'w-full'}`}
                            title="搜索聊天"
                        >
                            <Search className="w-5 h-5 flex-shrink-0" />
                            <span className={`${isCollapsed ? 'lg:hidden' : ''} whitespace-nowrap`}>搜索聊天</span>
                        </button>
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
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center text-foreground-secondary text-sm py-8 gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    <span>加载中...</span>
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
                                                className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-foreground-secondary hover:text-foreground transition-colors"
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
                        console.log('toggle clicked', isOpen);
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

            {/* 删除确认弹窗 */}
            {deleteConfirmId && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/50" onClick={handleCancelDelete} />
                    <div className="relative bg-background rounded-xl border border-border shadow-xl p-6 max-w-sm w-full">
                        <h3 className="text-lg font-semibold mb-2">确认删除</h3>
                        <p className="text-foreground-secondary mb-6">
                            确定要删除这个对话记录吗？此操作无法撤销。
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={handleCancelDelete}
                                className="px-4 py-2 rounded-lg border border-border hover:bg-background-secondary transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                className="px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
                            >
                                删除
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
