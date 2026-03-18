import { NextRequest } from 'next/server';
import { searchKnowledge } from '@/lib/knowledge-base/search';
import type { RankedResult, SearchCandidate } from '@/lib/knowledge-base/types';
import { jsonError, getAccessToken, jsonOk, requireUserContext } from '@/lib/api-utils';
import { ensureFeatureRouteEnabled } from '@/lib/feature-gate-utils';

export async function POST(request: NextRequest) {
    const featureError = await ensureFeatureRouteEnabled('knowledge-base');
    if (featureError) return featureError;
    const auth = await requireUserContext(request);
    if ('error' in auth) {
        return jsonError(auth.error.message, auth.error.status);
    }

    const token = await getAccessToken(request);

    const body = await request.json() as { query?: unknown; kbIds?: string[]; topK?: number };
    const query = typeof body.query === 'string' ? body.query.trim() : '';
    if (!query) return jsonError('query 不能为空', 400);

    const results = await searchKnowledge(query, {
        kbIds: body.kbIds,
        topK: body.topK,
        accessToken: token || undefined
    });
    const first = (results as Array<SearchCandidate | RankedResult>)[0];

    if (first && 'rank' in first) {
        return jsonOk({ candidates: [], ranked: results });
    }

    return jsonOk({ candidates: results, ranked: null });
}
