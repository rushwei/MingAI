import {
  CONVERSATION_SOURCE_TYPES,
  normalizeConversationSourceType,
  type ConversationSourceType,
} from '@/lib/source-contracts';

export const ANALYSIS_SOURCE_TYPES = CONVERSATION_SOURCE_TYPES.filter(
  (value): value is Exclude<ConversationSourceType, 'dream'> => value !== 'dream',
);

export type AnalysisSourceType = Exclude<ConversationSourceType, 'dream'>;

export type CommonAnalysisSourceData = {
  schema_version?: 1;
  question?: string | null;
  model_id?: string | null;
  reasoning?: boolean | null;
  reasoning_text?: string | null;
  [key: string]: unknown;
};

export type AnalysisSourceDataMap = {
  chat: CommonAnalysisSourceData;
  bazi_wuxing: CommonAnalysisSourceData;
  bazi_personality: CommonAnalysisSourceData;
  tarot: CommonAnalysisSourceData & {
    cards?: unknown[];
    spread_id?: string | null;
  };
  liuyao: CommonAnalysisSourceData;
  mbti: CommonAnalysisSourceData;
  hepan: CommonAnalysisSourceData;
  palm: CommonAnalysisSourceData;
  face: CommonAnalysisSourceData;
  dream: CommonAnalysisSourceData;
  qimen: CommonAnalysisSourceData & {
    dun_type?: string | null;
    ju_number?: number | null;
    pan_type_label?: string | null;
    ju_method_label?: string | null;
    four_pillars?: unknown;
  };
  daliuren: CommonAnalysisSourceData & {
    ke_name?: string | null;
    day_ganzhi?: string | null;
    hour_ganzhi?: string | null;
    yue_jiang?: string | null;
  };
};

export type AnalysisSourceData<T extends AnalysisSourceType = AnalysisSourceType> =
  AnalysisSourceDataMap[T];

export function isAnalysisSourceType(value: unknown): value is AnalysisSourceType {
  return typeof value === 'string' && ANALYSIS_SOURCE_TYPES.includes(value as AnalysisSourceType);
}

export function normalizeAnalysisSourceType(value?: string | null): AnalysisSourceType {
  const normalized = normalizeConversationSourceType(value);
  return normalized === 'dream' ? 'chat' : normalized;
}

export function normalizeAnalysisSourceData<T extends AnalysisSourceType>(
  _sourceType: T,
  sourceData: AnalysisSourceData<T>,
): AnalysisSourceData<T> {
  return {
    schema_version: 1,
    ...sourceData,
  };
}

export function getSourceDataQuestion(sourceData?: Record<string, unknown> | null): string | undefined {
  const question = sourceData?.question;
  return typeof question === 'string' && question.trim().length > 0
    ? question.trim()
    : undefined;
}

export function getSourceDataModelId(sourceData?: Record<string, unknown> | null): string | null {
  return typeof sourceData?.model_id === 'string' && sourceData.model_id.length > 0
    ? sourceData.model_id
    : null;
}

export function getSourceDataReasoning(sourceData?: Record<string, unknown> | null): string | null {
  return typeof sourceData?.reasoning_text === 'string' && sourceData.reasoning_text.length > 0
    ? sourceData.reasoning_text
    : null;
}
