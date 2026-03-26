import { requestBrowserJson, type BrowserApiError } from '@/lib/browser-api';
import {
  normalizeVisualizationSettings,
  type VisualizationSettings,
} from '@/lib/visualization/settings';

export type ExpressionStyle = 'direct' | 'gentle';
export type AppLanguage = 'zh' | 'en';

export const DEFAULT_NAV_ORDER = [
  'fortune-hub', 'bazi', 'hepan', 'ziwei', 'liuyao', 'qimen', 'daliuren', 'tarot', 'face', 'palm', 'mbti', 'daily', 'monthly',
] as const;

export const DEFAULT_TOOL_ORDER = [
  'checkin', 'chat', 'records', 'community',
] as const;

export const DEFAULT_MOBILE_MAIN_ITEMS = [
  'fortune-hub', 'liuyao', 'chat', 'daily',
] as const;

export const DEFAULT_MOBILE_DRAWER_ORDER = [
  'bazi', 'records', 'community', 'hepan', 'ziwei', 'tarot', 'qimen', 'daliuren',
  'face', 'palm', 'mbti', 'monthly', 'user', 'user/settings',
  'user/upgrade', 'user/notifications', 'user/orders',
  'user/settings/ai', 'user/knowledge-base', 'user/help',
  'user/charts',
] as const;

type UserSettingsRow = {
  expression_style?: unknown;
  custom_instructions?: unknown;
  user_profile?: unknown;
  prompt_kb_ids?: unknown;
  visualization_settings?: unknown;
  notifications_enabled?: unknown;
  notify_email?: unknown;
  notify_site?: unknown;
  language?: unknown;
  default_bazi_chart_id?: unknown;
  default_ziwei_chart_id?: unknown;
};

type UserSettingsQueryResult = PromiseLike<{
  data: UserSettingsRow | null;
  error: unknown;
}>;

type UserSettingsReader = {
  from(table: 'user_settings'): {
    select(columns: string): {
      eq(column: 'user_id', userId: string): {
        maybeSingle(): UserSettingsQueryResult;
      };
    };
  };
};

export type UserSettingsSnapshot = {
  expressionStyle: ExpressionStyle;
  customInstructions: string;
  userProfile: unknown;
  promptKbIds: string[];
  visualizationSettings: VisualizationSettings | undefined;
  notificationsEnabled: boolean;
  notifyEmail: boolean;
  notifySite: boolean;
  language: AppLanguage;
  defaultBaziChartId: string | null;
  defaultZiweiChartId: string | null;
};

export type UserSettingsLoadResult = {
  settings: UserSettingsSnapshot | null;
  error: BrowserApiError | null;
};

export type UserSettingsUpdateInput = Partial<{
  expressionStyle: ExpressionStyle;
  customInstructions: string | null;
  userProfile: unknown;
  promptKbIds: string[];
  visualizationSettings: VisualizationSettings | null;
  notificationsEnabled: boolean;
  language: AppLanguage;
  defaultBaziChartId: string | null;
  defaultZiweiChartId: string | null;
}>;

export const USER_SETTINGS_SELECT = `
  expression_style,
  custom_instructions,
  user_profile,
  prompt_kb_ids,
  visualization_settings,
  notifications_enabled,
  notify_email,
  notify_site,
  language,
  default_bazi_chart_id,
  default_ziwei_chart_id
`;

export function normalizeUserSettings(row: UserSettingsRow | null | undefined): UserSettingsSnapshot {
  return {
    expressionStyle: row?.expression_style === 'gentle' ? 'gentle' : 'direct',
    customInstructions: typeof row?.custom_instructions === 'string' ? row.custom_instructions : '',
    userProfile: row?.user_profile ?? {},
    promptKbIds: Array.isArray(row?.prompt_kb_ids)
      ? row.prompt_kb_ids.filter((value): value is string => typeof value === 'string' && value.length > 0)
      : [],
    visualizationSettings: normalizeVisualizationSettings(row?.visualization_settings),
    notificationsEnabled: row?.notifications_enabled !== false,
    notifyEmail: row?.notify_email !== false,
    notifySite: row?.notify_site !== false,
    language: row?.language === 'en' ? 'en' : 'zh',
    defaultBaziChartId: typeof row?.default_bazi_chart_id === 'string' ? row.default_bazi_chart_id : null,
    defaultZiweiChartId: typeof row?.default_ziwei_chart_id === 'string' ? row.default_ziwei_chart_id : null,
  };
}

