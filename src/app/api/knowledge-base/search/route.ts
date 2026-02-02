import { NextRequest, NextResponse } from 'next/server';
import { searchKnowledge } from '@/lib/knowledge-base/search';
import type { RankedResult, SearchCandidate } from '@/lib/knowledge-base/types';
import { getAuthContext, jsonError, getAccessToken } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
    const { user } = await getAuthContext(request);
    if (!user) return jsonError('请先登录', 401);

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
        return NextResponse.json({ candidates: [], ranked: results });
    }

    return NextResponse.json({ candidates: results, ranked: null });
}
