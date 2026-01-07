'use client';

import { useState } from 'react';
import type { ZiweiChart } from '@/lib/ziwei';
import { getBranchIndex } from '@/lib/ziwei';
import { PalaceCard } from './PalaceCard';
import type { HoroscopeInfo } from './ZiweiHoroscopePanel';
import { Eye, EyeOff } from 'lucide-react';

interface ZiweiChartProps {
    chart: ZiweiChart;
    highlightedPalaces?: number[];
    horoscopeInfo?: HoroscopeInfo;
}

// 三方四正计算：获取与指定宫位形成三方四正的宫位索引
function getSanFangSiZheng(palaceIndex: number): number[] {
    // 三方：相隔4宫（120度）
    // 四正：对宫（相隔6宫，180度）
    const sanFang = [
        (palaceIndex + 4) % 12,
        (palaceIndex + 8) % 12,
    ];
    const siZheng = (palaceIndex + 6) % 12;
    return [palaceIndex, ...sanFang, siZheng];
}

/**
 * 紫微斗数命盘 12 宫位图
 */
export function ZiweiChartGrid({ chart, highlightedPalaces = [], horoscopeInfo }: ZiweiChartProps) {
    const [selectedPalace, setSelectedPalace] = useState<number | null>(null);
    const [showAdjStars, setShowAdjStars] = useState(false);

    const lifePalaceIndex = chart.palaces.findIndex(p => p.name === '命宫');
    const bodyPalaceIndex = chart.palaces.findIndex(p => p.isBodyPalace);

    const getPalaceByBranch = (branchIndex: number) => {
        return chart.palaces.find(p => getBranchIndex(p.earthlyBranch) === branchIndex);
    };

    // 计算三方四正高亮
    const sanFangSiZhengPalaces = selectedPalace !== null ? getSanFangSiZheng(selectedPalace) : [];

    // 生成宫位的流年流月信息
    const getFlowInfoForPalace = (palaceIndex: number) => {
        if (!horoscopeInfo) return undefined;

        const flowInfo: {
            decadal?: { stem: string; ages: string };
            yearly?: string;
            monthly?: string;
            daily?: string
        } = {};

        if (horoscopeInfo.decadal && horoscopeInfo.decadal.palace.index === palaceIndex) {
            flowInfo.decadal = {
                stem: horoscopeInfo.decadal.heavenlyStem,
                ages: `${horoscopeInfo.decadal.startAge}-${horoscopeInfo.decadal.endAge}岁`,
            };
        }

        if (horoscopeInfo.yearly && horoscopeInfo.yearly.palaceIndex === palaceIndex) {
            flowInfo.yearly = horoscopeInfo.yearly.heavenlyStem;
        }

        if (horoscopeInfo.monthly && horoscopeInfo.monthly.palaceIndex === palaceIndex) {
            flowInfo.monthly = horoscopeInfo.monthly.heavenlyStem;
        }

        if (horoscopeInfo.daily && horoscopeInfo.daily.palaceIndex === palaceIndex) {
            flowInfo.daily = horoscopeInfo.daily.heavenlyStem;
        }

        return Object.keys(flowInfo).length > 0 ? flowInfo : undefined;
    };

    const gridLayout = [
        [5, 6, 7, 8],
        [4, -1, -1, 9],
        [3, -1, -1, 10],
        [2, 1, 0, 11],
    ];

    const lifePalaceBranch = chart.palaces[lifePalaceIndex]?.earthlyBranch || '';
    const bodyPalaceBranch = chart.palaces[bodyPalaceIndex]?.earthlyBranch || '';

    return (
        <div className="w-full">
            {/* 杂曜开关 */}
            <div className="flex justify-end mb-2">
                <button
                    onClick={() => setShowAdjStars(!showAdjStars)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-colors ${showAdjStars
                            ? 'bg-accent/10 text-accent'
                            : 'bg-background-secondary text-foreground-secondary hover:bg-background-tertiary'
                        }`}
                >
                    {showAdjStars ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    {showAdjStars ? '隐藏杂曜' : '显示杂曜'}
                </button>
            </div>

            <div className="grid grid-cols-4 gap-1 sm:gap-2">
                {gridLayout.map((row, rowIdx) =>
                    row.map((branchIdx, colIdx) => {
                        if (branchIdx === -1) {
                            if (rowIdx === 1 && colIdx === 1) {
                                return (
                                    <div
                                        key={`center-${rowIdx}-${colIdx}`}
                                        className="col-span-2 row-span-2 p-3 rounded-lg bg-gradient-to-br from-background-secondary to-background border border-border"
                                    >
                                        <div className="h-full flex flex-col justify-center text-sm space-y-1.5">
                                            {/* 四柱信息 */}
                                            <div className="grid grid-cols-4 gap-1 text-center text-xs">
                                                <div>
                                                    <div className="text-foreground-secondary">年柱</div>
                                                    <div className="font-semibold">{chart.yearStem}{chart.yearBranch}</div>
                                                </div>
                                                <div>
                                                    <div className="text-foreground-secondary">月柱</div>
                                                    <div className="font-semibold">{chart.monthStem}{chart.monthBranch}</div>
                                                </div>
                                                <div>
                                                    <div className="text-foreground-secondary">日柱</div>
                                                    <div className="font-semibold">{chart.dayStem}{chart.dayBranch}</div>
                                                </div>
                                                <div>
                                                    <div className="text-foreground-secondary">时柱</div>
                                                    <div className="font-semibold">{chart.hourStem}{chart.hourBranch}</div>
                                                </div>
                                            </div>

                                            <div className="border-t border-border my-1" />

                                            <div className="flex justify-center gap-2 text-xs">
                                                <span className="text-foreground-secondary">阳历</span>
                                                <span>{chart.solarDate}</span>
                                            </div>
                                            <div className="flex justify-center gap-2 text-xs">
                                                <span className="text-foreground-secondary">农历</span>
                                                <span>{chart.lunarDate}</span>
                                            </div>

                                            <div className="border-t border-border my-1" />

                                            <div className="flex justify-center gap-4 text-xs">
                                                <span>{chart.zodiac}</span>
                                                <span>{chart.sign}</span>
                                            </div>

                                            <div className="flex justify-center gap-4 text-xs">
                                                <span>命主：<span className="font-semibold text-purple-500">{chart.soul}</span></span>
                                                <span>身主：<span className="font-semibold">{chart.body}</span></span>
                                            </div>

                                            <div className="flex justify-center gap-4 text-xs">
                                                <span>命宫：<span className="text-accent">{lifePalaceBranch}</span></span>
                                                <span>身宫：<span className="text-amber-500">{bodyPalaceBranch}</span></span>
                                            </div>

                                            <div className="text-center">
                                                <span className="px-2 py-0.5 rounded bg-accent/10 text-accent text-xs font-medium">
                                                    {chart.fiveElement}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        }

                        const palace = getPalaceByBranch(branchIdx);
                        if (!palace) return null;

                        const palaceIndex = chart.palaces.indexOf(palace);
                        const isLifePalace = palaceIndex === lifePalaceIndex;
                        const isHighlighted = highlightedPalaces.includes(palaceIndex) || sanFangSiZhengPalaces.includes(palaceIndex);
                        const flowInfo = getFlowInfoForPalace(palaceIndex);

                        return (
                            <PalaceCard
                                key={`palace-${branchIdx}`}
                                palace={palace}
                                isSelected={selectedPalace === palaceIndex}
                                isLifePalace={isLifePalace}
                                isHighlighted={isHighlighted}
                                isSanFangSiZheng={sanFangSiZhengPalaces.includes(palaceIndex) && selectedPalace !== palaceIndex}
                                showAdjStars={showAdjStars}
                                flowInfo={flowInfo}
                                onClick={() => setSelectedPalace(
                                    selectedPalace === palaceIndex ? null : palaceIndex
                                )}
                            />
                        );
                    })
                )}
            </div>

            {/* 选中宫位详情 */}
            {selectedPalace !== null && chart.palaces[selectedPalace] && (
                <div className="mt-4 p-4 rounded-lg bg-background-secondary border border-border">
                    <h3 className="font-semibold mb-2">
                        {chart.palaces[selectedPalace].name}
                        <span className="text-sm font-normal text-foreground-secondary ml-2">
                            {chart.palaces[selectedPalace].heavenlyStem}
                            {chart.palaces[selectedPalace].earthlyBranch}
                        </span>
                        {chart.palaces[selectedPalace].isBodyPalace && (
                            <span className="ml-2 text-xs text-amber-500">（身宫）</span>
                        )}
                    </h3>
                    <div className="space-y-2">
                        <div>
                            <span className="text-sm text-foreground-secondary">主星：</span>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {chart.palaces[selectedPalace].majorStars.map((star, idx) => (
                                    <span key={idx} className="px-2 py-0.5 rounded bg-accent/10 text-sm">
                                        <span className="text-purple-500">{star.name}</span>
                                        {star.brightness && <span className="text-xs text-foreground-secondary ml-0.5">{star.brightness}</span>}
                                        {star.mutagen && <span className="text-xs text-amber-500 ml-0.5">{star.mutagen}</span>}
                                    </span>
                                ))}
                                {chart.palaces[selectedPalace].majorStars.length === 0 && (
                                    <span className="text-sm text-foreground-secondary">无主星</span>
                                )}
                            </div>
                        </div>
                        <div>
                            <span className="text-sm text-foreground-secondary">辅星：</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {chart.palaces[selectedPalace].minorStars.map((star, idx) => (
                                    <span key={idx} className="text-xs text-foreground-secondary px-1.5 py-0.5 rounded bg-background">
                                        {star.name}
                                        {star.brightness && <span className="ml-0.5 text-gray-400">{star.brightness}</span>}
                                    </span>
                                ))}
                            </div>
                        </div>
                        {chart.palaces[selectedPalace].adjStars && chart.palaces[selectedPalace].adjStars.length > 0 && (
                            <div>
                                <span className="text-sm text-foreground-secondary">杂曜：</span>
                                <div className="flex flex-wrap gap-1 mt-1">
                                    {chart.palaces[selectedPalace].adjStars.map((star, idx) => (
                                        <span key={idx} className="text-xs text-gray-400 px-1.5 py-0.5 rounded bg-background">
                                            {star.name}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {/* 三方四正信息 */}
                        <div className="border-t border-border pt-2 mt-2">
                            <span className="text-sm text-foreground-secondary">三方四正：</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                                {sanFangSiZhengPalaces.map((idx, i) => (
                                    <span
                                        key={i}
                                        className={`text-xs px-1.5 py-0.5 rounded ${idx === selectedPalace
                                                ? 'bg-accent text-white'
                                                : 'bg-accent/10 text-accent'
                                            }`}
                                    >
                                        {chart.palaces[idx]?.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
