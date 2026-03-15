import type { SupabaseClient } from '@supabase/supabase-js';

export type DataSourceType =
    | 'bazi_chart' | 'ziwei_chart'
    | 'tarot_reading' | 'liuyao_divination'
    | 'face_reading' | 'palm_reading' | 'mbti_reading'
    | 'hepan_chart' | 'ming_record'
    | 'daily_fortune' | 'monthly_fortune'
    | 'daliuren_divination';

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
