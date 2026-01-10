/**
 * 冲突点展示组件
 */
'use client';

import { AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { type ConflictPoint } from '@/lib/hepan';

interface ConflictPointsProps {
    conflicts: ConflictPoint[];
}

export function ConflictPoints({ conflicts }: ConflictPointsProps) {
    if (conflicts.length === 0) {
        return (
            <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6 text-center">
                <div className="text-4xl mb-2">✨</div>
                <p className="text-green-500 font-medium">暂未发现明显冲突点</p>
                <p className="text-sm text-foreground-secondary mt-1">
                    双方八字配合良好，关系发展顺利
                </p>
            </div>
        );
    }

    const severityConfig = {
        high: {
            icon: AlertTriangle,
            bgColor: 'bg-red-500/10',
            borderColor: 'border-red-500/30',
            iconColor: 'text-red-500',
            label: '高度关注',
        },
        medium: {
            icon: AlertCircle,
            bgColor: 'bg-yellow-500/10',
            borderColor: 'border-yellow-500/30',
            iconColor: 'text-yellow-500',
            label: '中度关注',
        },
        low: {
            icon: Info,
            bgColor: 'bg-blue-500/10',
            borderColor: 'border-blue-500/30',
            iconColor: 'text-blue-500',
            label: '轻度留意',
        },
    };

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">需要关注的问题</h3>

            {conflicts.map((conflict, index) => {
                const config = severityConfig[conflict.severity];
                const Icon = config.icon;

                return (
                    <div
                        key={index}
                        className={`${config.bgColor} border ${config.borderColor} rounded-xl p-4`}
                    >
                        <div className="flex items-start gap-3">
                            <Icon className={`w-5 h-5 mt-0.5 ${config.iconColor}`} />
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-medium text-foreground">{conflict.title}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${config.bgColor} ${config.iconColor}`}>
                                        {config.label}
                                    </span>
                                </div>
                                <p className="text-sm text-foreground-secondary mb-2">
                                    {conflict.description}
                                </p>
                                <div className="text-sm text-accent">
                                    💡 {conflict.suggestion}
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
