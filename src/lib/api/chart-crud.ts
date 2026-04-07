/**
 * Chart CRUD factory — shared by bazi_charts and ziwei_charts routes.
 */

import { type NextRequest } from 'next/server';
import { calculateBaziOutputFromStoredFields } from '@/lib/divination/bazi-record';
import { isValidBirthTimeString } from '@/lib/divination/birth-time';
import { jsonError, jsonOk, requireUserContext } from '@/lib/api-utils';

interface ChartCrudConfig {
    tableName: string;
    validateCreatePayload?: (payload: Record<string, unknown>) => string | null;
}

export function validateRequiredBirthTime(payload: Record<string, unknown>): string | null {
    return isValidBirthTimeString(payload.birth_time)
        ? null
        : '紫微命盘必须提供有效的出生时辰';
}

export function createRequiredBirthTimeValidator(message: string) {
    return (payload: Record<string, unknown>): string | null => (
        isValidBirthTimeString(payload.birth_time)
            ? null
            : message
    );
}

export function createChartGetHandler(config: ChartCrudConfig) {
    return async function GET(request: NextRequest) {
        const auth = await requireUserContext(request);
        if ('error' in auth) return jsonError(auth.error.message, auth.error.status);

        const id = request.nextUrl.searchParams.get('id');
        if (!id) {
            return jsonError('缺少命盘 ID', 400);
        }

        const { data, error } = await auth.supabase
            .from(config.tableName)
            .select('*')
            .eq('id', id)
            .eq('user_id', auth.user.id)
            .maybeSingle();

        if (error) {
            return jsonError('获取命盘失败', 500);
        }
        if (!data) {
            return jsonError('命盘不存在', 404);
        }

        return jsonOk({ chart: data });
    };
}

export function createChartPostHandler(config: ChartCrudConfig) {
    return async function POST(request: NextRequest) {
        const auth = await requireUserContext(request);
        if ('error' in auth) return jsonError(auth.error.message, auth.error.status);

        let body: { payload?: Record<string, unknown> };
        try {
            body = await request.json() as { payload?: Record<string, unknown> };
        } catch {
            return jsonError('请求体不是合法 JSON', 400);
        }

        if (!body.payload || typeof body.payload !== 'object' || Array.isArray(body.payload)) {
            return jsonError('缺少有效的命盘数据', 400);
        }

        const validationError = config.validateCreatePayload?.(body.payload as Record<string, unknown>);
        if (validationError) {
            return jsonError(validationError, 400);
        }

        const payload: Record<string, unknown> = {
            ...(body.payload as Record<string, unknown>),
            user_id: auth.user.id,
        };

        // bazi_charts: 基于基础字段重算 day_master / day_branch
        if (config.tableName === 'bazi_charts') {
            const output = calculateBaziOutputFromStoredFields(payload);
            if (output) {
                payload.day_master = output.dayMaster;
                payload.day_branch = output.fourPillars.day.branch;
            }
        }

        const { data, error } = await auth.supabase
            .from(config.tableName)
            .insert(payload)
            .select('id')
            .maybeSingle();

        if (error) {
            return jsonError('保存命盘失败', 500);
        }

        return jsonOk({ id: data?.id ?? null }, 201);
    };
}
