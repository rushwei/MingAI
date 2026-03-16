import 'server-only';

import type { AIModelConfig, AIVendor } from '@/types';
import {
  buildModels,
  clearModelCache as clearSharedModelCache,
} from '@/lib/ai/ai-config';
import { getSystemAdminClient } from '@/lib/supabase-server';

interface DBModelSourceRow {
  is_active: boolean;
  api_url: string;
  api_key_env_var: string;
  model_id_override: string | null;
  reasoning_model_id: string | null;
  source_key: string | null;
}

interface DBModelRow {
  model_key: string;
  display_name: string;
  vendor: string;
  supports_reasoning: boolean;
  is_reasoning_default: boolean;
  supports_vision: boolean;
  default_temperature: number | string | null;
  default_max_tokens: number;
  required_tier?: AIModelConfig['requiredTier'];
  reasoning_required_tier?: AIModelConfig['reasoningRequiredTier'];
  sources?: DBModelSourceRow[];
}

let dbModelsCache: AIModelConfig[] | null = null;
let dbLastFetch = 0;
const DB_CACHE_TTL = 5 * 60 * 1000;

function mapDbModelRows(rows: DBModelRow[]): AIModelConfig[] {
  return rows
    .map((row) => {
      const activeSource = row.sources?.find((source) => source.is_active);
      if (!activeSource) {
        return null;
      }

      return {
        id: row.model_key,
        name: row.display_name,
        vendor: row.vendor as AIVendor,
        modelId: activeSource.model_id_override || row.model_key,
        apiUrl: activeSource.api_url,
        apiKeyEnvVar: activeSource.api_key_env_var,
        supportsReasoning: row.supports_reasoning,
        reasoningModelId: activeSource.reasoning_model_id || undefined,
        isReasoningDefault: row.is_reasoning_default,
        supportsVision: row.supports_vision,
        defaultTemperature:
          row.default_temperature != null
            ? Number.parseFloat(String(row.default_temperature))
            : undefined,
        defaultMaxTokens: row.default_max_tokens,
        requiredTier: row.required_tier,
        reasoningRequiredTier: row.reasoning_required_tier,
        sourceKey: activeSource.source_key || undefined,
      } as AIModelConfig;
    })
    .filter((item): item is AIModelConfig => item !== null);
}

async function fetchModelsFromDB(): Promise<AIModelConfig[] | null> {
  const now = Date.now();
  if (dbModelsCache && now - dbLastFetch < DB_CACHE_TTL) {
    return dbModelsCache;
  }

  let supabase;
  try {
    supabase = getSystemAdminClient();
  } catch (error) {
    console.warn('[ai-config/server] Supabase client unavailable, fallback to env models:', error);
    return null;
  }

  const modelQuery = supabase.from('ai_models') as unknown as {
    select?: (columns: string) => {
      eq: (column: string, value: unknown) => {
        order: (column: string, options: { ascending: boolean }) => Promise<{
          data: unknown[] | null;
          error: unknown;
        }>;
      };
    };
  };
  if (!modelQuery?.select) {
    return null;
  }

  let data: unknown[] | null = null;
  let error: unknown = null;
  try {
    const result = await modelQuery
      .select(`
        *,
        sources:ai_model_sources(*)
      `)
      .eq('is_enabled', true)
      .order('sort_order', { ascending: true });
    data = result.data;
    error = result.error;
  } catch {
    return null;
  }

  if (error || !data || data.length === 0) {
    if (error) {
      console.error('[ai-config/server] Failed to fetch from DB:', error);
    }
    return null;
  }

  dbModelsCache = mapDbModelRows(data as DBModelRow[]);
  dbLastFetch = now;
  return dbModelsCache;
}

export async function getModelsAsync(): Promise<AIModelConfig[]> {
  const dbModels = await fetchModelsFromDB();
  if (dbModels && dbModels.length > 0) {
    return dbModels;
  }
  return buildModels();
}

export async function getModelConfigAsync(
  modelId: string
): Promise<AIModelConfig | undefined> {
  const models = await getModelsAsync();
  const direct = models.find((model) => model.id === modelId);
  if (direct) return direct;
  if (modelId === 'deepseek-chat' || modelId === 'deepseek') {
    return models.find((model) => model.id === 'deepseek-v3.2');
  }
  return undefined;
}

export function clearModelCache(): void {
  clearSharedModelCache();
  dbModelsCache = null;
  dbLastFetch = 0;
  console.info('[ai-config/server] Model cache cleared');
}
