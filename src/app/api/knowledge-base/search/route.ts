import { NextRequest } from 'next/server';
import { searchKnowledge } from '@/lib/knowledge-base/search';
import type { RankedResult, SearchCandidate } from '@/lib/knowledge-base/types';
import { jsonError, getAccessToken, jsonOk, requireUserContext } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
    const auth = await requireUserContext(request);
    if ('error' in auth) {
        return jsonError(auth.error.message, auth.error.status);
    }

    const token = await getAccessToken(request);

    const body = await request.json() as { query?: string; kbIds?: string[]; topK?: number };
    if (!body.query?.trim()) return jsonError('query 不能为空', 400);

    const results = await searchKnowledge(body.query, {
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
