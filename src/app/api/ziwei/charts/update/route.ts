import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServiceClient } from '@/lib/supabase-server';

const getAuthClient = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

        const authClient = getAuthClient();
        let userId: string | null = null;

        const authHeader = request.headers.get('authorization');
        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            const { data: { user } } = await authClient.auth.getUser(token);
            userId = user?.id || null;
        }

        if (!userId) {
            const accessToken = request.cookies.get('sb-access-token')?.value;
            if (accessToken) {
                const { data: { user } } = await authClient.auth.getUser(accessToken);
                userId = user?.id || null;
            }
        }

        if (!userId) {
            return NextResponse.json({ error: '未登录或登录已过期' }, { status: 401 });
        }

        const supabase = getServiceClient();
        const sanitizedPayload = { ...payload };
        delete (sanitizedPayload as { user_id?: unknown }).user_id;
        delete (sanitizedPayload as { id?: unknown }).id;
        const { data, error } = await supabase
            .from('ziwei_charts')
            .update(sanitizedPayload)
            .eq('id', chartId)
            .eq('user_id', userId)
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
        console.error('Update ziwei chart failed:', error);
        return NextResponse.json({ error: '更新失败' }, { status: 500 });
    }
}
