import { getSystemAdminClient } from "@/lib/api-utils";
import { IS_NODE_TEST_RUNTIME } from "@/lib/runtime";

const PAYMENTS_PAUSED_KEY = "payments_paused";

export async function getPaymentsPaused(): Promise<boolean> {
    try {
        const supabase = getSystemAdminClient();
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
        const supabase = getSystemAdminClient();
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
        const supabase = getSystemAdminClient();
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
        const supabase = getSystemAdminClient();
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
        const supabase = getSystemAdminClient();
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

// ─── 功能模块开关 ───

export const FEATURE_MODULE_IDS = [
  'fortune-hub', 'bazi', 'hepan', 'ziwei', 'tarot', 'liuyao', 'qimen',
  'daliuren',
  'face', 'palm', 'mbti', 'chat', 'daily', 'monthly',
  'records', 'community', 'knowledge-base', 'mcp-service',
  'checkin', 'orders', 'charts', 'ai-personalization',
  'notifications', 'upgrade', 'help',
] as const;

export type FeatureModuleId = typeof FEATURE_MODULE_IDS[number];

export const FEATURE_MODULE_LABELS: Record<FeatureModuleId, string> = {
  'fortune-hub': '运势中心',
  bazi: '八字',
  hepan: '八字合盘',
  ziwei: '紫微斗数',
  tarot: '塔罗',
  liuyao: '六爻',
  qimen: '奇门遁甲',
  daliuren: '大六壬',
  face: '面相',
  palm: '手相',
  mbti: 'MBTI',
  chat: 'AI 对话',
  daily: '日运',
  monthly: '月运',
  records: '命理记录',
  community: '社区',
  'knowledge-base': '知识库',
  'mcp-service': 'MCP 服务',
  checkin: '签到',
  orders: '订单',
  charts: '我的命盘',
  'ai-personalization': '个性化',
  notifications: '消息通知',
  upgrade: '订阅',
  help: '帮助',
};

const FEATURE_PREFIX = 'feature_disabled:';

type FeatureToggleRow = {
  setting_key: string;
  setting_value: unknown;
};

function normalizeFeatureToggleRows(rows: FeatureToggleRow[] | null | undefined): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const row of rows ?? []) {
    if (!row?.setting_key) continue;
    const id = row.setting_key.replace(FEATURE_PREFIX, '');
    result[id] = !!row.setting_value;
  }
  return result;
}

async function readFeatureToggleRows(
  supabase: ReturnType<typeof getSystemAdminClient>
): Promise<{ data: FeatureToggleRow[]; error: { message?: string } | null }> {
  const { data, error } = await supabase
    .from('app_settings')
    .select('setting_key, setting_value')
    .like('setting_key', `${FEATURE_PREFIX}%`);
  return { data: data ?? [], error };
}

/** 批量读取所有功能模块开关状态。返回 Record<id, boolean>，true = 已关闭 */
export async function getFeatureToggles(): Promise<Record<string, boolean>> {
  try {
    const supabase = getSystemAdminClient();
    const { data, error } = await readFeatureToggleRows(supabase);

    if (error) {
      if (!IS_NODE_TEST_RUNTIME) {
        console.error('[app-settings] Failed to read feature toggles:', error.message);
      }
      return {};
    }

    return normalizeFeatureToggleRows(data);
  } catch (error) {
    if (!IS_NODE_TEST_RUNTIME) {
      console.error('[app-settings] Failed to read feature toggles:', error);
    }
    return {};
  }
}

/** 设置单个功能模块开关。disabled=true 表示关闭该功能 */
export async function setFeatureToggle(
  featureId: FeatureModuleId,
  disabled: boolean
): Promise<boolean> {
  try {
    const supabase = getSystemAdminClient();
    const { error } = await supabase
      .from('app_settings')
      .upsert(
        {
          setting_key: `${FEATURE_PREFIX}${featureId}`,
          setting_value: disabled,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'setting_key' }
      );

    if (error) {
      console.error('[app-settings] Failed to set feature toggle:', error.message);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[app-settings] Failed to set feature toggle:', error);
    return false;
  }
}

export async function isFeatureModuleEnabled(featureId: FeatureModuleId): Promise<boolean> {
  const toggles = await getFeatureToggles();
  return toggles[featureId] !== true;
}
