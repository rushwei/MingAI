export const SETTINGS_CENTER_NAMESPACE = 'settings';

export const SETTINGS_CENTER_TABS = [
  'profile',
  'general',
  'personalization',
  'help',
  'charts',
  'knowledge-base',
  'mcp-service',
  'admin-announcements',
  'admin-features',
  'admin-ai-services',
  'admin-mcp',
] as const;

export type SettingsCenterTab = (typeof SETTINGS_CENTER_TABS)[number];
export type SettingsCenterTabGroup = 'account' | 'extensions' | 'management';

export type SettingsCenterFlags = {
  chartsEnabled: boolean;
  knowledgeBaseEnabled: boolean;
  mcpServiceEnabled: boolean;
  personalizationEnabled: boolean;
  helpEnabled: boolean;
  isAdmin: boolean;
};

export type SettingsCenterTabState = {
  id: SettingsCenterTab;
  label: string;
  group: SettingsCenterTabGroup;
  disabled: boolean;
};

export type SettingsCenterDisabledState = {
  title: string;
  description: string;
};

export const SETTINGS_CENTER_GROUP_LABELS: Record<SettingsCenterTabGroup, string> = {
  account: '账户',
  extensions: '扩展',
  management: '管理',
};

const SETTINGS_CENTER_TAB_META: Record<SettingsCenterTab, Omit<SettingsCenterTabState, 'disabled'>> = {
  profile: { id: 'profile', label: '个人资料', group: 'account' },
  general: { id: 'general', label: '设置', group: 'account' },  
  help: { id: 'help', label: '帮助', group: 'account' },
  personalization: { id: 'personalization', label: '个性化', group: 'extensions' },
  charts: { id: 'charts', label: '命盘', group: 'extensions' },
  'knowledge-base': { id: 'knowledge-base', label: '知识库', group: 'extensions' },
  'mcp-service': { id: 'mcp-service', label: 'MCP OAuth', group: 'extensions' },
  'admin-announcements': { id: 'admin-announcements', label: '公告管理', group: 'management' },
  'admin-features': { id: 'admin-features', label: '功能与支付', group: 'management' },
  'admin-ai-services': { id: 'admin-ai-services', label: 'AI 服务', group: 'management' },
  'admin-mcp': { id: 'admin-mcp', label: 'MCP 管理', group: 'management' },
};

function isSettingsCenterTabDisabled(tab: SettingsCenterTab, flags: SettingsCenterFlags) {
  switch (tab) {
    case 'personalization':
      return !flags.personalizationEnabled;
    case 'charts':
      return !flags.chartsEnabled;
    case 'knowledge-base':
      return !flags.knowledgeBaseEnabled;
    case 'mcp-service':
      return !flags.mcpServiceEnabled;
    case 'help':
      return !flags.helpEnabled;
    default:
      return false;
  }
}

export function getSettingsCenterTabLabel(tab: SettingsCenterTab): string {
  return SETTINGS_CENTER_TAB_META[tab].label;
}

export function getSettingsCenterTabs(flags: SettingsCenterFlags): SettingsCenterTabState[] {
  return SETTINGS_CENTER_TABS
    .filter((tab) => flags.isAdmin || SETTINGS_CENTER_TAB_META[tab].group !== 'management')
    .map((tab) => ({
      ...SETTINGS_CENTER_TAB_META[tab],
      disabled: isSettingsCenterTabDisabled(tab, flags),
    }));
}

export function getSettingsCenterDisabledState(
  tab: SettingsCenterTab,
  flags: SettingsCenterFlags,
): SettingsCenterDisabledState | null {
  if (!isSettingsCenterTabDisabled(tab, flags)) {
    return null;
  }

  switch (tab) {
    case 'knowledge-base':
      return {
        title: '暂未开放',
        description: '当前知识库不可用。',
      };
    case 'mcp-service':
      return {
        title: '暂未开放',
        description: '当前 MCP OAuth 不可用。',
      };
    case 'charts':
      return {
        title: '暂未开放',
        description: '当前命盘不可用。',
      };
    case 'personalization':
      return {
        title: '暂未开放',
        description: '当前个性化不可用。',
      };
    case 'help':
      return {
        title: '暂未开放',
        description: '当前帮助不可用。',
      };
    default:
      return null;
  }
}

export const SETTINGS_CENTER_EVENT = 'mingai:settings-center:change';
const SETTINGS_CENTER_STATE_KEY = '__mingaiSettingsCenter';

export function isSettingsCenterTab(value: unknown): value is SettingsCenterTab {
  return typeof value === 'string' && SETTINGS_CENTER_TABS.includes(value as SettingsCenterTab);
}

