'use client';

import { Suspense, lazy, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { openSettingsCenter, parseSettingsCenterHashSubpath } from '@/lib/settings-center';
import {
  Bot,
  GitBranch,
  Key,
  Link2,
  Settings2,
  ToggleLeft,
} from 'lucide-react';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';

const LazyAnnouncementManagementPanel = lazy(async () => ({
  default: (await import('@/components/admin/AnnouncementManagementPanel')).AnnouncementManagementPanel,
}));
const LazyFeatureTogglePanel = lazy(async () => ({
  default: (await import('@/components/admin/FeatureTogglePanel')).FeatureTogglePanel,
}));
const LazyPaymentPausePanel = lazy(async () => ({
  default: (await import('@/components/admin/PaymentPausePanel')).PaymentPausePanel,
}));
const LazyKeyManagementPanel = lazy(async () => ({
  default: (await import('@/components/admin/KeyManagementPanel')).KeyManagementPanel,
}));
const LazyPurchaseLinkPanel = lazy(async () => ({
  default: (await import('@/components/admin/PurchaseLinkPanel')).PurchaseLinkPanel,
}));
const LazyAIModelPanel = lazy(async () => ({
  default: (await import('@/components/admin/AIModelPanel')).AIModelPanel,
}));
const LazyAIGatewayPanel = lazy(async () => ({
  default: (await import('@/components/admin/AIGatewayPanel')).AIGatewayPanel,
}));
const LazyMcpKeyManagementPanel = lazy(async () => ({
  default: (await import('@/components/admin/McpKeyManagementPanel')).McpKeyManagementPanel,
}));

function PanelFallback() {
  return (
    <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-border bg-background">
      <SoundWaveLoader variant="inline" />
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        <p className="text-sm text-foreground-secondary">{description}</p>
      </header>
      {children}
    </div>
  );
}

function SubtabButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors duration-150 ${
        active
          ? 'border-border bg-[#e3e1db] text-[#37352f] dark:bg-background-tertiary dark:text-foreground'
          : 'border-border bg-background text-foreground-secondary hover:bg-[#efedea] dark:hover:bg-background-secondary'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export function AdminAnnouncementsContent() {
  return (
    <Section title="公告管理" description="管理系统公告；发布即生效，历史公告可随时编辑或删除。">
      <Suspense fallback={<PanelFallback />}>
        <div className="min-h-0 rounded-lg bg-background">
          <LazyAnnouncementManagementPanel />
        </div>
      </Suspense>
    </Section>
  );
}

type AdminFeatureTab = 'toggles' | 'pause' | 'keys' | 'links';
type AdminAITab = 'models' | 'gateways';

function resolveAdminFeatureTab(value: string | null | undefined): AdminFeatureTab {
  switch (value) {
    case 'pause':
    case 'keys':
    case 'links':
      return value;
    default:
      return 'toggles';
  }
}

function resolveAdminAITab(value: string | null | undefined): AdminAITab {
  switch (value) {
    case 'gateways':
      return 'gateways';
    default:
      return 'models';
  }
}

export function AdminFeaturesContent() {
  const [activeTab, setActiveTab] = useState<AdminFeatureTab>(() => {
    if (typeof window === 'undefined') {
      return 'toggles';
    }
    return resolveAdminFeatureTab(parseSettingsCenterHashSubpath(window.location.hash));
  });

  useEffect(() => {
    const sync = () => {
      setActiveTab(resolveAdminFeatureTab(parseSettingsCenterHashSubpath(window.location.hash)));
    };

    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    window.addEventListener('mingai:settings-center:change', sync as EventListener);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
      window.removeEventListener('mingai:settings-center:change', sync as EventListener);
    };
  }, []);

  const switchTab = (nextTab: AdminFeatureTab) => {
    setActiveTab(nextTab);
    openSettingsCenter('admin-features', {
      replace: true,
      subpath: nextTab === 'toggles' ? null : nextTab,
    });
  };

  return (
    <Section title="功能与支付" description="统一管理功能开关、支付暂停、激活码与购买链接。">
      <div className="flex flex-wrap gap-2">
        <SubtabButton active={activeTab === 'toggles'} onClick={() => switchTab('toggles')} icon={<Settings2 className="h-4 w-4" />} label="功能开关" />
        <SubtabButton active={activeTab === 'pause'} onClick={() => switchTab('pause')} icon={<ToggleLeft className="h-4 w-4" />} label="支付管理" />
        <SubtabButton active={activeTab === 'keys'} onClick={() => switchTab('keys')} icon={<Key className="h-4 w-4" />} label="激活码" />
        <SubtabButton active={activeTab === 'links'} onClick={() => switchTab('links')} icon={<Link2 className="h-4 w-4" />} label="购买链接" />
      </div>

      <Suspense fallback={<PanelFallback />}>
        <div className="rounded-lg border border-border bg-background p-4">
          {activeTab === 'toggles' && <LazyFeatureTogglePanel />}
          {activeTab === 'pause' && <LazyPaymentPausePanel />}
          {activeTab === 'keys' && <LazyKeyManagementPanel />}
          {activeTab === 'links' && <LazyPurchaseLinkPanel />}
        </div>
      </Suspense>
    </Section>
  );
}

export function AdminAIServicesContent() {
  const [activeTab, setActiveTab] = useState<AdminAITab>(() => {
    if (typeof window === 'undefined') {
      return 'models';
    }
    return resolveAdminAITab(parseSettingsCenterHashSubpath(window.location.hash));
  });

  useEffect(() => {
    const sync = () => {
      setActiveTab(resolveAdminAITab(parseSettingsCenterHashSubpath(window.location.hash)));
    };

    window.addEventListener('hashchange', sync);
    window.addEventListener('popstate', sync);
    window.addEventListener('mingai:settings-center:change', sync as EventListener);
    return () => {
      window.removeEventListener('hashchange', sync);
      window.removeEventListener('popstate', sync);
      window.removeEventListener('mingai:settings-center:change', sync as EventListener);
    };
  }, []);

  const switchTab = (nextTab: AdminAITab) => {
    setActiveTab(nextTab);
    openSettingsCenter('admin-ai-services', {
      replace: true,
      subpath: nextTab === 'models' ? null : nextTab,
    });
  };

  return (
    <Section title="AI 服务" description="管理模型配置、来源绑定和网关可用性。">
      <div className="flex flex-wrap gap-2">
        <SubtabButton active={activeTab === 'models'} onClick={() => switchTab('models')} icon={<Bot className="h-4 w-4" />} label="模型管理" />
        <SubtabButton active={activeTab === 'gateways'} onClick={() => switchTab('gateways')} icon={<GitBranch className="h-4 w-4" />} label="网关管理" />
      </div>

      <Suspense fallback={<PanelFallback />}>
        <div className="rounded-lg border border-border bg-background p-4">
          {activeTab === 'models' && <LazyAIModelPanel />}
          {activeTab === 'gateways' && <LazyAIGatewayPanel />}
        </div>
      </Suspense>
    </Section>
  );
}

export function AdminMcpContent() {
  return (
    <Section title="MCP 管理" description="查看、封禁和恢复用户 MCP Key。">
      <Suspense fallback={<PanelFallback />}>
        <div className="rounded-lg border border-border bg-background p-4">
          <LazyMcpKeyManagementPanel />
        </div>
      </Suspense>
    </Section>
  );
}
