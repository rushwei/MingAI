import { getServiceClient } from "./supabase-server";

const PAYMENTS_PAUSED_KEY = "payments_paused";

export async function getPaymentsPaused(): Promise<boolean> {
    try {
        const supabase = getServiceClient();
        const { data, error } = await supabase
            .from("app_settings")
            .select("setting_value")
            .eq("setting_key", PAYMENTS_PAUSED_KEY)
            .maybeSingle();

        if (error) {
            console.error("[app-settings] Failed to read payments paused:", error.message);
            return false;
        }

        return !!data?.setting_value;
    } catch (error) {
        console.error("[app-settings] Failed to init service client:", error);
        return false;
    }
}

export async function setPaymentsPaused(paused: boolean): Promise<boolean> {
    try {
        const supabase = getServiceClient();
        const { error } = await supabase
            .from("app_settings")
            .upsert(
                {
                    setting_key: PAYMENTS_PAUSED_KEY,
                    setting_value: paused,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "setting_key" }
            );

        if (error) {
            console.error("[app-settings] Failed to update payments paused:", error.message);
            return false;
        }

        return true;
    } catch (error) {
        console.error("[app-settings] Failed to init service client:", error);
        return false;
    }
}

// 购买链接类型
export type PurchaseLinkType = 'plus' | 'pro' | 'credits';

export interface PurchaseLink {
    id: string;
    link_type: PurchaseLinkType;
    url: string;
    description: string | null;
    updated_at: string;
}

/**
 * 获取指定类型的购买链接
 */
export async function getPurchaseLink(type: PurchaseLinkType): Promise<string | null> {
    try {
        const supabase = getServiceClient();
        const { data, error } = await supabase
            .from("purchase_links")
            .select("url")
            .eq("link_type", type)
            .maybeSingle();

        if (error) {
            console.error("[app-settings] Failed to get purchase link:", error.message);
            return null;
        }

        return data?.url || null;
    } catch (error) {
        console.error("[app-settings] Failed to get purchase link:", error);
        return null;
    }
}

/**
 * 获取所有购买链接
 */
export async function getAllPurchaseLinks(): Promise<PurchaseLink[]> {
    try {
        const supabase = getServiceClient();
        const { data, error } = await supabase
            .from("purchase_links")
            .select("*")
            .order("link_type");

        if (error) {
            console.error("[app-settings] Failed to get purchase links:", error.message);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error("[app-settings] Failed to get purchase links:", error);
        return [];
    }
}

/**
 * 设置购买链接 (管理员)
 */
export async function setPurchaseLink(
    type: PurchaseLinkType,
    url: string,
    description?: string,
    updatedBy?: string
): Promise<boolean> {
    try {
        const supabase = getServiceClient();
        const { error } = await supabase
            .from("purchase_links")
            .upsert(
                {
                    link_type: type,
                    url,
                    description: description || null,
                    updated_by: updatedBy || null,
                    updated_at: new Date().toISOString(),
                },
                { onConflict: "link_type" }
            );

        if (error) {
            console.error("[app-settings] Failed to set purchase link:", error.message);
            return false;
        }

        return true;
    } catch (error) {
        console.error("[app-settings] Failed to set purchase link:", error);
        return false;
    }
}

