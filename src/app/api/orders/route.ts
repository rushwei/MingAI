import { NextRequest } from 'next/server';
import { requireBearerUser, getSystemAdminClient, jsonError, jsonOk } from '@/lib/api-utils';

type OrderRecord = {
    id: string;
    product_type: string;
    amount: number;
    status: string;
    payment_method: string | null;
    created_at: string;
    paid_at: string | null;
    user_id: string | null;
};

type ActivationKeyRecord = {
    id: string;
    key_type: 'membership' | 'credits';
    membership_type: string | null;
    credits_amount: number | null;
    used_at: string | null;
};

export async function GET(request: NextRequest) {
    try {
        const auth = await requireBearerUser(request);
        if ('error' in auth) {
            return jsonError(auth.error.message, auth.error.status);
        }
        const userId = auth.user.id;
        const supabase = getSystemAdminClient();

        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('id, product_type, amount, status, payment_method, created_at, paid_at, user_id')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (ordersError) {
            return jsonError('获取订单失败', 500);
        }

        const { data: activationKeys, error: activationError } = await supabase
            .from('activation_keys')
            .select('id, key_type, membership_type, credits_amount, used_at')
            .eq('used_by', userId)
            .eq('is_used', true)
            .order('used_at', { ascending: false });

        if (activationError) {
            return jsonError('获取激活记录失败', 500);
        }

        const activationOrders: OrderRecord[] = (activationKeys as ActivationKeyRecord[] | null || [])
            .map((k) => {
                const createdAt = k.used_at || new Date().toISOString();
                const productType = k.key_type === 'membership'
                    ? (k.membership_type || 'unknown')
                    : 'pay_per_use';

                return {
                    id: `ak_${k.id}`,
                    product_type: productType,
                    amount: 0,
                    status: 'paid',
                    payment_method: 'activation_key',
                    created_at: createdAt,
                    paid_at: createdAt,
                    user_id: userId,
                };
            });

        const allOrders = [
            ...((orders as OrderRecord[] | null) || []),
            ...activationOrders,
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        return jsonOk({ data: allOrders });
    } catch (error) {
        console.error('[api/orders] Error:', error);
        return jsonError('服务器错误', 500);
    }
}
