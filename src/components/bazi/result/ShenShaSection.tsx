/**
 * 出生日神煞展示组件
 * 
 * 显示出生当日的吉神宜趋和凶神宜忌
 * 注意：这是基于出生日期的黄历信息，不是基于八字命盘计算的神煞星
 */
'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import type { ShenShaInfo } from '@/lib/divination/bazi';

interface ShenShaSectionProps {
    shenSha: ShenShaInfo;
}

export function ShenShaSection({ shenSha }: ShenShaSectionProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // 只检查吉神和凶煞（出生日的神煞）
    const hasData = shenSha.jiShen.length > 0 || shenSha.xiongSha.length > 0;

    if (!hasData) {
        return null;
    }

    return (
        <section className="bg-background-secondary rounded-xl border border-border overflow-hidden">
            {/* 可折叠标题 */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-background-tertiary/50 transition-colors"
            >
                <h2 className="text-base font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-accent" />
                    出生日神煞
                </h2>
                <div className="flex items-center gap-2 text-foreground-secondary">
                    <span className="text-xs">
                        {isExpanded ? '收起' : '展开查看'}
                    </span>
                    {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                    ) : (
                        <ChevronDown className="w-4 h-4" />
                    )}
                </div>
            </button>

            {/* 展开内容 */}
            {isExpanded && (
                <div className="px-4 pb-4 space-y-4 animate-fade-in">
                    {/* 说明提示 */}
                    <div className="flex items-start gap-2 text-xs text-foreground-secondary bg-background p-2 rounded-lg">
                        <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                        <span>以下神煞基于出生当日的黄历信息，如需查看今日宜忌请使用「每日运势」功能</span>
                    </div>

                    {/* 吉神宜趋 */}
                    {shenSha.jiShen.length > 0 && (
                        <div>
                            <h3 className="text-sm font-medium text-emerald-500 flex items-center gap-1.5 mb-2">
                                <CheckCircle className="w-3.5 h-3.5" />
                                吉神宜趋
                            </h3>
                            <div className="flex flex-wrap gap-1.5">
                                {shenSha.jiShen.map((item, idx) => (
                                    <span
                                        key={idx}
                                        className="px-2 py-0.5 text-xs rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                    >
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 凶神宜忌 */}
                    {shenSha.xiongSha.length > 0 && (
                        <div>
                            <h3 className="text-sm font-medium text-rose-500 flex items-center gap-1.5 mb-2">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                凶神宜忌
                            </h3>
                            <div className="flex flex-wrap gap-1.5">
                                {shenSha.xiongSha.map((item, idx) => (
                                    <span
                                        key={idx}
                                        className="px-2 py-0.5 text-xs rounded bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                                    >
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
