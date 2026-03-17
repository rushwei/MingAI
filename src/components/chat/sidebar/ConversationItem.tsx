/**
 * 单个对话行组件
 *
 * 'use client' 标记说明：
 * - 需要处理用户交互事件
 */
'use client';

import { memo } from 'react';
import { Archive, Ellipsis } from 'lucide-react';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import type { Conversation } from '@/types';

interface ConversationItemProps {
    conv: Conversation;
    isActive: boolean;
    isActionActive: boolean;
    isGeneratingTitle: boolean;
    isSidebarCollapsed: boolean;
    onSelect: (id: string) => void;
    onOpenAction: (conv: Conversation, e: React.MouseEvent) => void;
}

export const ConversationItem = memo(function ConversationItem({
    conv,
    isActive,
    isActionActive,
    isGeneratingTitle,
    isSidebarCollapsed,
    onSelect,
    onOpenAction,
}: ConversationItemProps) {
    const question = typeof conv.sourceData?.question === 'string' ? conv.sourceData.question : null;

    let mainTitle = conv.title.replace(/ -> /g, ' 变 ');
    let subTitle: string | null = null;
    let changedTitle: string | null = null;

    if ((conv.sourceType === 'liuyao' || conv.sourceType === 'tarot') && mainTitle.includes(' - ')) {
        mainTitle = mainTitle.split(' - ').slice(1).join(' - ');
        subTitle = question;
    }

    if (conv.sourceType === 'liuyao' && mainTitle.includes(' 变 ')) {
        const parts = mainTitle.split(' 变 ');
        mainTitle = parts[0];
        changedTitle = parts.slice(1).join(' 变 ');
    }

    if ((conv.sourceType === 'bazi_personality' || conv.sourceType === 'bazi_wuxing') && mainTitle.includes(' - ')) {
        const parts = mainTitle.split(' - ');
        subTitle = parts[0];
        mainTitle = parts.slice(1).join(' - ');
    }

    if (conv.sourceType === 'hepan' && mainTitle.includes(' - ')) {
        const parts = mainTitle.split(' - ');
        subTitle = parts[0];
        mainTitle = parts.slice(1).join(' - ');
    }

    if ((conv.sourceType === 'palm' || conv.sourceType === 'face') && mainTitle.includes(' - ')) {
        mainTitle = mainTitle.split(' - ').slice(1).join(' - ');
    }

    return (
        <div
            className={`
                group flex ${subTitle ? 'items-start' : 'items-center'} gap-3 px-4 py-2 rounded-lg cursor-pointer
                transition-colors text-sm
                ${(isActive || isActionActive) ? 'bg-background-secondary' : 'hover:bg-background-secondary'}
            `}
            onClick={() => onSelect(conv.id)}
        >
            {isGeneratingTitle ? (
                <div className={`w-4 h-4 flex items-center justify-center flex-shrink-0 ${subTitle ? 'mt-0.5' : ''}`}>
                    <SoundWaveLoader variant="inline" />
                </div>
            ) : null}
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
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-border bg-background-tertiary text-[10px] text-foreground-secondary flex-shrink-0 ${subTitle ? 'mt-0.5' : ''}`}
                    title={
                        Array.isArray(conv.archivedKbIds) && conv.archivedKbIds.length
                            ? `已归档到 ${conv.archivedKbIds.length} 个知识库`
                            : '已归档到知识库'
                    }
                >
                    <Archive className="w-3 h-3" />
                    {!isSidebarCollapsed && <span>归档</span>}
                </span>
            )}
            <div className={`flex items-center flex-shrink-0 transition-opacity ${subTitle ? 'mt-0.5' : ''} ${isActionActive ? 'opacity-100' : 'opacity-100 lg:opacity-0 lg:group-hover:opacity-100'}`}>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onOpenAction(conv, e);
                    }}
                    className="p-1.5 hover:bg-background-tertiary rounded text-foreground-secondary hover:text-foreground"
                    aria-label="更多操作"
                >
                    <Ellipsis className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
});