export function getUserSettingsRow(
  client: UserSettingsReader,
  userId: string,
): UserSettingsQueryResult {
  return client
    .from('user_settings')
    .select(USER_SETTINGS_SELECT)
    .eq('user_id', userId)
    .maybeSingle();
}

export async function getUserSettingsSnapshot(
  client: UserSettingsReader,
  userId: string,
): Promise<{ settings: UserSettingsSnapshot; error: unknown }> {
  const result = await getUserSettingsRow(client, userId);
  return {
    settings: normalizeUserSettings(result.data),
    error: result.error,
  };
}

export function buildUserSettingsUpdatePayload(
  userId: string,
  body: UserSettingsUpdateInput,
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  };

  if (body.expressionStyle === 'direct' || body.expressionStyle === 'gentle') {
    payload.expression_style = body.expressionStyle;
  }
  if (body.customInstructions === null || typeof body.customInstructions === 'string') {
    payload.custom_instructions = body.customInstructions;
  }
  if (body.userProfile !== undefined) {
    payload.user_profile = body.userProfile;
  }
  if (Array.isArray(body.promptKbIds)) {
    payload.prompt_kb_ids = body.promptKbIds.filter(
      (value): value is string => typeof value === 'string' && value.length > 0,
    );
  }
  if (body.visualizationSettings !== undefined) {
    if (body.visualizationSettings === null) {
      payload.visualization_settings = null;
    } else {
      const normalizedVisualizationSettings = normalizeVisualizationSettings(body.visualizationSettings);
      if (normalizedVisualizationSettings) {
        payload.visualization_settings = normalizedVisualizationSettings;
      }
    }
  }
  if (typeof body.notificationsEnabled === 'boolean') {
    payload.notifications_enabled = body.notificationsEnabled;
    payload.notify_email = body.notificationsEnabled;
    payload.notify_site = body.notificationsEnabled;
  }
  if (body.language === 'zh' || body.language === 'en') {
    payload.language = body.language;
  }
  if (body.defaultBaziChartId === null || typeof body.defaultBaziChartId === 'string') {
    payload.default_bazi_chart_id = body.defaultBaziChartId;
  }
  if (body.defaultZiweiChartId === null || typeof body.defaultZiweiChartId === 'string') {
    payload.default_ziwei_chart_id = body.defaultZiweiChartId;
  }

  return payload;
}

export function hasEffectiveUserSettingsUpdate(payload: Record<string, unknown>): boolean {
  return Object.keys(payload).some((key) => key !== 'user_id' && key !== 'updated_at');
}

export function dispatchUserDataInvalidate(pathname = '/api/user/settings') {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent('mingai:user-data:invalidate', {
      detail: { pathname, at: Date.now() },
    }),
  );
}

export function dispatchPromptKnowledgeBaseUpdated() {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent('mingai:knowledge-base:prompt-updated', {
      detail: { at: Date.now() },
    }),
  );
}

export async function getCurrentUserSettings(): Promise<UserSettingsLoadResult> {
  const result = await requestBrowserJson<{ settings: UserSettingsSnapshot }>('/api/user/settings', {
    method: 'GET',
  });
  return {
    settings: result.error ? null : result.data?.settings ?? normalizeUserSettings(null),
    error: result.error,
  };
}

export async function updateCurrentUserSettings(input: UserSettingsUpdateInput): Promise<UserSettingsSnapshot | null> {
  const result = await requestBrowserJson<{ settings: UserSettingsSnapshot }>('/api/user/settings', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  if (result.error) {
    return null;
  }

  dispatchUserDataInvalidate('/api/user/settings');
  if (input.promptKbIds !== undefined) {
    dispatchPromptKnowledgeBaseUpdated();
  }

  return result.data?.settings ?? null;
}
