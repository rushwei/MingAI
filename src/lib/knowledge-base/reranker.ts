import type { RankedResult, SearchCandidate } from '@/lib/knowledge-base/types';

export interface RerankerConfig {
    provider: 'qwen' | 'local';
    model: string;
    apiKey?: string;
    endpoint?: string;
}

function getRerankerConfig(): RerankerConfig {
    const provider = 'qwen';
    const model = process.env.QWEN_RERANK_MODEL_ID || 'qwen3-rerank';
    const apiKey = process.env.QWEN_RERANK_API_KEY;
    const endpoint = process.env.QWEN_RERANK_API_URL;
    return { provider, model, apiKey, endpoint };
}

export async function callReranker(
    query: string,
    candidates: SearchCandidate[],
    topK: number
): Promise<RankedResult[]> {
    const config = getRerankerConfig();
    if (config.provider === 'qwen') {
        return await callQwenReranker(query, candidates, topK, config);
    }
    return candidates.slice(0, topK).map((c, i) => ({ ...c, rank: i + 1 }));
}

async function callQwenReranker(
    query: string,
    candidates: SearchCandidate[],
    topK: number,
    config: RerankerConfig
): Promise<RankedResult[]> {
    if (!config.apiKey || !config.endpoint) {
        return candidates.slice(0, topK).map((c, i) => ({ ...c, rank: i + 1 }));
    }

    const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: config.model,
            query,
            documents: candidates.map(c => c.content),
            top_n: topK
        })
    });

    if (!response.ok) {
        return candidates.slice(0, topK).map((c, i) => ({ ...c, rank: i + 1 }));
    }

    const data = await response.json() as { results?: Array<{ index: number; relevance_score: number }> };
    const results = data.results || [];

    return results.map((r, i) => ({
        ...candidates[r.index],
        score: r.relevance_score,
        rank: i + 1
    }));
}
