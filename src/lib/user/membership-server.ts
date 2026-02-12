import { getServiceRoleClient } from "@/lib/api-utils";
import type { MembershipType } from "@/lib/user/membership";

export async function getEffectiveMembershipType(userId: string): Promise<MembershipType> {
    try {
        const supabase = getServiceRoleClient();
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
