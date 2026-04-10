import { NextRequest } from 'next/server';
import { getSystemAdminClient, jsonError, jsonOk, requireBearerUser } from '@/lib/api-utils';

type CreditTransactionRow = {
    id: string;
    amount: number;
    type: 'earn' | 'spend' | 'refund';
    source: string;
    description: string | null;
    balance_after: number | null;
    reference_type: string | null;
    reference_id: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
};

export async function GET(request: NextRequest) {
    try {
        const auth = await requireBearerUser(request);
        if ('error' in auth) {
            return jsonError(auth.error.message, auth.error.status);
        }

        const limitParam = Number.parseInt(new URL(request.url).searchParams.get('limit') || '100', 10);
        const limit = Number.isFinite(limitParam)
            ? Math.min(Math.max(limitParam, 1), 200)
            : 100;

        const supabase = getSystemAdminClient();
        const { data, error } = await supabase
            .from('credit_transactions')
            .select('id, amount, type, source, description, balance_after, reference_type, reference_id, metadata, created_at')
            .eq('user_id', auth.user.id)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('[credits/transactions] Failed to load transactions:', error);
            return jsonError('获取积分流水失败', 500);
        }

        return jsonOk({ data: (data || []) as CreditTransactionRow[] });
    } catch (error) {
        console.error('[credits/transactions] Error:', error);
        return jsonError('服务器错误', 500);
    }
}
