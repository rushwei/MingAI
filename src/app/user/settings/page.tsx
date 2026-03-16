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
import { supabase } from '@/lib/auth';
import { useTheme } from '@/components/ui/ThemeProvider';
import { SidebarCustomizer } from '@/components/settings/SidebarCustomizer';
import { MobileNavCustomizer } from '@/components/settings/MobileNavCustomizer';
import { useSessionSafe } from '@/components/providers/ClientProviders';

interface Settings {
    notifications: boolean;
    language: 'zh' | 'en';
}

function ReminderToggle({
    type,
    label,
    description,
    userId,
    accessToken
}: {
    type: string;
    label: string;
    description: string;
    userId: string | null;
    accessToken: string | null;
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
        if (!userId) return;
        const newEnabled = !enabled;
        setEnabled(newEnabled);

        try {
            if (!accessToken) return;

            await fetch('/api/reminders', {
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
        } catch (error) {
            console.error('更新提醒状态失败:', error);
            setEnabled(!newEnabled);
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
                disabled={loading}
                className={`
                    w-10 h-6 rounded-full transition-colors relative
                    ${enabled ? 'bg-accent' : 'bg-border'}
                    ${loading ? 'opacity-50' : ''}
                `}
            >
                <div className={`
                    w-4 h-4 rounded-full bg-white absolute top-1 transition-transform
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
    const [isMobile, setIsMobile] = useState(false);

    // 检测设备类型
    useEffect(() => {
        const checkDevice = () => {
            setIsMobile(window.innerWidth < 1024); // lg breakpoint
        };
        checkDevice();
        window.addEventListener('resize', checkDevice);
        return () => window.removeEventListener('resize', checkDevice);
    }, []);

    useEffect(() => {
        const checkAuth = async () => {
            if (sessionLoading) return;
            if (!user) {
                router.push('/user');
                return;
            }

            setUserId(user.id);

            const { data, error } = await supabase
                .from('user_settings')
                .select('notifications_enabled, notify_email, notify_site, language')
                .eq('user_id', user.id)
                .maybeSingle();

            if (error) {
                console.error('获取偏好设置失败:', error);
            }

            if (!data) {
                const defaults = {
                    user_id: user.id,
                    notifications_enabled: true,
                    notify_email: true,
                    notify_site: true,
                    language: 'zh' as const,
                };

                const { data: created } = await supabase
                    .from('user_settings')
                    .upsert(defaults, { onConflict: 'user_id' })
                    .select('notifications_enabled, notify_email, notify_site, language')
                    .maybeSingle();

                setSettings({
                    notifications: created?.notifications_enabled ?? defaults.notifications_enabled,
                    language: (created?.language as 'zh' | 'en') ?? defaults.language,
                });
            } else {
                setSettings({
                    notifications: data.notifications_enabled ?? true,
                    language: (data.language as 'zh' | 'en') ?? 'zh',
                });
            }

            setLoading(false);
        };

        checkAuth();
    }, [router, sessionLoading, user]);

    const updateSetting = async <K extends keyof Settings>(key: K, value: Settings[K]) => {
        if (!userId) return;
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);

        const updates = key === 'notifications'
            ? {
                notifications_enabled: value as boolean,
                notify_email: value as boolean,
                notify_site: value as boolean,
            }
            : { language: value as Settings['language'] };

        const { error } = await supabase
            .from('user_settings')
            .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' });

        if (error) {
            console.error('更新偏好设置失败:', error);
            return;
        }

        if (key === 'notifications') {
            await supabase
                .from('feature_subscriptions')
                .update({
                    notify_email: value as boolean,
                    notify_site: value as boolean,
                })
                .eq('user_id', userId);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background">
                <div className="max-w-2xl mx-auto px-4 py-4 md:py-6">
                    {/* 标题骨架 */}
                    <div className="hidden md:block mb-6">
                        <div className="h-6 w-24 rounded bg-foreground/10 animate-pulse" />
                        <div className="h-4 w-40 rounded bg-foreground/5 animate-pulse mt-1" />
                    </div>
                    {/* 设置卡片骨架 */}
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="bg-background rounded-2xl border border-border/50 p-5">
                                <div className="h-5 w-28 rounded bg-foreground/10 animate-pulse mb-4" />
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-foreground/5 animate-pulse" />
                                            <div className="space-y-1.5">
                                                <div className="h-4 w-20 rounded bg-foreground/10 animate-pulse" />
                                                <div className="h-3 w-32 rounded bg-foreground/5 animate-pulse" />
                                            </div>
                                        </div>
                                        <div className="h-7 w-12 rounded-full bg-foreground/10 animate-pulse" />
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
        <div className="min-h-screen bg-background">
            <div className="max-w-2xl mx-auto px-4 py-4 md:py-6">
                {/* 桌面端头部 */}
                <div className="hidden md:block mb-6">
                    <h1 className="text-xl font-bold text-foreground">偏好设置</h1>
                </div>

                <div className="sm:space-y-6 space-y-2">
                    {/* 外观与语言 */}
                    <div className="bg-background rounded-2xl border border-border/50 shadow-sm overflow-hidden p-5 flex flex-col gap-5">
                        <div className="flex items-center gap-2 pb-3 border-b border-border/50">
                            <h2 className="text-sm font-bold text-foreground">外观与显示</h2>
                        </div>

                        {/* 主题切换 */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                {themeMode === 'system' ? (
                                    <Monitor className="w-5 h-5" />
                                ) : theme === 'dark' ? (
                                    <Moon className="w-5 h-5" />
                                ) : (
                                    <Sun className="w-5 h-5" />
                                )}
                                <div>
                                    <p className="text-sm font-medium text-foreground">外观模式</p>
                                    <p className="text-xs text-foreground-secondary">
                                        {themeMode === 'system'
                                            ? '跟随系统自动切换'
                                            : themeMode === 'dark'
                                                ? '当前已开启深色外观'
                                                : '当前使用浅色外观'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex gap-1 bg-background-secondary rounded-lg p-1">
                                <button
                                    onClick={() => setThemeMode('light')}
                                    className={`p-1.5 rounded-md transition-colors ${themeMode === 'light' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}
                                    title="浅色模式"
                                >
                                    <Sun className={`w-4 h-4 ${themeMode === 'light' ? 'text-amber-500' : 'text-foreground-secondary'}`} />
                                </button>
                                <button
                                    onClick={() => setThemeMode('dark')}
                                    className={`p-1.5 rounded-md transition-colors ${themeMode === 'dark' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}
                                    title="深色模式"
                                >
                                    <Moon className={`w-4 h-4 ${themeMode === 'dark' ? 'text-blue-500' : 'text-foreground-secondary'}`} />
                                </button>
                                <button
                                    onClick={() => setThemeMode('system')}
                                    className={`p-1.5 rounded-md transition-colors ${themeMode === 'system' ? 'bg-background shadow-sm' : 'hover:bg-background/50'}`}
                                    title="跟随系统"
                                >
                                    <Monitor className={`w-4 h-4 ${themeMode === 'system' ? 'text-accent' : 'text-foreground-secondary'}`} />
                                </button>
                            </div>
                        </div>

                        {/* 语言设置 */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Globe className="w-5 h-5" />
                                <div>
                                    <p className="text-sm font-medium text-foreground">界面语言</p>
                                    <p className="text-xs text-foreground-secondary">选择您偏好的显示语言</p>
                                </div>
                            </div>
                            <div className="relative">
                                <select
                                    value={settings.language}
                                    onChange={(e) => updateSetting('language', e.target.value as 'zh' | 'en')}
                                    className="appearance-none pl-3 pr-8 py-1.5 rounded-lg bg-background-secondary border border-border hover:border-accent text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all font-medium"
                                >
                                    <option value="zh">简体中文</option>
                                    <option value="en" disabled>English (即将上线)</option>
                                </select>
                                <ChevronRight className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-foreground-secondary rotate-90" />
                            </div>
                        </div>
                    </div>

                    {/* 通知与提醒 */}
                    <div className="bg-background rounded-2xl border border-border/50 shadow-sm overflow-hidden p-5 flex flex-col gap-5">
                        <div className="flex items-center gap-2 pb-3 border-b border-border/50">
                            <h2 className="text-sm font-bold text-foreground">通知与提醒</h2>
                        </div>

                        {/* 全局通知开关 */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl transition-colors ${settings.notifications ? 'bg-red-100 text-red-500' : 'bg-slate-100 text-slate-400'}`}>
                                    <Bell className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground">推送通知</p>
                                    <p className="text-xs text-foreground-secondary">
                                        接收每日运势和重要提醒
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => updateSetting('notifications', !settings.notifications)}
                                className={`
                                    w-12 h-7 rounded-full transition-all duration-300 relative shadow-inner
                                    ${settings.notifications ? 'bg-accent' : 'bg-slate-200'}
                                `}
                            >
                                <div className={`
                                    w-5 h-5 rounded-full bg-white absolute top-1 shadow-md transition-transform duration-300
                                    ${settings.notifications ? 'translate-x-6' : 'translate-x-1'}
                                `} />
                            </button>
                        </div>

                        {/* 提醒订阅细项 */}
                        <div className="bg-background-secondary/30 rounded-xl p-3 border border-border/50">
                            <h3 className="text-[10px] font-bold text-foreground-secondary uppercase tracking-wider mb-2 ml-1">订阅管理</h3>
                            <div className="space-y-1">
                                <ReminderToggle
                                    type="solar_term"
                                    label="节气提醒"
                                    description="每个节气当天收到养生建议"
                                    userId={userId}
                                    accessToken={session?.access_token || null}
                                />
                                <div className="h-px bg-border/50" />
                                <ReminderToggle
                                    type="fortune"
                                    label="运势提醒"
                                    description="每日运势变化提醒"
                                    userId={userId}
                                    accessToken={session?.access_token || null}
                                />
                                <div className="h-px bg-border/50" />
                                <ReminderToggle
                                    type="key_date"
                                    label="关键日提醒"
                                    description="重要日期（如本命年）提醒"
                                    userId={userId}
                                    accessToken={session?.access_token || null}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 界面自定义 */}
                    <div className="bg-background rounded-2xl border border-border/50 shadow-sm overflow-hidden p-5">
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/50">
                            <h2 className="text-sm font-bold text-foreground">界面自定义</h2>
                        </div>
                        {isMobile ? (
                            <MobileNavCustomizer userId={userId} />
                        ) : (
                            <SidebarCustomizer userId={userId} />
                        )}
                    </div>

                    {/* 隐私与安全 */}
                    <div className="bg-background rounded-2xl border border-border/50 shadow-sm overflow-hidden p-5">
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/50">
                            <h2 className="text-sm font-bold text-foreground">隐私与安全</h2>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20 rounded-xl">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                                    <Shield className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-sm font-medium text-foreground">数据安全保护中</p>
                                        <Check className="w-3.5 h-3.5 text-green-500" />
                                    </div>
                                    <p className="text-xs text-foreground-secondary">
                                        您的数据已通过 AES-256 加密存储
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
