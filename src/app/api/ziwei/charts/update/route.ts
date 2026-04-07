import { NextRequest } from 'next/server';
import { getSystemAdminClient, jsonError, jsonOk, requireUserContext } from '@/lib/api-utils';
import { isValidBirthTimeString } from '@/lib/divination/birth-time';
import { isValidUUID } from '@/lib/validation';

const ALLOWED_FIELDS = [
    'name',
    'birth_date',
    'birth_time',
    'gender',
    'birth_place',
    'longitude',
    'is_leap_month',
    'calendar_type',
] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

export async function POST(request: NextRequest) {
    try {
        // 1. 鉴权
        const auth = await requireUserContext(request);
        if ('error' in auth) {
            return jsonError(auth.error.message, auth.error.status);
        }
        const { user } = auth;

        // 2. 参数解析
        const body = await request.json();
        const { chartId, payload } = body as {
            chartId?: string;
            payload?: Record<string, unknown>;
        };

        // 3. 参数校验
        if (!chartId || !payload) {
            return jsonError('缺少必要参数', 400);
        }

        if (!isValidUUID(chartId)) {
            return jsonError('chartId 格式不合法', 400);
        }

        // 白名单过滤 payload
        const sanitizedPayload: Partial<Record<AllowedField, unknown>> = {};
        for (const key of ALLOWED_FIELDS) {
            if (key in payload) {
                sanitizedPayload[key] = payload[key];
            }
        }

        if (Object.keys(sanitizedPayload).length === 0) {
            return jsonError('没有可更新的字段', 400);
        }

        if (
            'birth_time' in sanitizedPayload
            && !isValidBirthTimeString(sanitizedPayload.birth_time)
        ) {
            return jsonError('紫微命盘必须提供有效的出生时辰', 400);
        }

        // 4. 业务逻辑
        const supabase = getSystemAdminClient();
        const { data, error } = await supabase
            .from('ziwei_charts')
            .update(sanitizedPayload)
            .eq('id', chartId)
            .eq('user_id', user.id)
            .select('id')
            .maybeSingle();

        if (error) {
            return jsonError(error.message, 500);
        }

        if (!data) {
            return jsonError('未找到可更新的命盘', 404);
        }

        return jsonOk({ success: true });
    } catch (error) {
        console.error('Update ziwei chart failed:', error);
        return jsonError('更新失败', 500);
    }
}
