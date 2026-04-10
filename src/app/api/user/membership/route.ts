import { type NextRequest } from 'next/server';

import { jsonError, jsonOk, requireUserContext } from '@/lib/api-utils';
import { buildMembershipInfo, type MembershipInfoSource } from '@/lib/user/membership';

export async function GET(request: NextRequest) {
    const auth = await requireUserContext(request);
    if ('error' in auth) {
        return jsonError(auth.error.message, auth.error.status);
    }

    const { data, error } = await auth.supabase
        .from('users')
        .select('membership, membership_expires_at, ai_chat_count')
        .eq('id', auth.user.id)
        .maybeSingle();

    if (error) {
        return jsonError('获取会员信息失败', 500);
    }

    return jsonOk({
        userId: auth.user.id,
        membership: data
            ? buildMembershipInfo(data as MembershipInfoSource)
            : null,
    });
}
