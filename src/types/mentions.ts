import type { DataSourceType } from '@/lib/data-sources/types';

export type MentionType = 'knowledge_base' | DataSourceType;

export interface Mention {
    type: MentionType;
    id?: string;
    name: string;
    preview: string;
}

export interface MentionTarget {
    id: string;
    type: MentionType;
    name: string;
    preview: string;
}
