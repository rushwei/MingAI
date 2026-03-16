import { NextRequest } from 'next/server';
import { requireUserContext, getSystemAdminClient, jsonError, jsonOk } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { chartId, payload } = body as {
            chartId?: string;
            payload?: Record<string, unknown>;
        };

        if (!chartId || !payload) {
            return jsonError('缺少必要参数', 400);
        }

        const auth = await requireUserContext(request);
        if ('error' in auth) {
            return jsonError(auth.error.message, auth.error.status);
        }
        const { user } = auth;

        const supabase = getSystemAdminClient();
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
