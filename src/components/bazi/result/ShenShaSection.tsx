'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import type { ShenShaInfo } from '@/lib/bazi';

interface ShenShaSectionProps {
    shenSha: ShenShaInfo;
}

export function ShenShaSection({ shenSha }: ShenShaSectionProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const hasData = shenSha.jiShen.length > 0 ||
        shenSha.xiongSha.length > 0 ||
        shenSha.dayYi.length > 0 ||
        shenSha.dayJi.length > 0;

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
                    神煞宜忌
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

                    {/* 今日宜 */}
                    {shenSha.dayYi.length > 0 && (
                        <div>
                            <h3 className="text-sm font-medium text-sky-500 flex items-center gap-1.5 mb-2">
                                <CheckCircle className="w-3.5 h-3.5" />
                                今日宜
                            </h3>
                            <div className="flex flex-wrap gap-1.5">
                                {shenSha.dayYi.map((item, idx) => (
                                    <span
                                        key={idx}
                                        className="px-2 py-0.5 text-xs rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                                    >
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* 今日忌 */}
                    {shenSha.dayJi.length > 0 && (
                        <div>
                            <h3 className="text-sm font-medium text-amber-500 flex items-center gap-1.5 mb-2">
                                <XCircle className="w-3.5 h-3.5" />
                                今日忌
                            </h3>
                            <div className="flex flex-wrap gap-1.5">
                                {shenSha.dayJi.map((item, idx) => (
                                    <span
                                        key={idx}
                                        className="px-2 py-0.5 text-xs rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
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
