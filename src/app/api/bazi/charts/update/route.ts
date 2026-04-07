import { NextRequest } from 'next/server';
import { requireUserContext, getSystemAdminClient, jsonError, jsonOk } from '@/lib/api-utils';
import { isValidBirthTimeString } from '@/lib/divination/birth-time';
import { calculateBaziOutputFromStoredFields } from '@/lib/divination/bazi-record';
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

        // 4. 业务逻辑
        const supabase = getSystemAdminClient();
        const { data: existingChart, error: existingChartError } = await supabase
            .from('bazi_charts')
            .select('id, user_id, gender, birth_date, birth_time, birth_place, longitude, calendar_type, is_leap_month')
            .eq('id', chartId)
            .eq('user_id', user.id)
            .maybeSingle();

        if (existingChartError) {
            return jsonError(existingChartError.message, 500);
        }

        if (!existingChart) {
            return jsonError('未找到可更新的命盘', 404);
        }

        // 基于“旧记录 + 新字段”重算 day_master / day_branch，避免部分更新留下陈旧派生字段
        const recalculationInput = {
            ...existingChart,
            ...sanitizedPayload,
        };
        if (!isValidBirthTimeString(recalculationInput.birth_time)) {
            return jsonError('八字命盘必须提供有效的出生时辰', 400);
        }
        const output = calculateBaziOutputFromStoredFields(recalculationInput);
        if (output) {
            (sanitizedPayload as Record<string, unknown>).day_master = output.dayMaster;
            (sanitizedPayload as Record<string, unknown>).day_branch = output.fourPillars.day.branch;
        }

        const { data, error } = await supabase
            .from('bazi_charts')
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
        console.error('Update bazi chart failed:', error);
        return jsonError('更新失败', 500);
    }
}
