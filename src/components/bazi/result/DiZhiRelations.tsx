/**
 * 地支关系显示组件
 * 
 * 显示四柱地支之间的刑害合冲关系
 */
'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Shuffle } from 'lucide-react';

interface DiZhiRelationsProps {
    yearBranch: string;
    monthBranch: string;
    dayBranch: string;
    hourBranch: string;
    isUnknownTime?: boolean;
}

// 地支六合
const LIU_HE: Record<string, string> = {
    '子': '丑', '丑': '子',
    '寅': '亥', '亥': '寅',
    '卯': '戌', '戌': '卯',
    '辰': '酉', '酉': '辰',
    '巳': '申', '申': '巳',
    '午': '未', '未': '午',
};

// 地支三合局
const SAN_HE: { branches: string[]; element: string }[] = [
    { branches: ['申', '子', '辰'], element: '水局' },
    { branches: ['巳', '酉', '丑'], element: '金局' },
    { branches: ['寅', '午', '戌'], element: '火局' },
    { branches: ['亥', '卯', '未'], element: '木局' },
];

// 地支六冲
const LIU_CHONG: Record<string, string> = {
    '子': '午', '午': '子',
    '丑': '未', '未': '丑',
    '寅': '申', '申': '寅',
    '卯': '酉', '酉': '卯',
    '辰': '戌', '戌': '辰',
    '巳': '亥', '亥': '巳',
};

// 地支相害
const XIANG_HAI: Record<string, string> = {
    '子': '未', '未': '子',
    '丑': '午', '午': '丑',
    '寅': '巳', '巳': '寅',
    '卯': '辰', '辰': '卯',
    '申': '亥', '亥': '申',
    '酉': '戌', '戌': '酉',
};

// 地支相刑（三刑、自刑）
const XIANG_XING: { combination: string[]; name: string }[] = [
    { combination: ['寅', '巳', '申'], name: '无恩之刑' },
    { combination: ['丑', '戌', '未'], name: '恃势之刑' },
    { combination: ['子', '卯'], name: '无礼之刑' },
    { combination: ['辰'], name: '辰自刑' },
    { combination: ['午'], name: '午自刑' },
    { combination: ['酉'], name: '酉自刑' },
    { combination: ['亥'], name: '亥自刑' },
];

interface Relationship {
    type: '合' | '冲' | '刑' | '害';
    pillars: string[];  // 涉及的柱位
    description: string;
    isAuspicious: boolean;
}

export function DiZhiRelations({ yearBranch, monthBranch, dayBranch, hourBranch, isUnknownTime }: DiZhiRelationsProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    const branches = isUnknownTime
        ? [yearBranch, monthBranch, dayBranch]
        : [yearBranch, monthBranch, dayBranch, hourBranch];
    const pillarNames = isUnknownTime
        ? ['年支', '月支', '日支']
        : ['年支', '月支', '日支', '时支'];

    const relationships: Relationship[] = [];

    // 检查六合
    for (let i = 0; i < branches.length; i++) {
        for (let j = i + 1; j < branches.length; j++) {
            if (LIU_HE[branches[i]] === branches[j]) {
                relationships.push({
                    type: '合',
                    pillars: [pillarNames[i], pillarNames[j]],
                    description: `${branches[i]}${branches[j]}六合`,
                    isAuspicious: true,
                });
            }
        }
    }

    // 检查三合局
    for (const sanHe of SAN_HE) {
        const matchingBranches = branches.filter(b => sanHe.branches.includes(b));
        const uniqueBranches = Array.from(new Set(matchingBranches));
        if (uniqueBranches.length >= 2) {
            const matchingPillars = branches
                .map((b, i) => sanHe.branches.includes(b) ? pillarNames[i] : null)
                .filter(Boolean) as string[];

            if (uniqueBranches.length === 3) {
                relationships.push({
                    type: '合',
                    pillars: matchingPillars,
                    description: `${uniqueBranches.join('')}三合${sanHe.element}`,
                    isAuspicious: true,
                });
            } else {
                relationships.push({
                    type: '合',
                    pillars: matchingPillars,
                    description: `${uniqueBranches.join('')}半合${sanHe.element}`,
                    isAuspicious: true,
                });
            }
        }
    }

    // 检查六冲
    for (let i = 0; i < branches.length; i++) {
        for (let j = i + 1; j < branches.length; j++) {
            if (LIU_CHONG[branches[i]] === branches[j]) {
                relationships.push({
                    type: '冲',
                    pillars: [pillarNames[i], pillarNames[j]],
                    description: `${branches[i]}${branches[j]}相冲`,
                    isAuspicious: false,
                });
            }
        }
    }

    // 检查相害
    for (let i = 0; i < branches.length; i++) {
        for (let j = i + 1; j < branches.length; j++) {
            if (XIANG_HAI[branches[i]] === branches[j]) {
                relationships.push({
                    type: '害',
                    pillars: [pillarNames[i], pillarNames[j]],
                    description: `${branches[i]}${branches[j]}相害`,
                    isAuspicious: false,
                });
            }
        }
    }

    // 检查相刑
    for (const xing of XIANG_XING) {
        const matchingBranches = branches.filter(b => xing.combination.includes(b));
        if (xing.combination.length === 1) {
            // 自刑：需要同一个地支出现两次
            const count = branches.filter(b => b === xing.combination[0]).length;
            if (count >= 2) {
                const matchingPillars = branches
                    .map((b, i) => b === xing.combination[0] ? pillarNames[i] : null)
                    .filter(Boolean) as string[];
                relationships.push({
                    type: '刑',
                    pillars: matchingPillars,
                    description: xing.name,
                    isAuspicious: false,
                });
            }
        } else if (matchingBranches.length >= 2) {
            const matchingPillars = branches
                .map((b, i) => xing.combination.includes(b) ? pillarNames[i] : null)
                .filter(Boolean) as string[];
            relationships.push({
                type: '刑',
                pillars: matchingPillars,
                description: xing.name,
                isAuspicious: false,
            });
        }
    }

    if (relationships.length === 0) {
        return null;
    }

    const getTypeStyle = (type: Relationship['type']) => {
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
        <section className="bg-background-secondary rounded-xl border border-border overflow-hidden">
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
                        {relationships.length}项关系
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
                        {relationships.map((rel, idx) => (
                            <div
                                key={idx}
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
