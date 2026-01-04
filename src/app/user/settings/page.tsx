/**
 * 偏好设置页面
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Moon,
    Sun,
    Bell,
    Globe,
    Shield,
    Loader2,
    Check
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/components/ui/ThemeProvider';

interface Settings {
    notifications: boolean;
    language: 'zh' | 'en';
}

export default function SettingsPage() {
    const router = useRouter();
    const { theme, toggleTheme } = useTheme();
    const [loading, setLoading] = useState(true);
    const [settings, setSettings] = useState<Settings>({
        notifications: true,
        language: 'zh',
    });

    useEffect(() => {
        const checkAuth = async () => {
            // 使用 getSession 从本地缓存读取
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.user) {
                router.push('/user');
                return;
            }

            // 从 localStorage 读取设置
            const savedSettings = localStorage.getItem('mingai_settings');
            if (savedSettings) {
                setSettings(JSON.parse(savedSettings));
            }

            setLoading(false);
        };

        checkAuth();
    }, [router]);

    const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);
        localStorage.setItem('mingai_settings', JSON.stringify(newSettings));
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
                    onClick={() => router.back()}
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
    );
}
