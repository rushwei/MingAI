/**
 * 用户设置页面内容
 *
 * 'use client' 标记说明：
 * - 使用 hooks 管理用户设置加载与保存
 * - 该模块既供统一设置中心复用，也保留旧路由启动入口
 */
'use client';

import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  Bell,
  Check,
  CalendarClock,
  CalendarHeart,
  Globe,
  Monitor,
  Moon,
  Shield,
  Sparkles,
  Sun,
} from 'lucide-react';
import { useTheme } from '@/components/ui/ThemeProvider';
import { useSessionSafe } from '@/components/providers/ClientProviders';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import { SettingsLoginRequired } from '@/components/settings/SettingsLoginRequired';
import { SettingsRouteLauncher } from '@/components/settings/SettingsRouteLauncher';
import { getCurrentUserSettings, updateCurrentUserSettings } from '@/lib/user/settings';

interface Settings {
  notifications: boolean;
  language: 'zh' | 'en';
}

type ReminderType = 'solar_term' | 'fortune' | 'key_date';

type ReminderSettings = Record<ReminderType, boolean>;

const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  solar_term: false,
  fortune: false,
  key_date: false,
};

const REMINDER_ITEMS: Array<{
  type: ReminderType;
  label: string;
  description: string;
}> = [
  {
    type: 'solar_term',
    label: '节气提醒',
    description: '节气当天养生建议。',
  },
  {
    type: 'fortune',
    label: '运势提醒',
    description: '每日运势变化提醒。',
  },
  {
    type: 'key_date',
    label: '关键日提醒',
    description: '重要日期提醒。',
  },
];

function SectionTitle({
  icon,
  children,
}: {
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <h2 className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-foreground/50">
      {icon ? <span className="text-foreground/60">{icon}</span> : null}
      <span>{children}</span>
    </h2>
  );
}

function Row({
  icon,
  title,
  description,
  control,
}: {
  icon?: ReactNode;
  title: string;
  description: string;
  control: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-md border border-border bg-background px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          {icon ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-md text-foreground/70">
              {icon}
            </div>
          ) : null}
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{title}</p>
            <p className="text-sm text-foreground-secondary">{description}</p>
          </div>
        </div>
      </div>
      {control}
    </div>
  );
}

