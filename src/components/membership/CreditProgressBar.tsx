/**
 * 积分进度条组件
 * 
 * 显示当前积分/上限、补充率、上次补充时间
 */
'use client';

import { useMemo } from 'react';
import { Clock, RefreshCw, BotMessageSquare } from 'lucide-react';
import type { MembershipType } from '@/lib/user/membership';
import { getPlanConfig } from '@/lib/user/membership';

interface CreditProgressBarProps {
    /** 当前积分 */
    credits: number;
    /** 会员类型 */
    membershipType: MembershipType;
    /** 上次恢复时间 */
    lastRestoreAt?: Date | null;
    extraLimit?: number;
}

export function CreditProgressBar({
    credits,
    membershipType,
    lastRestoreAt,
    extraLimit = 0,
}: CreditProgressBarProps) {
    const plan = getPlanConfig(membershipType);
    const limit = plan.creditLimit + Math.max(0, extraLimit);
    const percentage = Math.min((credits / limit) * 100, 100);

    // 恢复率描述
    const restoreRateText = useMemo(() => {
        if (plan.restorePeriod === 'hourly') {
            return `每小时 +${plan.restoreCredits}`;
        }
        return `每日 +${plan.restoreCredits}`;
    }, [plan]);

    // 上次恢复时间格式化
    const lastRestoreText = useMemo(() => {
        if (!lastRestoreAt) return null;
        const now = new Date();
        const diff = now.getTime() - lastRestoreAt.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 24) {
            const days = Math.floor(hours / 24);
            return `${days}天前`;
        } else if (hours > 0) {
            return `${hours}小时前`;
        } else if (minutes > 0) {
            return `${minutes}分钟前`;
        }
        return '刚刚';
    }, [lastRestoreAt]);

    // 进度条颜色
    const getProgressColor = () => {
        if (percentage > 60) return 'from-green-500 to-emerald-500';
        if (percentage > 30) return 'from-yellow-500 to-amber-500';
        return 'from-red-500 to-orange-500';
    };

    return (
        <div className="md:w-2/3 rounded-2xl bg-background border-border p-4">
            {/* 头部 */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    {/* <div className="p-1.5 rounded-lg bg-accent/10">
                        <Zap className="w-4 h-4 text-accent" />
                    </div> */}
                    <BotMessageSquare className="w-4.5 h-4.5 text-foreground-secondary" />
                    <span className="font-medium">积分</span>
                    <span className="text-xs text-foreground-secondary">（1积分 = 1次AI对话）</span>
                </div>
                <div className="text-right">
                    <span className="text-2xl font-bold">{credits}</span>
                    <span className="text-foreground-secondary">/{limit}</span>
                </div>
            </div>

            {/* 进度条 */}
            <div className="h-3 bg-background rounded-full overflow-hidden mb-3">
                <div
                    className={`h-full bg-gradient-to-r ${getProgressColor()} transition-all duration-500 rounded-full`}
                    style={{ width: `${percentage}%` }}
                />
            </div>

            {/* 恢复信息 */}
            <div className="flex items-center justify-between text-xs text-foreground-secondary">
                <div className="flex items-center gap-1.5">
                    <RefreshCw className="w-3 h-3" />
                    <span>补充率: {restoreRateText}</span>
                </div>
                {lastRestoreText && (
                    <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3" />
                        <span>上次补充: {lastRestoreText}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
