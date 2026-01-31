/**
 * 四柱输入组件
 *
 * 'use client' 标记说明：
 * - 使用 useState 管理选择状态
 * - 包含交互式选择器
 */
'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import type { HeavenlyStem, EarthlyBranch, PillarData } from '@/types';

// 天干和地支选项
const HEAVENLY_STEMS: HeavenlyStem[] = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
const EARTHLY_BRANCHES: EarthlyBranch[] = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 五行颜色映射
const ELEMENT_COLORS: Record<string, string> = {
    '甲': 'text-green-600', '乙': 'text-green-600',
    '丙': 'text-red-600', '丁': 'text-red-600',
    '戊': 'text-yellow-600', '己': 'text-yellow-600',
    '庚': 'text-gray-600', '辛': 'text-gray-600',
    '壬': 'text-blue-600', '癸': 'text-blue-600',
    '寅': 'text-green-600', '卯': 'text-green-600',
    '巳': 'text-red-600', '午': 'text-red-600',
    '辰': 'text-yellow-600', '戌': 'text-yellow-600', '丑': 'text-yellow-600', '未': 'text-yellow-600',
    '申': 'text-gray-600', '酉': 'text-gray-600',
    '亥': 'text-blue-600', '子': 'text-blue-600',
};

type PillarType = 'year' | 'month' | 'day' | 'hour';

interface PillarsInputProps {
    value?: {
        year: PillarData;
        month: PillarData;
        day: PillarData;
        hour: PillarData;
    };
    onChange: (pillars: {
        year: PillarData;
        month: PillarData;
        day: PillarData;
        hour: PillarData;
    }) => void;
}

export function PillarsInput({ value, onChange }: PillarsInputProps) {
    const [selectedPillar, setSelectedPillar] = useState<PillarType | null>(null);
    const [selectingType, setSelectingType] = useState<'stem' | 'branch' | null>(null);

    const pillars = value || {
        year: { stem: '甲', branch: '子' },
        month: { stem: '甲', branch: '子' },
        day: { stem: '甲', branch: '子' },
        hour: { stem: '甲', branch: '子' },
    };

    const handleSelect = (type: 'stem' | 'branch', char: HeavenlyStem | EarthlyBranch) => {
        if (!selectedPillar) return;

        const newPillars = { ...pillars };
        if (type === 'stem') {
            newPillars[selectedPillar].stem = char as HeavenlyStem;
        } else {
            newPillars[selectedPillar].branch = char as EarthlyBranch;
        }

        onChange(newPillars);
        setSelectingType(null);
        setSelectedPillar(null);
    };

    const openSelector = (pillar: PillarType, type: 'stem' | 'branch') => {
        setSelectedPillar(pillar);
        setSelectingType(type);
    };

    return (
        <div className="space-y-4">
            {/* 四柱显示 */}
            <div className="grid grid-cols-4 gap-3">
                {(['year', 'month', 'day', 'hour'] as PillarType[]).map((pillarType) => {
                    const labels = { year: '年柱', month: '月柱', day: '日柱', hour: '时柱' };
                    const pillar = pillars[pillarType];

                    return (
                        <div key={pillarType} className="space-y-2">
                            <div className="text-xs text-center text-foreground-secondary">
                                {labels[pillarType]}
                            </div>
                            <div className="space-y-1">
                                {/* 天干 */}
                                <button
                                    type="button"
                                    onClick={() => openSelector(pillarType, 'stem')}
                                    className={`w-full py-3 rounded-lg border text-lg font-bold transition-all
                                        ${selectedPillar === pillarType && selectingType === 'stem'
                                            ? 'bg-accent text-white border-accent'
                                            : 'bg-background border-border hover:border-accent/50'
                                        } ${ELEMENT_COLORS[pillar.stem]}`}
                                >
                                    {pillar.stem}
                                </button>
                                {/* 地支 */}
                                <button
                                    type="button"
                                    onClick={() => openSelector(pillarType, 'branch')}
                                    className={`w-full py-3 rounded-lg border text-lg font-bold transition-all
                                        ${selectedPillar === pillarType && selectingType === 'branch'
                                            ? 'bg-accent text-white border-accent'
                                            : 'bg-background border-border hover:border-accent/50'
                                        } ${ELEMENT_COLORS[pillar.branch]}`}
                                >
                                    {pillar.branch}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* 选择器面板 */}
            {selectedPillar && selectingType && (
                <div className="bg-background-secondary/50 rounded-xl p-4 border border-border animate-fade-in">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium">
                            选择{selectingType === 'stem' ? '天干' : '地支'}
                        </h3>
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedPillar(null);
                                setSelectingType(null);
                            }}
                            className="text-foreground-secondary hover:text-foreground"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className={`grid gap-2 ${selectingType === 'stem' ? 'grid-cols-5' : 'grid-cols-6'}`}>
                        {(selectingType === 'stem' ? HEAVENLY_STEMS : EARTHLY_BRANCHES).map((char) => (
                            <button
                                key={char}
                                type="button"
                                onClick={() => handleSelect(selectingType, char)}
                                className={`
                                    w-full aspect-square rounded-full border-2 text-lg font-bold
                                    transition-all duration-200 hover:scale-110
                                    ${ELEMENT_COLORS[char]}
                                    ${(selectingType === 'stem' && pillars[selectedPillar].stem === char) ||
                                        (selectingType === 'branch' && pillars[selectedPillar].branch === char)
                                        ? 'bg-accent/10 border-accent'
                                        : 'bg-background border-border hover:border-accent/50'
                                    }
                                `}
                            >
                                {char}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