function PreferenceSwitch({
  checked,
  onToggle,
  disabled = false,
  onIcon,
  offIcon,
}: {
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
  onIcon?: ReactNode;
  offIcon?: ReactNode;
}) {
  const statusIcon = checked ? onIcon : offIcon;

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`inline-flex min-w-[72px] items-center justify-center rounded-md border px-3 py-2 text-xs font-medium transition-colors duration-150 ${
        checked
          ? 'border-border bg-[#e3e1db] text-[#37352f] dark:bg-background-tertiary dark:text-foreground'
          : 'border-border bg-transparent text-foreground-secondary hover:bg-[#efedea] dark:hover:bg-background-secondary'
      } ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}
    >
      {statusIcon ? <span className="mr-1">{statusIcon}</span> : null}
      {checked ? '已开启' : '已关闭'}
    </button>
  );
}

export function GeneralSettingsContent({ embedded = false }: { embedded?: boolean }) {
  const { theme, themeMode, setThemeMode } = useTheme();
  const { user, session, loading: sessionLoading } = useSessionSafe();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<Settings>({
    notifications: true,
    language: 'zh',
  });
  const [reminders, setReminders] = useState<ReminderSettings>(DEFAULT_REMINDER_SETTINGS);
  const [remindersLoading, setRemindersLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (sessionLoading) return;
      if (!user) {
        setLoading(false);
        setRemindersLoading(false);
        return;
      }

      const [settingsResult, remindersResult] = await Promise.all([
        getCurrentUserSettings(),
        session?.access_token
          ? fetch('/api/reminders', {
              headers: { Authorization: `Bearer ${session.access_token}` },
            }).then(async (response) => {
              const payload = await response.json().catch(() => ({} as Record<string, unknown>));
              if (!response.ok) {
                throw new Error(typeof payload.error === 'string' ? payload.error : '加载提醒状态失败');
              }
              return payload as {
                success?: boolean;
                data?: {
                  subscriptions?: Array<{ reminderType: ReminderType; enabled: boolean }>;
                };
              };
            })
          : Promise.resolve(null),
      ]);

      if (settingsResult.error) {
        setLoadError(settingsResult.error.message || '加载偏好设置失败');
        setLoading(false);
        setRemindersLoading(false);
        return;
      }

      setLoadError(null);
      setSettings({
        notifications: settingsResult.settings?.notificationsEnabled ?? true,
        language: settingsResult.settings?.language ?? 'zh',
      });

      if (remindersResult?.data?.subscriptions) {
        setReminders(
          remindersResult.data.subscriptions.reduce<ReminderSettings>((acc, item) => {
            acc[item.reminderType] = item.enabled;
            return acc;
          }, { ...DEFAULT_REMINDER_SETTINGS }),
        );
      }

      setLoading(false);
      setRemindersLoading(false);
    };

    void load();
  }, [session?.access_token, sessionLoading, user]);

  const updateSetting = async <K extends keyof Settings>(key: K, value: Settings[K]) => {
    if (!user || loadError) return;

    const previousSettings = settings;
    const nextSettings = { ...settings, [key]: value };
    setSettings(nextSettings);

    const saved = await updateCurrentUserSettings(
      key === 'notifications'
        ? { notificationsEnabled: value as boolean }
        : { language: value as Settings['language'] },
    );

    if (!saved) {
      console.error('更新偏好设置失败');
      setSettings(previousSettings);
    }
  };

  const updateReminderSetting = async (type: ReminderType) => {
    if (!session?.access_token || loadError) return;

    const previousEnabled = reminders[type];
    const nextEnabled = !previousEnabled;
    setReminders((prev) => ({ ...prev, [type]: nextEnabled }));

    try {
      const response = await fetch('/api/reminders', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reminderType: type,
          enabled: nextEnabled,
          notifySite: true,
        }),
      });

      if (!response.ok) {
        throw new Error('更新提醒状态失败');
      }
    } catch (error) {
      console.error('更新提醒状态失败:', error);
      setReminders((prev) => ({ ...prev, [type]: previousEnabled }));
    }
  };

  if (loading || sessionLoading) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-border bg-background">
        <SoundWaveLoader variant="inline" />
      </div>
    );
  }

  if (!user) {
    return <SettingsLoginRequired />;
  }

  return (
    <div className={embedded ? 'space-y-8' : 'mx-auto max-w-4xl space-y-8 px-4 py-6'}>
      {loadError ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {loadError}
        </div>
      ) : null}

      <section className="space-y-3">
        <SectionTitle>基础偏好</SectionTitle>
        <div className="space-y-2">
          <Row
            icon={
              themeMode === 'system'
                ? <Monitor className="h-4 w-4" />
                : theme === 'dark'
                  ? <Moon className="h-4 w-4" />
                  : <Sun className="h-4 w-4" />
            }
            title="外观界面"
            description="选择应用显示主题。"
            control={(
              <div className="flex items-center gap-1 rounded-md border border-border bg-background p-1">
                {(['light', 'dark', 'system'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setThemeMode(mode)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
                      themeMode === mode
                        ? 'bg-[#e3e1db] text-[#37352f] dark:bg-background-tertiary dark:text-foreground'
                        : 'text-foreground-secondary hover:bg-[#efedea] dark:hover:bg-background-secondary'
                    }`}
                  >
                    {mode === 'light' ? '浅色' : mode === 'dark' ? '深色' : '自动'}
                  </button>
                ))}
              </div>
            )}
          />

          <Row
            icon={<Globe className="h-4 w-4" />}
            title="语言设置"
            description="选择界面显示语言。"
            control={(
              <select
                value={settings.language}
                onChange={(event) => updateSetting('language', event.target.value as 'zh' | 'en')}
                disabled={Boolean(loadError)}
                className="rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground outline-none transition-colors duration-150 focus:ring-2 focus:ring-blue-500/30"
              >
                <option value="zh">简体中文</option>
                <option value="en" disabled>English (即将上线)</option>
              </select>
            )}
          />
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle>通知与提醒</SectionTitle>
        <div className="space-y-2">
          <Row
            icon={<Bell className="h-4 w-4" />}
            title="推送通知"
            description="接收每日运势和重要提醒。"
            control={(
              <PreferenceSwitch
                checked={settings.notifications}
                onToggle={() => updateSetting('notifications', !settings.notifications)}
                disabled={Boolean(loadError)}
              />
            )}
          />

          {REMINDER_ITEMS.map((item) => {
            const reminderIcon = item.type === 'solar_term'
              ? <CalendarClock className="h-4 w-4" />
              : item.type === 'fortune'
                ? <Sparkles className="h-4 w-4" />
                : <CalendarHeart className="h-4 w-4" />;

            return (
              <Row
                key={item.type}
                icon={reminderIcon}
                title={item.label}
                description={item.description}
                control={(
                  <PreferenceSwitch
                    checked={reminders[item.type]}
                    onToggle={() => updateReminderSetting(item.type)}
                    disabled={Boolean(loadError) || remindersLoading}
                  />
                )}
              />
            );
          })}
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle>数据隐私</SectionTitle>
        <div className="rounded-md border border-border bg-background px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-background-secondary text-[#0f7b6c]">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-foreground">数据安全保护中</p>
                <Check className="h-3.5 w-3.5 text-[#0f7b6c]" />
              </div>
              <p className="text-sm text-foreground-secondary">您的所有数据均已通过 AES-256 加密存储。</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function SettingsPage() {
  return <SettingsRouteLauncher tab="general" />;
}
