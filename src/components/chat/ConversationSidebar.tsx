'use client';

import { useState, useMemo } from 'react';
import { MessageSquare, Trash2, X, Check, Edit2, Search, ChevronDown, ChevronRight, Plus, SquarePen, Pencil, Loader2 } from 'lucide-react';
import type { Conversation } from '@/types';

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
}

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
}: ConversationSidebarProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [isHistoryCollapsed, setIsHistoryCollapsed] = useState(false);

    // 过滤对话列表
    const filteredConversations = useMemo(() => {
        if (!searchQuery.trim()) return conversations;
        const query = searchQuery.toLowerCase();
        return conversations.filter(conv => {
            const title = conv.title ?? '';
            return title.toLowerCase().includes(query);
        });
    }, [conversations, searchQuery]);

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
                    fixed lg:relative top-0 left-0 h-full w-72 z-50
                    bg-background border-r border-border
                    transform transition-transform duration-300
                    ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
                    flex flex-col
                `}
            >
                {/* 头部 - 只有关闭按钮 */}
                <div className="flex items-center justify-end p-3 lg:hidden">
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-background-secondary transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* 操作按钮 */}
                <div className="px-3 py-2 space-y-1">
                    <button
                        onClick={onNew}
                        className="flex items-center gap-3 w-full px-3 py-2.5 h-12 rounded-lg hover:bg-background-secondary transition-colors text-sm"
                    >
                        <SquarePen className="w-4.5 h-4.5" />
                        <span>新聊天</span>
                    </button>
                    <button
                        onClick={() => setIsSearching(!isSearching)}
                        className={`flex items-center gap-3 w-full px-3 py-2.5 h-12 rounded-lg transition-colors text-sm ${isSearching ? 'bg-background-secondary' : 'hover:bg-background-secondary'
                            }`}
                    >
                        <Search className="w-4.5 h-4.5" />
                        <span>搜索聊天</span>
                    </button>
                </div>

                {/* 搜索框 */}
                {isSearching && (
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

                {/* 对话历史标题 - 可折叠 */}
                <button
                    onClick={() => setIsHistoryCollapsed(!isHistoryCollapsed)}
                    className="flex items-center gap-2 px-6 py-2 text-xs text-foreground-secondary transition-colors"
                >
                    <span>对话历史 </span>
                    {isHistoryCollapsed ? (
                        <ChevronRight className="w-3 h-3" />
                    ) : (
                        <ChevronDown className="w-3 h-3" />
                    )}
                </button>

                {/* 对话列表 */}
                {!isHistoryCollapsed && (
                    <div className="flex-1 overflow-y-auto p-2">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center text-foreground-secondary text-sm py-8 gap-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span>加载中...</span>
                            </div>
                        ) : filteredConversations.length === 0 ? (
                            <div className="text-center text-foreground-secondary text-sm py-8">
                                {searchQuery ? '未找到匹配的对话' : '暂无对话记录'}
                            </div>
                        ) : (
                            <div className="space-y-1">
                                {filteredConversations.map(conv => (
                                    <div
                                        key={conv.id}
                                        className={`
                                            group flex items-center gap-3 px-4 py-2.5 rounded-lg cursor-pointer
                                            transition-colors text-sm
                                            ${activeId === conv.id
                                                ? 'bg-background-secondary'
                                                : 'hover:bg-background-secondary'
                                            }
                                        `}
                                        onClick={() => {
                                            if (editingId !== conv.id) {
                                                onSelect(conv.id);
                                            }
                                        }}
                                    >
                                        <MessageSquare className="w-4.5 h-4.5 flex-shrink-0" />

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
                                                <span className="flex-1 text-sm truncate min-w-0">
                                                    {conv.title}
                                                </span>
                                                <div className="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {onRename && (
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
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {isHistoryCollapsed && <div className="flex-1" />}
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
