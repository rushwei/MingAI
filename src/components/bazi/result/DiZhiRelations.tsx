/**
 * 地支关系显示组件
 *
 * 直接消费 core 已计算好的关系数据，web 不再重复维护规则表。
 */
'use client';

import { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Shuffle } from 'lucide-react';
import type { BaziRelation } from '@/types';

interface DiZhiRelationsProps {
    relations: BaziRelation[];
    isUnknownTime?: boolean;
}

export function DiZhiRelations({ relations, isUnknownTime }: DiZhiRelationsProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    const visibleRelations = useMemo(() => {
        if (!isUnknownTime) {
            return relations;
        }
        return relations.filter((item) => !item.pillars.includes('时支'));
    }, [isUnknownTime, relations]);

    if (visibleRelations.length === 0) {
        return null;
    }

    const getTypeStyle = (type: BaziRelation['type']) => {
        switch (type) {
            case '合':
                return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
            case '冲':
                return 'text-rose-500 bg-rose-500/10 border-rose-500/30';
            case '刑':
                return 'text-amber-500 bg-amber-500/10 border-amber-500/30';
            case '害':
                return 'text-purple-500 bg-purple-500/10 border-purple-500/30';
            default:
                return 'text-foreground-secondary bg-background';
        }
    };

    return (
        <section className="bg-background rounded-xl overflow-hidden">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between p-4 hover:bg-background-tertiary/50 transition-colors"
            >
                <h2 className="text-base font-semibold flex items-center gap-2">
                    <Shuffle className="w-4 h-4 text-accent" />
                    地支关系
                </h2>
                <div className="flex items-center gap-2 text-foreground-secondary">
                    <span className="text-xs">
                        {visibleRelations.length}项关系
                    </span>
                    {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                    ) : (
                        <ChevronDown className="w-4 h-4" />
                    )}
                </div>
            </button>

            {isExpanded && (
                <div className="px-4 pb-4 animate-fade-in">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {visibleRelations.map((rel, idx) => (
                            <div
                                key={`${rel.type}-${rel.description}-${idx}`}
                                className={`flex items-center justify-between p-2 rounded-lg border ${getTypeStyle(rel.type)}`}
                            >
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-sm">{rel.type}</span>
                                    <span className="text-sm">{rel.description}</span>
                                </div>
                                <span className="text-xs opacity-70">
                                    {rel.pillars.join('·')}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}
