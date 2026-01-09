/**
 * 通用占位页面组件
 * 用于尚未实现的命理体系
 */
'use client'; // 客户端组件：需要读取登录态并处理订阅交互

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Clock, Bell, Check, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AuthModal } from '@/components/auth/AuthModal';
import { LoginOverlay } from '@/components/auth/LoginOverlay';

interface ComingSoonPageProps {
    title: string;
    emoji: string;
    icon?: React.ReactNode;
    description: string;
    features: string[];
    featureKey: string; // 用于订阅的功能标识，如 'liuyao', 'tarot'
}

export function ComingSoonPage({ title, emoji, icon, description, features, featureKey }: ComingSoonPageProps) {
    // useState: 管理登录态与订阅状态，避免重复请求
    const [userId, setUserId] = useState<string | null>(null);
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [notificationPrefs, setNotificationPrefs] = useState({
        notificationsEnabled: true,
        notifyEmail: true,
        notifySite: true,
    });

    // 检查登录状态和订阅状态
    useEffect(() => {
        // useEffect: 初始化订阅状态与偏好设置
        const checkStatus = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUserId(session.user.id);
                // 检查是否已订阅
                const { data } = await supabase
                    .from('feature_subscriptions')
                    .select('id')
                    .eq('user_id', session.user.id)
                    .eq('feature_key', featureKey)
                    .maybeSingle();
                setIsSubscribed(!!data);

                const { data: settings } = await supabase
                    .from('user_settings')
                    .select('notifications_enabled, notify_email, notify_site')
                    .eq('user_id', session.user.id)
                    .maybeSingle();

                setNotificationPrefs({
                    notificationsEnabled: settings?.notifications_enabled ?? true,
                    notifyEmail: settings?.notify_email ?? true,
                    notifySite: settings?.notify_site ?? true,
                });
            }
        };
        checkStatus();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (_, session) => {
                setUserId(session?.user?.id ?? null);
                if (session?.user) {
                    const { data } = await supabase
                        .from('feature_subscriptions')
                        .select('id')
                        .eq('user_id', session.user.id)
                        .eq('feature_key', featureKey)
                        .maybeSingle();
                    setIsSubscribed(!!data);

                    const { data: settings } = await supabase
                        .from('user_settings')
                        .select('notifications_enabled, notify_email, notify_site')
                        .eq('user_id', session.user.id)
                        .maybeSingle();

                    setNotificationPrefs({
                        notificationsEnabled: settings?.notifications_enabled ?? true,
                        notifyEmail: settings?.notify_email ?? true,
                        notifySite: settings?.notify_site ?? true,
                    });
                } else {
                    setIsSubscribed(false);
                    setNotificationPrefs({
                        notificationsEnabled: true,
                        notifyEmail: true,
                        notifySite: true,
                    });
                }
            }
        );

        return () => subscription.unsubscribe();
    }, [featureKey]);

    // 订阅/取消订阅
    const handleSubscribe = async () => {
        if (!userId) {
            setShowAuthModal(true);
            return;
        }

        setIsLoading(true);
        try {
            if (isSubscribed) {
                // 取消订阅
                await supabase
                    .from('feature_subscriptions')
                    .delete()
                    .eq('user_id', userId)
                    .eq('feature_key', featureKey);
                setIsSubscribed(false);
            } else {
                // 订阅
                const allowNotifications = notificationPrefs.notificationsEnabled;
                await supabase
                    .from('feature_subscriptions')
                    .upsert({
                        user_id: userId,
                        feature_key: featureKey,
                        notify_email: allowNotifications && notificationPrefs.notifyEmail,
                        notify_site: allowNotifications && notificationPrefs.notifySite,
                    }, {
                        onConflict: 'user_id,feature_key'
                    });
                setIsSubscribed(true);
            }
        } catch (error) {
            console.error('订阅操作失败:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <LoginOverlay message={`登录后使用${title}`}>
            <div className="max-w-2xl mx-auto px-4 py-8 animate-fade-in">
                {/* 返回首页 - 左上角 */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-foreground-secondary hover:text-foreground mb-8 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    返回首页
                </Link>

                {/* 标题区域 - 参考八字排盘样式 */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-16 h-16 flex items-center justify-center">
                        {icon || <span className="text-5xl">{emoji}</span>}
                    </div>
                    <div className="text-left">
                        <h1 className="text-2xl lg:text-3xl font-bold mb-1">{title}</h1>
                        <p className="text-foreground-secondary">{description}</p>
                    </div>
                </div>

                {/* 敬请期待标签 */}
                <div className="flex justify-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent">
                        <Clock className="w-4 h-4" />
                        敬请期待
                    </div>
                </div>

                {/* 预览功能 */}
                <div className="bg-background rounded-xl p-6 border border-border text-left mb-8">
                    <h2 className="font-semibold mb-4">即将推出的功能</h2>
                    <ul className="space-y-3">
                        {features.map((feature, index) => (
                            <li key={index} className="flex items-start gap-3">
                                <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-accent text-sm">{index + 1}</span>
                                </div>
                                <span className="text-foreground-secondary">{feature}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* 订阅提醒 */}
                <div className="text-center">
                    <button
                        onClick={handleSubscribe}
                        disabled={isLoading}
                        className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl transition-colors ${isSubscribed
                            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-accent text-white hover:bg-accent/90'
                            }`}
                    >
                        {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isSubscribed ? (
                            <Check className="w-4 h-4" />
                        ) : (
                            <Bell className="w-4 h-4" />
                        )}
                        {isSubscribed ? '已订阅通知' : '上线提醒我'}
                    </button>

                    <p className="text-sm text-foreground-secondary mt-4">
                        {isSubscribed
                            ? '功能上线后，我们会通过邮件和站内消息通知您'
                            : '功能上线后，我们会第一时间通知您'
                        }
                    </p>

                    {isSubscribed && (
                        <button
                            onClick={handleSubscribe}
                            className="text-sm text-foreground-secondary hover:text-foreground mt-2 underline"
                        >
                            取消订阅
                        </button>
                    )}
                </div>

                <AuthModal
                    isOpen={showAuthModal}
                    onClose={() => setShowAuthModal(false)}
                />
            </div>
        </LoginOverlay>
    );
}
