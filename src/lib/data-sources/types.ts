import type { SupabaseClient } from '@supabase/supabase-js';
import type { DataSourceType } from '@/lib/data-sources/contracts';

export type { DataSourceType } from '@/lib/data-sources/contracts';

export interface DataSourceSummary {
    id: string;
    type: DataSourceType;
    name: string;
    preview: string;
    createdAt: string;
    hepanType?: 'love' | 'business' | 'family';
}

export type DataSourceQueryContext = {
    client?: SupabaseClient;
    limit?: number;
    maxTokens?: number;
    maxChars?: number;
};

export interface DataSourceProvider<T = unknown> {
    type: DataSourceType;
    displayName: string;
    list(userId: string, ctx?: DataSourceQueryContext): Promise<DataSourceSummary[]>;
    get(id: string, userId: string, ctx?: DataSourceQueryContext): Promise<T | null>;
    formatForAI(data: T): string;
    summarize(data: T): string;
}
