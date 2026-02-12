import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getEffectiveMembershipType } from '@/lib/user/membership-server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase-env';

export const EMBEDDING_MODELS = {
    'text-embedding-v4': { dimension: 1024, provider: 'qwen' },
    'text-embedding-v3': { dimension: 1024, provider: 'qwen' },
    'bge-large-zh-v1.5': { dimension: 1024, provider: 'local' },
    'bge-m3': { dimension: 1024, provider: 'local' }
} as const;

export type EmbeddingModel = keyof typeof EMBEDDING_MODELS;

interface EmbeddingConfig {
    model: EmbeddingModel;
    dimension: number;
    provider: 'qwen' | 'local';
    apiKey?: string;
    endpoint?: string;
}

const DEFAULT_MODEL: EmbeddingModel = 'text-embedding-v4';

async function createSupabaseClient(accessToken?: string) {
    if (accessToken) {
        return createClient(
            getSupabaseUrl(),
            getSupabaseAnonKey(),
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                }
            }
        );
    }
    const cookieStore = await cookies();
    return createServerClient(
        getSupabaseUrl(),
        getSupabaseAnonKey(),
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        for (const { name, value, options } of cookiesToSet) {
                            cookieStore.set(name, value, options);
                        }
                    } catch {
                        // 只读 cookies 上下文无法写入时忽略
                    }
                },
            },
        }
    );
}

export function getEmbeddingConfig(): EmbeddingConfig {
    const rawModel = (process.env.QWEN_EMBEDDING_MODEL || DEFAULT_MODEL) as string;
    const model = ((rawModel in EMBEDDING_MODELS ? rawModel : DEFAULT_MODEL) as EmbeddingModel);
    const modelConfig = EMBEDDING_MODELS[model] || EMBEDDING_MODELS[DEFAULT_MODEL];

    return {
        model,
        dimension: modelConfig.dimension,
        provider: modelConfig.provider,
        apiKey: modelConfig.provider === 'qwen'
            ? process.env.QWEN_EMBEDDING_API_KEY
            : undefined,
        endpoint: modelConfig.provider === 'qwen'
            ? (process.env.QWEN_EMBEDDING_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings')
            : undefined
    };
}

export function getEmbeddingDimension(): number {
    return getEmbeddingConfig().dimension;
}

async function getCurrentUserMembership(): Promise<'free' | 'plus' | 'pro'> {
    const supabase = await createSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return 'free';

    const membership = await getEffectiveMembershipType(user.id);
    if (membership === 'pro') return 'pro';
    if (membership === 'plus') return 'plus';
    return 'free';
}

export async function hasVectorCapability(): Promise<boolean> {
    const membership = await getCurrentUserMembership();
    if (membership !== 'pro') return false;

    const config = getEmbeddingConfig();
    return await checkVectorIndexExists(config.dimension);
}

export async function checkVectorIndexExists(dim: number, accessToken?: string): Promise<boolean> {
    const supabase = await createSupabaseClient(accessToken);
    const { data } = await supabase.rpc('check_vector_index_exists', { p_dim: dim });
    return data === true;
}

export async function generateEmbedding(text: string): Promise<number[] | null> {
    const config = getEmbeddingConfig();

    try {
        switch (config.provider) {
            case 'qwen':
                return await callQwenEmbedding(text, config);
            case 'local':
                return await callLocalEmbedding(text, config);
            default:
                throw new Error(`Unknown embedding provider: ${config.provider}`);
        }
    } catch {
        return null;
    }
}

export async function generateEmbeddings(texts: string[]): Promise<{
    vectors: Array<number[] | null>;
    model: string;
    dimension: number;
}> {
    const config = getEmbeddingConfig();
    const vectors: Array<number[] | null> = [];

    const batchSize = 100;
    for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchVectors = await Promise.all(batch.map(t => generateEmbedding(t)));
        vectors.push(...batchVectors);
    }

    return {
        vectors,
        model: config.model,
        dimension: config.dimension
    };
}

async function callQwenEmbedding(text: string, config: EmbeddingConfig): Promise<number[] | null> {
    const apiKey = config.apiKey || process.env.QWEN_EMBEDDING_API_KEY;
    if (!apiKey) return null;

    const endpoint = config.endpoint || process.env.QWEN_EMBEDDING_API_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings';
    const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: config.model,
            input: text
        })
    });

    if (!response.ok) return null;
    const data = await response.json() as { data?: Array<{ embedding: number[] }> };
    const embedding = data.data?.[0]?.embedding;
    if (!embedding) return null;
    return embedding;
}

async function callLocalEmbedding(_text: string, _config: EmbeddingConfig): Promise<number[] | null> {
    void _text;
    void _config;
    return null;
}
