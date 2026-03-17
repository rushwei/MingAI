/**
 * 对话分组组件（按类型分组的一个区块）
 *
 * 'use client' 标记说明：
 * - 需要处理用户交互事件（折叠/展开）
 */
'use client';

import { ChevronDown, ChevronRight } from 'lucide-react';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import type { Conversation, ConversationSourceType } from '@/types';
import { ConversationItem } from '@/components/chat/sidebar/ConversationItem';

interface ConversationGroupProps {
    type: ConversationSourceType;
    label: string;
    items: Conversation[];
    isGroupCollapsed: boolean;
    onToggleGroup: (type: ConversationSourceType) => void;
    activeId?: string;
    actionConvId?: string;
    generatingTitleConversationIds: ReadonlySet<string>;
    isSidebarCollapsed: boolean;
    onSelect: (id: string) => void;
    onOpenAction: (conv: Conversation, e: React.MouseEvent) => void;
    pendingTitle?: string | null;
    showPendingInGroup: boolean;
}

export function ConversationGroup({
    type,
    label,
    items,
    isGroupCollapsed,
    onToggleGroup,
    activeId,
    actionConvId,
    generatingTitleConversationIds,
    isSidebarCollapsed,
    onSelect,
    onOpenAction,
    pendingTitle,
    showPendingInGroup,
}: ConversationGroupProps) {
    const displayCount = items.length + (showPendingInGroup ? 1 : 0);

    return (
        <div className="mb-2">
            {/* 分组标题 */}
            <button
                onClick={() => onToggleGroup(type)}
                className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm flex items-center gap-2 w-full px-3 py-1.5 text-xs text-foreground-secondary hover:text-foreground transition-colors"
            >
                {isGroupCollapsed ? (
                    <ChevronRight className="w-3 h-3" />
                ) : (
                    <ChevronDown className="w-3 h-3" />
                )}
                <span>{label}</span>
                <span className="ml-auto text-foreground-tertiary">
                    {displayCount}
                </span>
            </button>

            {/* 分组内容 */}
            {!isGroupCollapsed && (
                <div className="space-y-0.5 mt-1">
                    {showPendingInGroup && (
                        <div className="px-3 py-2 rounded-lg bg-background-secondary/70 border border-border/60">
                            <div className="flex items-center gap-2">
                                <SoundWaveLoader variant="inline" />
                                <span className="text-sm truncate">{pendingTitle}</span>
                            </div>
                        </div>
                    )}
                    {items.map(conv => (
                        <ConversationItem
                            key={conv.id}
                            conv={conv}
                            isActive={activeId === conv.id}
                            isActionActive={actionConvId === conv.id}
                            isGeneratingTitle={generatingTitleConversationIds.has(conv.id)}
                            isSidebarCollapsed={isSidebarCollapsed}
                            onSelect={onSelect}
                            onOpenAction={onOpenAction}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
