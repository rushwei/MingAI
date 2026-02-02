/**
 * 数据来源标签组件
 *
 * 'use client' 标记说明：
 * - 使用 Next.js Link 组件进行客户端导航
 */
'use client';

import Link from 'next/link';
import { BookOpenText, AtSign, FileText } from 'lucide-react';
import type { InjectedSource } from '@/types';

function getSourceHref(source: InjectedSource): string {
    if (source.type === 'knowledge_base') {
        return `/api/knowledge-base/${source.id}`;
    }
    if (source.type === 'mention' || source.type === 'data_source') {
        const type = source.sourceType || '';
        if (!type) return '#';
        return `/api/data-sources/${encodeURIComponent(type)}/${encodeURIComponent(source.id)}`;
    }
    return '#';
}

function getSourceIcon(type: InjectedSource['type']) {
    if (type === 'knowledge_base') return <BookOpenText className="w-3 h-3" />;
    if (type === 'mention') return <AtSign className="w-3 h-3" />;
    return <FileText className="w-3 h-3" />;
}

export function SourceBadge({ source }: { source: InjectedSource }) {
    const href = getSourceHref(source);
    const icon = getSourceIcon(source.type);

    return (
        <Link
            href={href}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs bg-accent/10 hover:bg-accent/20"
            title={source.preview}
            target={href.startsWith('/api/') ? '_blank' : undefined}
        >
            {icon}
            <span className="max-w-[200px] truncate">{source.name}</span>
            {source.truncated && <span className="text-muted-foreground">(部分)</span>}
        </Link>
    );
}
