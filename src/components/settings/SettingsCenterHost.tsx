'use client';

import { Suspense, lazy, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { ComponentType, ReactElement } from 'react';
import { createPortal } from 'react-dom';
import {
  BookOpenText,
  Bot,
  CircleQuestionMark,
  Key,
  Megaphone,
  MessageCircleHeart,
  Scroll,
  Settings,
  User,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import { useFeatureToggles } from '@/lib/hooks/useFeatureToggles';
import { useSessionSafe } from '@/components/providers/ClientProviders';
import { useCurrentUserProfile } from '@/lib/hooks/useCurrentUserProfile';
import {
  SETTINGS_CENTER_EVENT,
  SETTINGS_CENTER_GROUP_LABELS,
  closeSettingsCenter,
  getSettingsCenterDisabledState,
  getSettingsCenterTabs,
  openSettingsCenter,
  parseSettingsCenterHash,
  type SettingsCenterFlags,
  type SettingsCenterTab,
} from '@/lib/settings-center';
import { SettingsLoginRequired } from '@/components/settings/SettingsLoginRequired';

const LazyGeneralSettingsContent = lazy(async () => ({
  default: (await import('@/app/user/settings/page')).GeneralSettingsContent,
}));
const LazyAISettingsContent = lazy(async () => ({
  default: (await import('@/app/user/ai-settings/page')).AISettingsContent,
}));
const LazyChartsContent = lazy(async () => ({
  default: (await import('@/app/user/charts/page')).ChartsContent,
}));
const LazyKnowledgeBaseManageContent = lazy(async () => ({
  default: (await import('@/app/user/knowledge-base/page')).KnowledgeBaseManageContent,
}));
const LazyMcpPageContent = lazy(async () => ({
  default: (await import('@/app/user/mcp/page')).McpPageContent,
}));
const LazyProfileContent = lazy(async () => ({
  default: (await import('@/app/user/profile/page')).ProfileContent,
}));
const LazyHelpContent = lazy(async () => ({
  default: (await import('@/app/help/page')).HelpContent,
}));
const LazyAdminAnnouncementsContent = lazy(async () => ({
  default: (await import('@/components/settings/AccountAdminPanels')).AdminAnnouncementsContent,
}));
const LazyAdminFeaturesContent = lazy(async () => ({
  default: (await import('@/components/settings/AccountAdminPanels')).AdminFeaturesContent,
}));
const LazyAdminAIServicesContent = lazy(async () => ({
  default: (await import('@/components/settings/AccountAdminPanels')).AdminAIServicesContent,
}));
const LazyAdminMcpContent = lazy(async () => ({
  default: (await import('@/components/settings/AccountAdminPanels')).AdminMcpContent,
}));

export type SettingsCenterTabItem = {
  id: SettingsCenterTab;
  label: string;
  group: keyof typeof SETTINGS_CENTER_GROUP_LABELS;
  icon: ComponentType<{ className?: string }>;
  disabled: boolean;
};

const TAB_ICONS: Record<SettingsCenterTab, ComponentType<{ className?: string }>> = {
  profile: User,
  general: Settings,
  personalization: MessageCircleHeart,
  help: CircleQuestionMark,
  charts: Scroll,
  'knowledge-base': BookOpenText,
  'mcp-service': Key,
  'admin-announcements': Megaphone,
  'admin-features': Wallet,
  'admin-ai-services': Bot,
  'admin-mcp': Wrench,
};

function SettingsPanelFallback() {
  return (
    <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-border bg-background">
      <div className="text-sm text-foreground-secondary">加载中...</div>
    </div>
  );
}

function SettingsTabDisabledState({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md text-foreground/60">
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-sm text-foreground-secondary">{description}</p>
        </div>
      </div>
    </div>
  );
}

function AdminPermissionRequiredState({ loggedIn }: { loggedIn: boolean }) {
  if (!loggedIn) {
    return <SettingsLoginRequired title="请先登录后使用管理功能" description="登录后系统会自动识别管理员账号。" />;
  }

  return (
    <div className="rounded-lg border border-border bg-background p-5">
      <h2 className="text-sm font-semibold text-foreground">无权限访问</h2>
      <p className="mt-1 text-sm text-foreground-secondary">当前账号不在管理员名单中，无法查看该管理面板。</p>
    </div>
  );
}

function AdminStateErrorState() {
  return (
    <div className="rounded-lg border border-border bg-background p-5">
      <h2 className="text-sm font-semibold text-foreground">管理员状态加载失败</h2>
      <p className="mt-1 text-sm text-foreground-secondary">暂时无法确认当前账号的管理员权限，请稍后重试。</p>
    </div>
  );
}

function isAdminTab(tab: SettingsCenterTab) {
  return tab.startsWith('admin-');
}

function renderLazyPanel(node: ReactElement) {
  return (
    <Suspense fallback={<SettingsPanelFallback />}>
      {node}
    </Suspense>
  );
}

function renderSettingsCenterPanel(
  tab: SettingsCenterTab,
  flags: SettingsCenterFlags,
  options: {
    isLoggedIn: boolean;
    isAdmin: boolean;
    profileLoading: boolean;
    profileError: boolean;
  },
): ReactElement {
  if (isAdminTab(tab)) {
    if (options.profileLoading) {
      return <SettingsPanelFallback />;
    }
    if (options.profileError) {
      return <AdminStateErrorState />;
    }
    if (!options.isLoggedIn || !options.isAdmin) {
      return <AdminPermissionRequiredState loggedIn={options.isLoggedIn} />;
    }
  }

  const disabledState = getSettingsCenterDisabledState(tab, flags);
  if (disabledState) {
    return (
      <SettingsTabDisabledState
        icon={TAB_ICONS[tab]}
        title={disabledState.title}
        description={disabledState.description}
      />
    );
  }

  switch (tab) {
    case 'profile':
      return renderLazyPanel(<LazyProfileContent embedded />);
    case 'general':
      return renderLazyPanel(<LazyGeneralSettingsContent embedded />);
    case 'personalization':
      return renderLazyPanel(<LazyAISettingsContent embedded />);
    case 'help':
      return renderLazyPanel(<LazyHelpContent embedded />);
    case 'charts':
      return renderLazyPanel(<LazyChartsContent embedded />);
    case 'knowledge-base':
      return renderLazyPanel(<LazyKnowledgeBaseManageContent embedded />);
    case 'mcp-service':
      return renderLazyPanel(<LazyMcpPageContent embedded />);
    case 'admin-announcements':
      return renderLazyPanel(<LazyAdminAnnouncementsContent />);
    case 'admin-features':
      return renderLazyPanel(<LazyAdminFeaturesContent />);
    case 'admin-ai-services':
      return renderLazyPanel(<LazyAdminAIServicesContent />);
    case 'admin-mcp':
      return renderLazyPanel(<LazyAdminMcpContent />);
  }
}

function useSettingsCenterState() {
  const [activeTab, setActiveTab] = useState<SettingsCenterTab | null>(null);

  useEffect(() => {
    const sync = () => {
      setActiveTab(parseSettingsCenterHash(window.location.hash));
    };

    sync();
    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    window.addEventListener(SETTINGS_CENTER_EVENT, sync as EventListener);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
      window.removeEventListener(SETTINGS_CENTER_EVENT, sync as EventListener);
    };
  }, []);

  return {
    activeTab,
    setActiveTab: (tab: SettingsCenterTab) => {
      openSettingsCenter(tab, { replace: true });
      setActiveTab(tab);
    },
  };
}

export function SettingsCenterHost() {
  const { activeTab, setActiveTab } = useSettingsCenterState();
  const { isFeatureEnabled } = useFeatureToggles();
  const { user } = useSessionSafe();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const { profile, loading: profileLoading, error: profileError } = useCurrentUserProfile({ enabled: !!activeTab });
  const isAdmin = !!profile?.is_admin;

  useEffect(() => {
    if (!activeTab) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeTab]);

  const flags = useMemo<SettingsCenterFlags>(
    () => ({
      chartsEnabled: isFeatureEnabled('charts'),
      knowledgeBaseEnabled: isFeatureEnabled('knowledge-base'),
      mcpServiceEnabled: isFeatureEnabled('mcp-service'),
      personalizationEnabled: isFeatureEnabled('ai-personalization'),
      helpEnabled: isFeatureEnabled('help'),
      isAdmin,
    }),
    [isAdmin, isFeatureEnabled],
  );

  const tabs = useMemo<SettingsCenterTabItem[]>(
    () => getSettingsCenterTabs(flags).map((tab) => ({ ...tab, icon: TAB_ICONS[tab.id] })),
    [flags],
  );

  if (!mounted || !activeTab) {
    return null;
  }

  const groupedTabs = (Object.keys(SETTINGS_CENTER_GROUP_LABELS) as Array<keyof typeof SETTINGS_CENTER_GROUP_LABELS>)
    .map((group) => ({
      group,
      tabs: tabs.filter((tab) => tab.group === group),
    }))
    .filter((entry) => entry.tabs.length > 0);

  const modal = (
    <div className="fixed inset-0 z-[90]">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"
        onClick={() => closeSettingsCenter()}
      />

      <div
        className="absolute inset-x-0 bottom-0 top-0 flex items-stretch justify-center p-0 md:inset-10 md:items-center"
        onClick={() => closeSettingsCenter()}
      >
        <div
          className="flex h-full w-full overflow-hidden border border-border bg-[#f7f6f3] text-[#37352f] shadow-md dark:bg-background dark:text-foreground md:h-[min(680px,calc(100vh-80px))] md:max-w-[58rem] md:rounded-lg"
          onClick={(event) => event.stopPropagation()}
        >
          <aside className="hidden w-56 flex-shrink-0 border-r border-border bg-[#f7f6f3] p-2 dark:bg-background md:flex md:flex-col">
            <div className="mb-4 flex items-center justify-between px-2 py-1">
              <h2 className="text-base font-semibold">设置</h2>
              <button
                type="button"
                onClick={() => closeSettingsCenter()}
                className="rounded-md border border-transparent p-1.5 text-foreground-secondary transition-colors duration-150 hover:bg-[#efedea] hover:text-foreground dark:hover:bg-background-secondary dark:hover:text-foreground"
                aria-label="关闭设置中心"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <nav className="space-y-4">
              {groupedTabs.map((entry) => (
                <div key={entry.group} className="space-y-1">
                  <div className="px-2 text-[11px] font-semibold uppercase tracking-wider text-foreground/45">
                    {SETTINGS_CENTER_GROUP_LABELS[entry.group]}
                  </div>
                  {entry.tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = tab.id === activeTab;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors duration-150 ${
                          isActive
                            ? 'bg-[#e3e1db] text-[#37352f] dark:bg-background-tertiary dark:text-foreground'
                            : 'bg-transparent text-foreground-secondary hover:bg-[#efedea] dark:hover:bg-background-secondary'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <Icon className="h-4 w-4" />
                          <span>{tab.label}</span>
                        </span>
                        {tab.disabled ? (
                          <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] text-foreground/50">
                            关闭
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>
          </aside>

          <div className="flex min-h-0 flex-1 flex-col bg-[#f7f6f3] dark:bg-background">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
              <h2 className="text-sm font-semibold">设置</h2>
              <button
                type="button"
                onClick={() => closeSettingsCenter()}
                className="rounded-md border border-transparent p-1.5 text-foreground-secondary transition-colors duration-150 hover:bg-[#efedea] hover:text-foreground dark:hover:bg-background-secondary dark:hover:text-foreground"
                aria-label="关闭设置中心"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 md:px-4 md:py-4">
              {renderSettingsCenterPanel(activeTab, flags, {
                isLoggedIn: !!user,
                isAdmin,
                profileLoading,
                profileError: !!profileError,
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
