import '@/lib/data-sources/init';

import { NextRequest, NextResponse } from 'next/server';
import { getProvider } from '@/lib/data-sources';
import type { DataSourceType } from '@/lib/data-sources/types';
import { getAuthContext, jsonError, getAccessToken, createAuthedClient } from '@/lib/api-utils';

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ type: string; id: string }> }
) {
    const { user } = await getAuthContext(_request);
    if (!user) return jsonError('请先登录', 401);

    const { type, id } = await params;
    try {
        const accessToken = await getAccessToken(_request);
        const authed = accessToken ? createAuthedClient(accessToken) : undefined;

        const provider = await getProvider(type as DataSourceType);
        const data = await provider.get(id, user.id, { client: authed });
        if (!data) return jsonError('数据不存在', 404);
        return NextResponse.json({
            type: provider.type,
            id,
            displayName: provider.displayName,
            summary: provider.summarize(data),
            content: provider.formatForAI(data),
            raw: data
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'unknown error';
        return NextResponse.json({ error: '获取数据源失败', message }, { status: 400 });
    }
}
