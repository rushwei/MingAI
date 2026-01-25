import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext, getServiceRoleClient } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { chartId, payload } = body as {
            chartId?: string;
            payload?: Record<string, unknown>;
        };

        if (!chartId || !payload) {
            return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
        }

        const { user } = await getAuthContext(request);
        if (!user) {
            return NextResponse.json({ error: '未登录或登录已过期' }, { status: 401 });
        }

        const supabase = getServiceRoleClient();
        const sanitizedPayload = { ...payload };
        delete (sanitizedPayload as { user_id?: unknown }).user_id;
        delete (sanitizedPayload as { id?: unknown }).id;
        const { data, error } = await supabase
            .from('bazi_charts')
            .update(sanitizedPayload)
            .eq('id', chartId)
            .eq('user_id', user.id)
            .select('id')
            .maybeSingle();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        if (!data) {
            return NextResponse.json({ error: '未找到可更新的命盘' }, { status: 404 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Update bazi chart failed:', error);
        return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }
}
