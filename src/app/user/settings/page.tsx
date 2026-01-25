'use client';

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
    Calendar,
    Sparkles,
    BookOpenText,
    PanelLeft,
    ChevronRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/components/ui/ThemeProvider';
import { SidebarCustomizer } from '@/components/settings/SidebarCustomizer';

interface Settings {
    notifications: boolean;
    language: 'zh' | 'en';
}

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
            setEnabled(!newEnabled);
        }
    };

    return (
        <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-background-secondary text-foreground-secondary">
                    <Calendar className="w-4 h-4" />
                </div>
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
    const { theme, toggleTheme } = useTheme();
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<Settings>({
        notifications: true,
        language: 'zh',
    });
    const [userId, setUserId] = useState<string | null>(null);

    useEffect(() => {
        const checkAuth = async () => {
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
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            <div className="max-w-2xl mx-auto px-4 py-6">
                {/* 头部 */}
                <div className="flex items-center gap-3 mb-6">
                    <button
                        onClick={() => router.push('/user')}
                        className="p-2 rounded-xl hover:bg-background-secondary transition-colors text-foreground-secondary hover:text-foreground"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-foreground">偏好设置</h1>
                        <p className="text-xs text-foreground-secondary mt-0.5">定制您的 MingAI 体验</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* 外观与语言 */}
                    <div className="bg-background rounded-2xl border border-border/50 shadow-sm overflow-hidden p-5 flex flex-col gap-5">
                        <div className="flex items-center gap-2 pb-3 border-b border-border/50">
                            <span className="p-1 bg-purple-500/10 rounded text-purple-500"><Moon className="w-3.5 h-3.5" /></span>
                            <h2 className="text-sm font-bold text-foreground">外观与显示</h2>
                        </div>

                        {/* 主题切换 */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl transition-colors ${theme === 'dark' ? 'bg-slate-800 text-white' : 'bg-orange-100 text-orange-500'}`}>
                                    {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground">深色模式</p>
                                    <p className="text-xs text-foreground-secondary">
                                        {theme === 'dark' ? '当前已开启深色外观' : '当前使用浅色外观'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={toggleTheme}
                                className={`
                                    w-12 h-7 rounded-full transition-all duration-300 relative shadow-inner
                                    ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'}
                                `}
                            >
                                <div className={`
                                    w-5 h-5 rounded-full bg-white absolute top-1 shadow-md transition-transform duration-300
                                    ${theme === 'dark' ? 'translate-x-6' : 'translate-x-1'}
                                `} />
                            </button>
                        </div>

                        {/* 语言设置 */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-blue-100 text-blue-500">
                                    <Globe className="w-5 h-5" />
                                </div>
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
                                    <option value="en" disabled>English</option>
                                </select>
                                <ChevronRight className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-foreground-secondary rotate-90" />
                            </div>
                        </div>
                    </div>

                    {/* AI 设置 */}
                    <div className="bg-background rounded-2xl border border-border/50 shadow-sm overflow-hidden p-5 flex flex-col gap-3">
                        <div className="flex items-center gap-2 pb-3 border-b border-border/50">
                            <span className="p-1 bg-emerald-500/10 rounded text-emerald-500"><Sparkles className="w-3.5 h-3.5" /></span>
                            <h2 className="text-sm font-bold text-foreground">AI 设置</h2>
                        </div>
                        <button
                            type="button"
                            onClick={() => router.push('/user/settings/ai')}
                            className="group w-full flex items-center justify-between p-3 rounded-xl bg-background border border-border/50 hover:border-emerald-500/30 hover:bg-background-secondary transition-all text-left"
                        >
                            <div>
                                <p className="text-sm font-medium text-foreground group-hover:text-emerald-500 transition-colors">个性化配置</p>
                                <p className="text-xs text-foreground-secondary mt-0.5">
                                    表达风格、自定义指令、用户画像
                                </p>
                            </div>
                            <ChevronRight className="w-4 h-4 text-foreground-secondary/50 group-hover:text-emerald-500 transition-colors" />
                        </button>
                        <button
                            type="button"
                            onClick={() => router.push('/user/knowledge-base')}
                            className="group w-full flex items-center justify-between p-3 rounded-xl bg-background border border-border/50 hover:border-emerald-500/30 hover:bg-background-secondary transition-all text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-500 group-hover:scale-110 transition-transform">
                                    <BookOpenText className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground group-hover:text-emerald-500 transition-colors">知识库管理</p>
                                    <p className="text-xs text-foreground-secondary mt-0.5">
                                        管理归档内容与知识库
                                    </p>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-foreground-secondary/50 group-hover:text-emerald-500 transition-colors" />
                        </button>
                    </div>

                    {/* 通知与提醒 */}
                    <div className="bg-background rounded-2xl border border-border/50 shadow-sm overflow-hidden p-5 flex flex-col gap-5">
                        <div className="flex items-center gap-2 pb-3 border-b border-border/50">
                            <span className="p-1 bg-red-500/10 rounded text-red-500"><Bell className="w-3.5 h-3.5" /></span>
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
                                />
                                <div className="h-px bg-border/50" />
                                <ReminderToggle
                                    type="fortune"
                                    label="运势提醒"
                                    description="每日运势变化提醒"
                                    userId={userId}
                                />
                                <div className="h-px bg-border/50" />
                                <ReminderToggle
                                    type="key_date"
                                    label="关键日提醒"
                                    description="重要日期（如本命年）提醒"
                                    userId={userId}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 侧边栏自定义 */}
                    <div className="bg-background rounded-2xl border border-border/50 shadow-sm overflow-hidden p-5">
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/50">
                            <span className="p-1 bg-blue-500/10 rounded text-blue-500"><PanelLeft className="w-3.5 h-3.5" /></span>
                            <h2 className="text-sm font-bold text-foreground">界面自定义</h2>
                        </div>
                        <SidebarCustomizer userId={userId} />
                    </div>

                    {/* 隐私与安全 */}
                    <div className="bg-background rounded-2xl border border-border/50 shadow-sm overflow-hidden p-5">
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/50">
                            <span className="p-1 bg-green-500/10 rounded text-green-500"><Shield className="w-3.5 h-3.5" /></span>
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

                    {/* 版本信息 */}
                    <div className="text-center py-6">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-background-secondary border border-border/50">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            <p className="text-[10px] font-medium text-foreground-secondary">MingAI v2.0.0 (Latest)</p>
                        </div>
                        <p className="text-[10px] text-foreground-secondary/50 mt-3">© 2026 MingAI. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