function normalizeSettingsCenterSubpath(subpath?: string | null): string | null {
  if (!subpath) return null;
  const normalized = subpath.split('/').filter(Boolean).join('/');
  return normalized || null;
}

function parseSettingsCenterHashParts(hash: string | null | undefined): {
  namespace: string | null;
  tab: string | null;
  subpath: string | null;
} {
  if (!hash) {
    return { namespace: null, tab: null, subpath: null };
  }

  const normalized = hash.replace(/^#/, '').trim();
  if (!normalized) {
    return { namespace: null, tab: null, subpath: null };
  }

  const [namespace, tab, ...rest] = normalized.split('/');
  return {
    namespace: namespace || null,
    tab: tab || null,
    subpath: rest.length > 0 ? rest.join('/') : null,
  };
}

export function buildSettingsCenterHash(tab: SettingsCenterTab, options?: { subpath?: string | null }): string {
  const normalizedSubpath = normalizeSettingsCenterSubpath(options?.subpath);
  return `#${SETTINGS_CENTER_NAMESPACE}/${tab}${normalizedSubpath ? `/${normalizedSubpath}` : ''}`;
}

export function parseSettingsCenterHash(hash: string | null | undefined): SettingsCenterTab | null {
  const { namespace, tab } = parseSettingsCenterHashParts(hash);
  if (namespace !== SETTINGS_CENTER_NAMESPACE) {
    return null;
  }

  return isSettingsCenterTab(tab) ? tab : 'general';
}

export function parseSettingsCenterHashSubpath(hash: string | null | undefined): string | null {
  const { namespace, tab, subpath } = parseSettingsCenterHashParts(hash);
  if (namespace !== SETTINGS_CENTER_NAMESPACE) {
    return null;
  }
  if (!isSettingsCenterTab(tab)) {
    return null;
  }
  return subpath;
}

export function getSettingsCenterLegacyPath(tab: SettingsCenterTab): string {
  switch (tab) {
    case 'profile':
      return '/user/profile';
    case 'general':
      return '/user/settings';
    case 'personalization':
      return '/user/settings/ai';
    case 'help':
      return '/help';
    case 'charts':
      return '/user/charts';
    case 'knowledge-base':
      return '/user/knowledge-base';
    case 'mcp-service':
      return '/user/mcp';
    case 'admin-announcements':
      return '/admin/announcements';
    case 'admin-features':
      return '/admin/features';
    case 'admin-ai-services':
      return '/admin/ai-services';
    case 'admin-mcp':
      return '/admin/mcp';
  }
}

function emitSettingsCenterChange() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(SETTINGS_CENTER_EVENT));
}

function buildCurrentUrlWithHash(hash: string) {
  const url = new URL(window.location.href);
  url.hash = hash.replace(/^#/, '');
  return `${url.pathname}${url.search}${url.hash}`;
}

function buildCurrentUrlWithoutHash() {
  const url = new URL(window.location.href);
  return `${url.pathname}${url.search}`;
}

export function openSettingsCenter(
  tab: SettingsCenterTab,
  options?: {
    replace?: boolean;
    subpath?: string | null;
  },
) {
  if (typeof window === 'undefined') return;

  const nextState = {
    ...(window.history.state ?? {}),
    [SETTINGS_CENTER_STATE_KEY]: true,
    tab,
    subpath: normalizeSettingsCenterSubpath(options?.subpath),
  };
  const method = options?.replace ? 'replaceState' : 'pushState';
  window.history[method](nextState, '', buildCurrentUrlWithHash(buildSettingsCenterHash(tab, options)));
  emitSettingsCenterChange();
}

export function closeSettingsCenter() {
  if (typeof window === 'undefined') return;

  const currentState = window.history.state as Record<string, unknown> | null;
  if (currentState?.[SETTINGS_CENTER_STATE_KEY] === true) {
    window.history.back();
    return;
  }

  const nextState = currentState ? { ...currentState } : null;
  if (nextState && SETTINGS_CENTER_STATE_KEY in nextState) {
    delete nextState[SETTINGS_CENTER_STATE_KEY];
  }
  if (nextState && 'tab' in nextState) {
    delete nextState.tab;
  }
  window.history.replaceState(nextState, '', buildCurrentUrlWithoutHash());
  emitSettingsCenterChange();
}

export function getSettingsCenterRouteTarget(tab: SettingsCenterTab, options?: { subpath?: string | null }): string {
  return `/${buildSettingsCenterHash(tab, options)}`;
}
