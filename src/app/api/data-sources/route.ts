import '@/lib/data-sources/init';

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getUserDataSourcesWithErrors } from '@/lib/data-sources';
import { getAuthContext, jsonError } from '@/lib/api-utils';

const CACHE_TTL_MS = 15_000;
const cache = new Map<string, { expiresAt: number; status: number; payload: unknown }>();

export async function GET(request: NextRequest) {
    const { supabase, user } = await getAuthContext(request);
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
        if (!fresh && cached && cached.expiresAt > Date.now()) {
            return NextResponse.json(cached.payload, { status: cached.status });
        }

        const bearer = request.headers.get('authorization');
        const token = bearer?.replace(/Bearer\s+/i, '');
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = token || session?.access_token || null;
        const authed = accessToken
            ? createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                { global: { headers: { Authorization: `Bearer ${accessToken}` } }, auth: { persistSession: false } }
            )
            : undefined;

        const result = await getUserDataSourcesWithErrors(user.id, { client: authed, limit });
        const status = result.errors.length ? 206 : 200;
        cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, status, payload: result });
        return NextResponse.json(result, { status });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown error';
        return NextResponse.json({ error: '加载数据源失败', message }, { status: 500 });
    }
}
