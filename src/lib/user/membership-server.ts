import { getSystemAdminClient } from "@/lib/api-utils";
import type { MembershipType } from "@/lib/user/membership";

export async function getEffectiveMembershipType(userId: string): Promise<MembershipType> {
    try {
        const supabase = getSystemAdminClient();
        const { data, error } = await supabase
            .from("users")
            .select("membership, membership_expires_at")
            .eq("id", userId)
            .maybeSingle();

        if (error || !data) {
            if (error) {
                console.error("[membership] Failed to fetch membership:", error.message);
            }
            return "free";
        }

        const membership = (data.membership || "free") as MembershipType;
        const expiresAt = data.membership_expires_at
            ? new Date(data.membership_expires_at)
            : null;

        if (membership !== "free" && expiresAt && expiresAt <= new Date()) {
            return "free";
        }

        return membership;
    } catch (error) {
        console.error("[membership] Failed to resolve membership:", error);
        return "free";
    }
}

/**
 * 通过 access token 解析当前用户的有效会员等级
 * 统一入口，避免各模块重复实现 token -> userId -> membership 链路
 */
export async function resolveTokenMembership(accessToken?: string): Promise<MembershipType> {
    if (!accessToken) return 'free';
    try {
        const { createAuthedClient } = await import('@/lib/api-utils');
        const supabase = createAuthedClient(accessToken);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return 'free';
        return await getEffectiveMembershipType(user.id);
    } catch {
        return 'free';
    }
}
