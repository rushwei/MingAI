/**
 * 功能模块门控组件
 *
 * 'use client' 标记说明：
 * - 使用 useFeatureToggles 和客户端会话状态
 * - 需要 hydration guard 避免首屏错配
 */
'use client';

import { useSyncExternalStore } from 'react';
import { LogIn, ShieldOff } from 'lucide-react';
import Link from 'next/link';
import { useSessionSafe } from '@/components/providers/ClientProviders';
import { useFeatureToggles } from '@/lib/hooks/useFeatureToggles';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';

interface FeatureGateProps {
    featureId: string;
    children: React.ReactNode;
}

export function FeatureGate({ featureId, children }: FeatureGateProps) {
    const hydrated = useSyncExternalStore(
        () => () => {},
        () => true,
        () => false
    );
    const { user, loading: sessionLoading } = useSessionSafe();
    const isAuthed = !!user;
    const { isFeatureEnabled, isLoading: featureLoading } = useFeatureToggles({
        enabled: hydrated && isAuthed,
    });
    const isLoading = sessionLoading || (isAuthed && featureLoading);

    if (!hydrated || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <SoundWaveLoader variant="block" />
            </div>
        );
    }

    if (!isAuthed) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                    <LogIn className="w-8 h-8 text-accent" />
                </div>
                <h2 className="text-lg font-medium text-foreground mb-2">
                    请先登录
                </h2>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                    匿名访问已关闭，请登录后继续使用此功能。
                </p>
                <Link
                    href="/user"
                    className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                    前往登录
                </Link>
            </div>
        );
    }

    if (!isFeatureEnabled(featureId)) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <ShieldOff className="w-8 h-8 text-muted-foreground" />
                </div>
                <h2 className="text-lg font-medium text-foreground mb-2">
                    功能暂未开放
                </h2>
                <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                    该功能当前未启用，请联系管理员或稍后再试
                </p>
                <Link
                    href="/user"
                    className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                    返回用户中心
                </Link>
            </div>
        );
    }

    return <>{children}</>;
}
