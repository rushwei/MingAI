import { type NextRequest } from 'next/server';
import { jsonError, jsonOk, requireUserContext } from '@/lib/api-utils';

type ChartType = 'bazi' | 'ziwei';

type ChartRecord = {
    id: string;
    name: string;
    gender: 'male' | 'female' | null;
    birth_date: string;
    birth_time: string | null;
    birth_place: string | null;
    longitude?: number | null;
    calendar_type?: string | null;
    is_leap_month?: boolean | null;
    created_at: string;
};

function isChartType(value: unknown): value is ChartType {
    return value === 'bazi' || value === 'ziwei';
}

function getChartTable(type: ChartType) {
    return type === 'bazi' ? 'bazi_charts' : 'ziwei_charts';
}

export async function GET(request: NextRequest) {
    const auth = await requireUserContext(request);
    if ('error' in auth) return jsonError(auth.error.message, auth.error.status);

    const [baziResult, ziweiResult, settingsResult] = await Promise.all([
        auth.supabase
            .from('bazi_charts')
            .select('id, name, gender, birth_date, birth_time, birth_place, longitude, calendar_type, is_leap_month, created_at')
            .eq('user_id', auth.user.id)
            .order('created_at', { ascending: false }),
        auth.supabase
            .from('ziwei_charts')
            .select('id, name, gender, birth_date, birth_time, birth_place, longitude, calendar_type, is_leap_month, created_at')
            .eq('user_id', auth.user.id)
            .order('created_at', { ascending: false }),
        auth.supabase
            .from('user_settings')
            .select('default_bazi_chart_id, default_ziwei_chart_id')
            .eq('user_id', auth.user.id)
            .maybeSingle(),
    ]);

    if (baziResult.error || ziweiResult.error || settingsResult.error) {
        console.error('[user/charts] failed to load chart bundle', {
            userId: auth.user.id,
            baziError: baziResult.error?.message || null,
            ziweiError: ziweiResult.error?.message || null,
            settingsError: settingsResult.error?.message || null,
        });
        return jsonError('获取命盘列表失败', 500);
    }

    return jsonOk({
        baziCharts: (baziResult.data || []) as ChartRecord[],
        ziweiCharts: (ziweiResult.data || []) as ChartRecord[],
        defaultChartIds: {
            bazi: settingsResult.data?.default_bazi_chart_id ?? null,
            ziwei: settingsResult.data?.default_ziwei_chart_id ?? null,
        },
    });
}

export async function PATCH(request: NextRequest) {
    const auth = await requireUserContext(request);
    if ('error' in auth) return jsonError(auth.error.message, auth.error.status);

    let body: { type?: unknown; id?: unknown };
    try {
        body = await request.json() as { type?: unknown; id?: unknown };
    } catch {
        return jsonError('请求体不是合法 JSON', 400);
    }

    if (!isChartType(body.type) || typeof body.id !== 'string' || !body.id.trim()) {
        return jsonError('缺少有效的命盘类型或命盘 ID', 400);
    }

    const field = body.type === 'bazi' ? 'default_bazi_chart_id' : 'default_ziwei_chart_id';
    const payload = {
        user_id: auth.user.id,
        [field]: body.id,
        updated_at: new Date().toISOString(),
    };

    const { data, error } = await auth.supabase
        .from('user_settings')
        .upsert(payload, { onConflict: 'user_id' })
        .select('default_bazi_chart_id, default_ziwei_chart_id')
        .maybeSingle();

    if (error) {
        return jsonError('设置默认命盘失败', 500);
    }

    return jsonOk({
        defaultChartIds: {
            bazi: data?.default_bazi_chart_id ?? null,
            ziwei: data?.default_ziwei_chart_id ?? null,
        },
    });
}

export async function DELETE(request: NextRequest) {
    const auth = await requireUserContext(request);
    if ('error' in auth) return jsonError(auth.error.message, auth.error.status);

    const type = request.nextUrl.searchParams.get('type');
    const id = request.nextUrl.searchParams.get('id');

    if (!isChartType(type) || !id) {
        return jsonError('缺少有效的命盘类型或命盘 ID', 400);
    }

    const { error } = await auth.supabase
        .from(getChartTable(type))
        .delete()
        .eq('id', id)
        .eq('user_id', auth.user.id);

    if (error) {
        return jsonError('删除命盘失败', 500);
    }

    return jsonOk({ success: true });
}
