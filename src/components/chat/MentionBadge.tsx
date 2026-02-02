/**
 * @提及标签组件
 *
 * 'use client' 标记说明：
 * - 有移除按钮交互功能
 */
'use client';

import { X, AtSign, BookOpenText, FileText } from 'lucide-react';
import type { Mention } from '@/types';

interface MentionBadgeProps {
    mention: Mention;
    onRemove: () => void;
}

function getIcon(type: Mention['type']) {
    if (type === 'knowledge_base') return <BookOpenText className="w-3 h-3" />;
    if (type === 'bazi_chart' || type === 'ziwei_chart' || type === 'ming_record') return <FileText className="w-3 h-3" />;
    return <AtSign className="w-3 h-3" />;
}

export function MentionBadge({ mention, onRemove }: MentionBadgeProps) {
    return (
        <div
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs bg-background-secondary border border-border"
            title={mention.preview}
        >
            {getIcon(mention.type)}
            <span className="max-w-[180px] truncate">{mention.name}</span>
            <button
                type="button"
                onClick={onRemove}
                className="ml-0.5 p-0.5 rounded hover:bg-background-tertiary text-foreground-secondary hover:text-foreground transition-colors"
                aria-label="移除提及"
            >
                <X className="w-3 h-3" />
            </button>
        </div>
    );
}
