import '@/lib/data-sources/init';

import { NextRequest, NextResponse } from 'next/server';
import { getUserDataSourcesWithErrors } from '@/lib/data-sources';
import { getAuthContext, jsonError, getAccessToken, createAuthedClient } from '@/lib/api-utils';
import { createMemoryCache } from '@/lib/cache';

const CACHE_TTL_MS = 15_000;
const cache = createMemoryCache<{ status: number; payload: unknown }>(CACHE_TTL_MS);

export async function GET(request: NextRequest) {
    const { user } = await getAuthContext(request);
    if (!user) return jsonError('请先登录', 401);

    try {
        const url = new URL(request.url);
        const limit = (() => {
            const raw = url.searchParams.get('limit');
            const n = raw ? Number(raw) : 50;
            if (!Number.isFinite(n)) return 50;
            return Math.max(1, Math.min(200, Math.floor(n)));
        })();
        const fresh = url.searchParams.get('fresh') === '1';

        const cacheKey = `${user.id}:${limit}`;
        const cached = cache.get(cacheKey);
        if (!fresh && cached) {
            return NextResponse.json(cached.payload, { status: cached.status });
        }

        const accessToken = await getAccessToken(request);
        const authed = accessToken ? createAuthedClient(accessToken) : undefined;

        const result = await getUserDataSourcesWithErrors(user.id, { client: authed, limit });
        const status = result.errors.length ? 206 : 200;
        cache.set(cacheKey, { status, payload: result });
        return NextResponse.json(result, { status });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown error';
        return NextResponse.json({ error: '加载数据源失败', message }, { status: 500 });
    }
}
