/**
 * 用户设置页面
 *
 * 'use client' 标记说明：
 * - 使用 React hooks (useState, useEffect, useCallback)
 * - 使用 useRouter 进行客户端导航
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Moon,
    Sun,
    Monitor,
    Bell,
    Globe,
    Shield,
    Check,
    ChevronRight
} from 'lucide-react';
import { useTheme } from '@/components/ui/ThemeProvider';
import { useSessionSafe } from '@/components/providers/ClientProviders';
import { getCurrentUserSettings, updateCurrentUserSettings } from '@/lib/user/settings';

interface Settings {
    notifications: boolean;
    language: 'zh' | 'en';
}

function ReminderToggle({
    type,
    label,
    description,
    userId,
    accessToken,
    disabled = false,
}: {
    type: string;
    label: string;
    description: string;
    userId: string | null;
    accessToken: string | null;
    disabled?: boolean;
}) {
    const [enabled, setEnabled] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchStatus = useCallback(async () => {
        if (!userId) return;
        try {
            if (!accessToken) return;

            const res = await fetch('/api/reminders', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const data = await res.json();
            if (data.success) {
                const sub = data.data.subscriptions.find((s: { reminderType: string }) => s.reminderType === type);
                setEnabled(sub?.enabled ?? false);
            }
        } catch (error) {
            console.error('获取提醒状态失败:', error);
        } finally {
            setLoading(false);
        }
    }, [accessToken, userId, type]);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    const handleToggle = async () => {
        if (!userId || disabled) return;
        const previousEnabled = enabled;
        const newEnabled = !previousEnabled;
        setEnabled(newEnabled);

        try {
            if (!accessToken) {
                throw new Error('Missing access token');
            }

            const res = await fetch('/api/reminders', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    reminderType: type,
                    enabled: newEnabled,
                    notifySite: true,
                }),
            });
            if (!res.ok) {
                throw new Error('更新提醒状态失败');
            }
        } catch (error) {
            console.error('更新提醒状态失败:', error);
            setEnabled(previousEnabled);
        }
    };

    return (
        <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
            <div className="flex items-center gap-3 px-1">
                <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-foreground-secondary">{description}</p>
                </div>
            </div>
            <button
                onClick={handleToggle}
                disabled={loading || disabled}
                className={`
                    w-10 h-6 rounded-full transition-colors relative
                    ${enabled ? 'bg-accent' : 'bg-border'}
                    ${loading || disabled ? 'opacity-50' : ''}
                `}
            >
                <div className={`
                    w-4 h-4 rounded-full bg-background absolute top-1 transition-transform
                    ${enabled ? 'translate-x-5' : 'translate-x-1'}
                `} />
            </button>
        </div>
    );
}

export default function SettingsPage() {
    const router = useRouter();
    const { theme, themeMode, setThemeMode } = useTheme();
    const { user, session, loading: sessionLoading } = useSessionSafe();
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<Settings>({
        notifications: true,
        language: 'zh',
    });
    const [userId, setUserId] = useState<string | null>(null);
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
            if (sessionLoading) return;
            if (!user) {
                router.push('/user');
                return;
            }

            setUserId(user.id);

            const { settings: loaded, error } = await getCurrentUserSettings();
            if (error) {
                setLoadError(error.message || '加载偏好设置失败');
                setLoading(false);
                return;
            }
            setLoadError(null);
            setSettings({
                notifications: loaded?.notificationsEnabled ?? true,
                language: loaded?.language ?? 'zh',
            });

            setLoading(false);
        };

        checkAuth();
    }, [router, sessionLoading, user]);

    const updateSetting = async <K extends keyof Settings>(key: K, value: Settings[K]) => {
        if (!userId || loadError) return;
        const previousSettings = settings;
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);

        const saved = await updateCurrentUserSettings(
            key === 'notifications'
                ? { notificationsEnabled: value as boolean }
                : { language: value as Settings['language'] }
        );

        if (!saved) {
            console.error('更新偏好设置失败');
            setSettings(previousSettings);
            return;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
                    {/* 标题骨架 */}
                    <div className="space-y-2">
                        <div className="h-7 w-24 rounded bg-foreground/10 animate-pulse" />
                        <div className="h-4 w-40 rounded bg-foreground/5 animate-pulse" />
                    </div>
                    {/* 设置列表骨架 */}
                    <div className="space-y-6">
                        {[1, 2].map(i => (
                            <div key={i} className="bg-background border border-border rounded-md p-6 space-y-4">
                                <div className="h-4 w-20 rounded bg-foreground/10 animate-pulse mb-2" />
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="h-4 w-32 rounded bg-foreground/5 animate-pulse" />
                                        <div className="h-6 w-10 rounded bg-foreground/10 animate-pulse" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground pb-20 lg:pb-8">
            <div className="max-w-3xl mx-auto px-4 py-8 animate-fade-in space-y-10">
                {/* 标题 */}
                <header className="space-y-1">
                    <h1 className="text-2xl font-bold">设置</h1>
                    <p className="text-sm text-foreground/50">管理您的账户偏好与应用配置</p>
                </header>

                <div className="space-y-8">
                    {loadError && (
                        <div className="bg-[#eb5757]/10 border border-[#eb5757]/20 rounded-md px-4 py-3 text-sm text-[#eb5757]">
                            {loadError}
                        </div>
                    )}

                    {/* 外观与语言 */}
                    <section className="space-y-4">
                        <h2 className="text-[11px] font-semibold text-foreground/40 uppercase tracking-widest px-1">基础偏好</h2>
                        <div className="bg-background border border-border rounded-md overflow-hidden divide-y divide-border/60">
                            {/* 主题选择 */}
                            <div className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded bg-background-secondary text-foreground/70">
                                        {themeMode === 'system' ? <Monitor className="w-4 h-4" /> : theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">外观界面</p>
                                        <p className="text-xs text-foreground/40">选择应用显示主题</p>
                                    </div>
                                </div>
                                <div className="flex items-center bg-background-secondary p-1 rounded-md">
                                    {(['light', 'dark', 'system'] as const).map((mode) => (
                                        <button
                                            key={mode}
                                            onClick={() => setThemeMode(mode)}
                                            className={`px-3 py-1 text-xs rounded transition-all ${
                                                themeMode === mode
                                                    ? 'bg-background shadow-sm text-foreground font-semibold'
                                                    : 'text-foreground/40 hover:text-foreground'
                                            }`}
                                        >
                                            {mode === 'light' ? '浅色' : mode === 'dark' ? '深色' : '自动'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 语言设置 */}
                            <div className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded bg-background-secondary text-foreground/70">
                                        <Globe className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">语言设置</p>
                                        <p className="text-xs text-foreground/40">选择界面显示语言</p>
                                    </div>
                                </div>
                                <div className="relative">
                                    <select
                                        value={settings.language}
                                        onChange={(e) => updateSetting('language', e.target.value as 'zh' | 'en')}
                                        disabled={Boolean(loadError)}
                                        className="appearance-none pl-3 pr-8 py-1.5 rounded-md bg-background-secondary text-xs font-medium focus:outline-none transition-colors border-none"
                                    >
                                        <option value="zh">简体中文</option>
                                        <option value="en" disabled>English (即将上线)</option>
                                    </select>
                                    <ChevronRight className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-foreground/40 rotate-90" />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 通知与提醒 */}
                    <section className="space-y-4">
                        <h2 className="text-[11px] font-semibold text-foreground/40 uppercase tracking-widest px-1">通知与提醒</h2>
                        <div className="bg-background border border-border rounded-md overflow-hidden divide-y divide-border/60">
                            <div className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded ${settings.notifications ? 'bg-accent-light text-accent' : 'bg-background-secondary text-foreground/30'}`}>
                                        <Bell className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium">推送通知</p>
                                        <p className="text-xs text-foreground/40">接收每日运势和重要提醒</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => updateSetting('notifications', !settings.notifications)}
                                    disabled={Boolean(loadError)}
                                    className={`
                                        w-10 h-6 rounded-full transition-all duration-200 relative
                                        ${settings.notifications ? 'bg-accent' : 'bg-border'}
                                    `}
                                >
                                    <div className={`
                                        w-4.5 h-4.5 rounded-full bg-background absolute top-0.75 transition-transform duration-200
                                        ${settings.notifications ? 'translate-x-4.75' : 'translate-x-0.75'}
                                    `} />
                                </button>
                            </div>

                            {/* 订阅管理子项 - 符合 Notion 风格的嵌套行 */}
                            <div className="px-4 py-2 bg-background-secondary/40">
                                <div className="space-y-1">
                                    <ReminderToggle
                                        type="solar_term"
                                        label="节气提醒"
                                        description="节气当天养生建议"
                                        userId={userId}
                                        accessToken={session?.access_token || null}
                                        disabled={Boolean(loadError)}
                                    />
                                    <ReminderToggle
                                        type="fortune"
                                        label="运势提醒"
                                        description="每日运势变化提醒"
                                        userId={userId}
                                        accessToken={session?.access_token || null}
                                        disabled={Boolean(loadError)}
                                    />
                                    <ReminderToggle
                                        type="key_date"
                                        label="关键日提醒"
                                        description="重要日期提醒"
                                        userId={userId}
                                        accessToken={session?.access_token || null}
                                        disabled={Boolean(loadError)}
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 安全设置 */}
                    <section className="space-y-4">
                        <h2 className="text-[11px] font-semibold text-foreground/40 uppercase tracking-widest px-1">数据隐私</h2>
                        <div className="p-4 bg-[#0f7b6c]/5 border border-[#0f7b6c]/10 rounded-md flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#0f7b6c]/10 rounded text-[#0f7b6c]">
                                    <Shield className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-sm font-medium text-foreground">数据安全保护中</p>
                                        <Check className="w-3.5 h-3.5 text-[#0f7b6c]" />
                                    </div>
                                    <p className="text-xs text-[#0f7b6c]/60">您的所有数据均已通过 AES-256 加密存储</p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
