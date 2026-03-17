import { DATA_SOURCE_TYPES, type DataSourceType } from '@/lib/data-sources/contracts';

export const CONVERSATION_SOURCE_TYPES = [
  'chat',
  'bazi_wuxing',
  'bazi_personality',
  'tarot',
  'liuyao',
  'mbti',
  'hepan',
  'palm',
  'face',
  'dream',
  'qimen',
  'daliuren',
] as const;

export type ConversationSourceType = typeof CONVERSATION_SOURCE_TYPES[number];

export type FeatureUsageBucket =
  | 'chat'
  | 'bazi'
  | 'ziwei'
  | 'liuyao'
  | 'tarot'
  | 'palm'
  | 'face'
  | 'mbti'
  | 'hepan'
  | 'fortune'
  | 'dream'
  | 'qimen'
  | 'daliuren';

type SourceContractMeta = {
  featureUsageBucket: FeatureUsageBucket;
  questionField?: string;
};

const SOURCE_META: Record<ConversationSourceType, SourceContractMeta> = {
  chat: { featureUsageBucket: 'chat' },
  bazi_wuxing: { featureUsageBucket: 'bazi' },
  bazi_personality: { featureUsageBucket: 'bazi' },
  tarot: { featureUsageBucket: 'tarot', questionField: 'question' },
  liuyao: { featureUsageBucket: 'liuyao', questionField: 'question' },
  mbti: { featureUsageBucket: 'mbti' },
  hepan: { featureUsageBucket: 'hepan' },
  palm: { featureUsageBucket: 'palm' },
  face: { featureUsageBucket: 'face' },
  dream: { featureUsageBucket: 'dream', questionField: 'dreamContent' },
  qimen: { featureUsageBucket: 'qimen', questionField: 'question' },
  daliuren: { featureUsageBucket: 'daliuren', questionField: 'question' },
};

const CONVERSATION_SOURCE_TYPE_SET = new Set<string>(CONVERSATION_SOURCE_TYPES);

export const ARCHIVED_SOURCE_TYPES = [...DATA_SOURCE_TYPES] as DataSourceType[];

export function isConversationSourceType(value: unknown): value is ConversationSourceType {
  return typeof value === 'string' && CONVERSATION_SOURCE_TYPE_SET.has(value);
}

export function normalizeConversationSourceType(value?: string | null): ConversationSourceType {
  return isConversationSourceType(value) ? value : 'chat';
}

export function toFeatureUsageBucket(sourceType?: string | null): FeatureUsageBucket {
  return SOURCE_META[normalizeConversationSourceType(sourceType)].featureUsageBucket;
}

export function getSourceQuestion(
  sourceType?: string | null,
  sourceData?: Record<string, unknown> | null,
): string | null {
  if (!sourceData) return null;
  const field = SOURCE_META[normalizeConversationSourceType(sourceType)].questionField;
  if (!field) return null;
  const value = sourceData[field];
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}
