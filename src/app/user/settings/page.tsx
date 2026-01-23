/**
 * 偏好设置页面
 */
'use client'; // 客户端组件：需要读取登录态与操作本地主题切换

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Moon,
    Sun,
    Bell,
    Globe,
    Shield,
    Loader2,
    Check,
    Calendar
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/components/ui/ThemeProvider';
import { SidebarCustomizer } from '@/components/settings/SidebarCustomizer';
import { PanelLeft } from 'lucide-react';

interface Settings {
    notifications: boolean;
    language: 'zh' | 'en';
}

// 提醒开关组件
function ReminderToggle({
    type,
    label,
    description,
    userId
}: {
    type: string;
    label: string;
    description: string;
    userId: string | null;
}) {
    const [enabled, setEnabled] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchStatus = useCallback(async () => {
        if (!userId) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;

            const res = await fetch('/api/reminders', {
                headers: { Authorization: `Bearer ${session.access_token}` },
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
    }, [userId, type]);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    const handleToggle = async () => {
        if (!userId) return;
        const newEnabled = !enabled;
        setEnabled(newEnabled);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) return;

            await fetch('/api/reminders', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${session.access_token}`,
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
            setEnabled(!newEnabled); // 回滚
        }
    };

    return (
        <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-foreground-secondary" />
                <div>
                    <p className="font-medium">{label}</p>
                    <p className="text-sm text-foreground-secondary">{description}</p>
                </div>
            </div>
            <button
                onClick={handleToggle}
                disabled={loading}
                className={`
                    w-12 h-6 rounded-full transition-colors relative
                    ${enabled ? 'bg-accent' : 'bg-border'}
                    ${loading ? 'opacity-50' : ''}
                `}
            >
                <div className={`
                    w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform
                    ${enabled ? 'translate-x-6' : 'translate-x-0.5'}
                `} />
            </button>
        </div>
    );
}

export default function SettingsPage() {
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    // useState: 管理加载状态和偏好设置的本地展示
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<Settings>({
        notifications: true,
        language: 'zh',
    });
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        // useEffect: 首次进入页面时读取登录态并加载服务端偏好
        const checkAuth = async () => {
            // 使用 getSession 从本地缓存读取
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.user) {
                router.push('/user');
                return;
            }

            setUserId(session.user.id);

            const { data, error } = await supabase
                .from('user_settings')
                .select('notifications_enabled, notify_email, notify_site, language')
                .eq('user_id', session.user.id)
                .maybeSingle();

            if (error) {
                console.error('获取偏好设置失败:', error);
            }

            if (!data) {
                const defaults = {
                    user_id: session.user.id,
                    notifications_enabled: true,
                    notify_email: true,
                    notify_site: true,
                    language: 'zh' as const,
                };

                const { data: created, error: insertError } = await supabase
                    .from('user_settings')
                    .upsert(defaults, { onConflict: 'user_id' })
                    .select('notifications_enabled, notify_email, notify_site, language')
                    .maybeSingle();

                if (insertError) {
                    console.error('初始化偏好设置失败:', insertError?.message ?? insertError);
                }

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
    }, [router]);

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
            const { error: subscriptionError } = await supabase
                .from('feature_subscriptions')
                .update({
                    notify_email: value as boolean,
                    notify_site: value as boolean,
                })
                .eq('user_id', userId);

            if (subscriptionError) {
                console.error('同步功能订阅偏好失败:', subscriptionError);
            }
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            <div className="max-w-2xl mx-auto px-4 py-8 relative z-10 animate-fade-in">
                {/* 头部 */}
                <div className="flex items-center gap-4 mb-10">
                    <button
                        onClick={() => router.push('/user')}
                        className="p-2.5 rounded-xl bg-background-secondary/50 border border-border/50 hover:bg-background-secondary hover:shadow-md transition-all text-foreground-secondary hover:text-foreground backdrop-blur-sm"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/70">偏好设置</h1>
                        <p className="text-sm text-foreground-secondary mt-1">定制您的 MingAI 体验</p>
                    </div>
                </div>

                {/* 设置列表 */}
                <div className="space-y-8">
                    {/* 外观设置 */}
                    <div className="bg-background rounded-3xl border border-border/50 shadow-sm overflow-hidden p-6 gap-6 flex flex-col">
                        <div className="flex items-center gap-2 mb-2 pb-4 border-b border-border/50">
                            <span className="p-1.5 bg-purple-500/10 rounded-lg text-purple-500"><Moon className="w-4 h-4" /></span>
                            <h2 className="text-base font-bold text-foreground">外观与显示</h2>
                        </div>

                        {/* 主题切换 */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl transition-colors ${theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-orange-100 text-orange-500'}`}>
                                    {theme === 'dark' ? (
                                        <Moon className="w-6 h-6" />
                                    ) : (
                                        <Sun className="w-6 h-6" />
                                    )}
                                </div>
                                <div>
                                    <p className="font-semibold text-lg text-foreground">深色模式</p>
                                    <p className="text-sm text-foreground-secondary mt-0.5">
                                        {theme === 'dark' ? '当前已开启深色外观' : '当前使用浅色外观'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={toggleTheme}
                                className={`
                                    w-14 h-8 rounded-full transition-all duration-300 relative shadow-inner
                                    ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}
                                `}
                            >
                                <div className={`
                                    w-6 h-6 rounded-full bg-white absolute top-1 shadow-md transition-transform duration-300
                                    ${theme === 'dark' ? 'translate-x-7' : 'translate-x-1'}
                                `} />
                            </button>
                        </div>

                        {/* 语言设置 */}
                        <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-4">
                                <div className="p-3 rounded-2xl bg-blue-100 text-blue-500">
                                    <Globe className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="font-semibold text-lg text-foreground">界面语言</p>
                                    <p className="text-sm text-foreground-secondary mt-0.5">
                                        选择您偏好的显示语言
                                    </p>
                                </div>
                            </div>
                            <div className="relative">
                                <select
                                    value={settings.language}
                                    onChange={(e) => updateSetting('language', e.target.value as 'zh' | 'en')}
                                    className="appearance-none pl-4 pr-10 py-2 rounded-xl bg-background-secondary border border-border hover:border-accent text-foreground focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all font-medium"
                                >
                                    <option value="zh">简体中文</option>
                                    <option value="en" disabled>English</option>
                                </select>
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-foreground-secondary">
                                    <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 通知与提醒 */}
                    <div className="bg-background rounded-3xl border border-border/50 shadow-sm overflow-hidden p-6 flex flex-col gap-6">
                        <div className="flex items-center gap-2 mb-2 pb-4 border-b border-border/50">
                            <span className="p-1.5 bg-red-500/10 rounded-lg text-red-500"><Bell className="w-4 h-4" /></span>
                            <h2 className="text-base font-bold text-foreground">通知与提醒</h2>
                        </div>

                        {/* 全局通知开关 */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl transition-colors ${settings.notifications ? 'bg-red-100 text-red-500' : 'bg-slate-100 text-slate-400'}`}>
                                    <Bell className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="font-semibold text-lg text-foreground">推送通知</p>
                                    <p className="text-sm text-foreground-secondary mt-0.5">
                                        接收每日运势和重要提醒
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => updateSetting('notifications', !settings.notifications)}
                                className={`
                                    w-14 h-8 rounded-full transition-all duration-300 relative shadow-inner
                                    ${settings.notifications ? 'bg-accent' : 'bg-slate-200'}
                                `}
                            >
                                <div className={`
                                    w-6 h-6 rounded-full bg-white absolute top-1 shadow-md transition-transform duration-300
                                    ${settings.notifications ? 'translate-x-7' : 'translate-x-1'}
                                `} />
                            </button>
                        </div>

                        {/* 提醒订阅细项 */}
                        <div className="bg-background-secondary/50 rounded-2xl p-4 space-y-4 border border-border/50">
                            <h3 className="text-xs font-bold text-foreground-secondary uppercase tracking-wider mb-2 ml-1">订阅管理</h3>
                            <ReminderToggle
                                type="solar_term"
                                label="节气提醒"
                                description="每个节气当天收到养生建议"
                                userId={userId}
                            />
                            <div className="h-px bg-border/50 mx-4" />
                            <ReminderToggle
                                type="fortune"
                                label="运势提醒"
                                description="每日运势变化提醒"
                                userId={userId}
                            />
                            <div className="h-px bg-border/50 mx-4" />
                            <ReminderToggle
                                type="key_date"
                                label="关键日提醒"
                                description="重要日期（如本命年）提醒"
                                userId={userId}
                            />
                        </div>
                    </div>

                    {/* 侧边栏自定义 */}
                    <div className="bg-background rounded-3xl border border-border/50 shadow-sm overflow-hidden p-6">
                        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border/50">
                            <span className="p-1.5 bg-blue-500/10 rounded-lg text-blue-500"><PanelLeft className="w-4 h-4" /></span>
                            <h2 className="text-base font-bold text-foreground">界面自定义</h2>
                        </div>
                        <SidebarCustomizer userId={userId} />
                    </div>

                    {/* 隐私与安全 */}
                    <div className="bg-background rounded-3xl border border-border/50 shadow-sm overflow-hidden p-6">
                        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-border/50">
                            <span className="p-1.5 bg-green-500/10 rounded-lg text-green-500"><Shield className="w-4 h-4" /></span>
                            <h2 className="text-base font-bold text-foreground">隐私与安全</h2>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20 rounded-2xl">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl text-green-600 dark:text-green-400">
                                    <Shield className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <p className="font-semibold text-foreground">数据安全保护中</p>
                                        <Check className="w-4 h-4 text-green-500" />
                                    </div>
                                    <p className="text-sm text-foreground-secondary mt-0.5">
                                        您的数据已通过 AES-256 加密存储
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 版本信息 */}
                    <div className="text-center py-8">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-background-secondary border border-border/50">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <p className="text-xs font-medium text-foreground-secondary">MingAI v2.0.0 (Latest)</p>
                        </div>
                        <p className="text-xs text-foreground-secondary/50 mt-4">© 2026 MingAI. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
