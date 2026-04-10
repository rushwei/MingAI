/**
 * 积分进度条组件
 */
'use client';

import { BotMessageSquare, CalendarCheck } from 'lucide-react';
import type { MembershipType } from '@/lib/user/membership';
import { getPlanConfig } from '@/lib/user/membership';

interface CreditProgressBarProps {
    credits: number;
    membershipType: MembershipType;
}

export function CreditProgressBar({
    credits,
    membershipType,
}: CreditProgressBarProps) {
    const plan = getPlanConfig(membershipType);
    const limit = plan.creditLimit;
    const percentage = limit > 0 ? Math.min((credits / limit) * 100, 100) : 0;

    const rewardHint = membershipType === 'pro'
        ? '签到奖励: 随机 3-9 积分'
        : membershipType === 'plus'
            ? '签到奖励: 随机 2-6 积分'
            : '签到奖励: 随机 1-3 积分';

    const getProgressColor = () => {
        if (percentage > 60) return 'from-green-500 to-emerald-500';
        if (percentage > 30) return 'from-yellow-500 to-amber-500';
        return 'from-red-500 to-orange-500';
    };

    return (
        <div className="md:w-2/3 rounded-2xl bg-background border border-border p-4">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <BotMessageSquare className="w-4.5 h-4.5 text-foreground-secondary" />
                    <span className="font-medium">积分</span>
                    <span className="text-xs text-foreground-secondary">（1 积分 = 1 次 AI 对话）</span>
                </div>
                <div className="text-right">
                    <span className="text-2xl font-bold">{credits}</span>
                    <span className="text-foreground-secondary">/{limit}</span>
                </div>
            </div>

            <div className="h-3 bg-background rounded-full overflow-hidden mb-3">
                <div
                    className={`h-full bg-gradient-to-r ${getProgressColor()} transition-all duration-500 rounded-full`}
                    style={{ width: `${percentage}%` }}
                />
            </div>

            <div className="flex items-center justify-between text-xs text-foreground-secondary gap-3">
                <div className="flex items-center gap-1.5">
                    <CalendarCheck className="w-3 h-3" />
                    <span>{rewardHint}</span>
                </div>
                <span>低于上限时可签到，达到或超过上限后需先消耗积分</span>
            </div>
        </div>
    );
}
