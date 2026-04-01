export const DATA_SOURCE_TYPES = [
    'bazi_chart',
    'ziwei_chart',
    'tarot_reading',
    'liuyao_divination',
    'mbti_reading',
    'hepan_chart',
    'face_reading',
    'palm_reading',
    'ming_record',
    'daily_fortune',
    'monthly_fortune',
    'qimen_chart',
    'daliuren_divination',
] as const;

export type DataSourceType = typeof DATA_SOURCE_TYPES[number];

import type { SupabaseClient } from '@supabase/supabase-js';
import type { ChartTextDetailLevel } from '@/lib/divination/detail-level';

export interface DataSourceSummary {
    id: string;
    type: DataSourceType;
    name: string;
    preview: string;
    createdAt: string;
    hepanType?: 'love' | 'business' | 'family';
}

export type DataSourceLoadError = { type: DataSourceType; message: string };

export type DataSourceQueryContext = {
    client?: SupabaseClient;
    limit?: number;
    maxTokens?: number;
    maxChars?: number;
    chartPromptDetailLevel?: ChartTextDetailLevel;
};

export interface DataSourceProvider<T = unknown> {
    type: DataSourceType;
    displayName: string;
    list(userId: string, ctx?: DataSourceQueryContext): Promise<DataSourceSummary[]>;
    get(id: string, userId: string, ctx?: DataSourceQueryContext): Promise<T | null>;
    formatForAI(data: T, ctx?: DataSourceQueryContext): string;
    summarize(data: T): string;
}
