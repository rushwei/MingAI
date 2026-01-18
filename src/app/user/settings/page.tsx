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
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
            {/* 头部 */}
            <div className="flex items-center gap-3 mb-6">
                <button
                    onClick={() => router.push('/user')}
                    className="p-2 rounded-lg hover:bg-background-secondary transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-bold">偏好设置</h1>
            </div>

            {/* 设置列表 */}
            <div className="space-y-6">
                {/* 外观设置 */}
                <div>
                    <h2 className="text-sm font-medium text-foreground-secondary mb-3 px-1">
                        外观
                    </h2>
                    <div className="bg-background-secondary rounded-xl border border-border overflow-hidden">
                        {/* 主题切换 */}
                        <div className="flex items-center justify-between px-4 py-4">
                            <div className="flex items-center gap-3">
                                {theme === 'dark' ? (
                                    <Moon className="w-5 h-5 text-accent" />
                                ) : (
                                    <Sun className="w-5 h-5 text-accent" />
                                )}
                                <div>
                                    <p className="font-medium">深色模式</p>
                                    <p className="text-sm text-foreground-secondary">
                                        {theme === 'dark' ? '已开启' : '已关闭'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={toggleTheme}
                                className={`
                                    w-12 h-6 rounded-full transition-colors relative
                                    ${theme === 'dark' ? 'bg-accent' : 'bg-border'}
                                `}
                            >
                                <div className={`
                                    w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform
                                    ${theme === 'dark' ? 'translate-x-6' : 'translate-x-0.5'}
                                `} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* 通知设置 */}
                <div>
                    <h2 className="text-sm font-medium text-foreground-secondary mb-3 px-1">
                        通知
                    </h2>
                    <div className="bg-background-secondary rounded-xl border border-border overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-4">
                            <div className="flex items-center gap-3">
                                <Bell className="w-5 h-5 text-foreground-secondary" />
                                <div>
                                    <p className="font-medium">推送通知</p>
                                    <p className="text-sm text-foreground-secondary">
                                        接收每日运势和重要提醒
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => updateSetting('notifications', !settings.notifications)}
                                className={`
                                    w-12 h-6 rounded-full transition-colors relative
                                    ${settings.notifications ? 'bg-accent' : 'bg-border'}
                                `}
                            >
                                <div className={`
                                    w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform
                                    ${settings.notifications ? 'translate-x-6' : 'translate-x-0.5'}
                                `} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* 语言设置 */}
                <div>
                    <h2 className="text-sm font-medium text-foreground-secondary mb-3 px-1">
                        语言
                    </h2>
                    <div className="bg-background-secondary rounded-xl border border-border overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-4">
                            <div className="flex items-center gap-3">
                                <Globe className="w-5 h-5 text-foreground-secondary" />
                                <div>
                                    <p className="font-medium">界面语言</p>
                                    <p className="text-sm text-foreground-secondary">
                                        选择您偏好的语言
                                    </p>
                                </div>
                            </div>
                            <select
                                value={settings.language}
                                onChange={(e) => updateSetting('language', e.target.value as 'zh' | 'en')}
                                className="px-3 py-1.5 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-accent"
                            >
                                <option value="zh">简体中文</option>
                                <option value="en" disabled>English (即将支持)</option>
                            </select>
                        </div>
                    </div>

                    {/* 提醒订阅 */}
                    <div>
                        <h2 className="text-sm font-medium text-foreground-secondary mb-3 px-1">
                            提醒订阅
                        </h2>
                        <div className="bg-background-secondary rounded-xl border border-border overflow-hidden divide-y divide-border">
                            <ReminderToggle
                                type="solar_term"
                                label="节气提醒"
                                description="每个节气当天收到养生建议"
                                userId={userId}
                            />
                            <ReminderToggle
                                type="fortune"
                                label="运势提醒"
                                description="每日运势变化提醒"
                                userId={userId}
                            />
                            <ReminderToggle
                                type="key_date"
                                label="关键日提醒"
                                description="重要日期（如本命年）提醒"
                                userId={userId}
                            />
                        </div>
                    </div>

                    {/* 隐私与安全 */}
                    <div>
                        <h2 className="text-sm font-medium text-foreground-secondary mb-3 px-1">
                            隐私与安全
                        </h2>
                        <div className="bg-background-secondary rounded-xl border border-border overflow-hidden">
                            <button
                                onClick={() => alert('数据加密存储中，您的隐私得到保护')}
                                className="w-full flex items-center justify-between px-4 py-4 hover:bg-background transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <Shield className="w-5 h-5 text-foreground-secondary" />
                                    <div className="text-left">
                                        <p className="font-medium">数据安全</p>
                                        <p className="text-sm text-foreground-secondary">
                                            AES-256 加密存储
                                        </p>
                                    </div>
                                </div>
                                <Check className="w-5 h-5 text-green-500" />
                            </button>
                        </div>
                    </div>

                    {/* 版本信息 */}
                    <div className="text-center text-sm text-foreground-secondary pt-4">
                        <p>MingAI v1.0.0</p>
                        <p className="text-xs mt-1">© 2026 MingAI. All rights reserved.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
