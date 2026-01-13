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
