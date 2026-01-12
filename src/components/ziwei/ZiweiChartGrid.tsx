'use client';

import { useState, useEffect } from 'react';
import type { ZiweiChart, DecadalInfo } from '@/lib/ziwei';
import { getBranchIndex, getDecadalList } from '@/lib/ziwei';
import { getBranchElement, getElementColor } from '@/lib/bazi';
import { PalaceCard } from './PalaceCard';
import type { HoroscopeInfo, HoroscopeHighlight } from './ZiweiHoroscopePanel';
import { Eye, EyeOff } from 'lucide-react';

interface ZiweiChartProps {
    chart: ZiweiChart;
    horoscopeHighlight?: HoroscopeHighlight;
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

// 五行颜色映射：天干对应五行
function getStemElementColor(stem: string | undefined): string {
    if (!stem) return 'text-foreground';
    // 甲乙-木-绿, 丙丁-火-红, 戊己-土-黄, 庚辛-金-金色, 壬癸-水-蓝
    switch (stem) {
        case '甲': case '乙': return 'text-green-500';  // 木
        case '丙': case '丁': return 'text-red-500';    // 火
        case '戊': case '己': return 'text-amber-500';  // 土
        case '庚': case '辛': return 'text-yellow-400'; // 金
        case '壬': case '癸': return 'text-blue-500';   // 水
        default: return 'text-foreground';
    }
}

function getBranchElementStyle(branch: string | undefined): { color: string } | undefined {
    if (!branch) return undefined;
    const element = getBranchElement(branch);
    return element ? { color: getElementColor(element) } : undefined;
}

// 生成命盘文字版本
function generateChartText(chart: ZiweiChart, horoscopeInfo?: HoroscopeInfo): string {
    const lines: string[] = [];
    lines.push('【紫微斗数命盘】');
    lines.push(`阳历：${chart.solarDate}`);
    lines.push(`农历：${chart.lunarDate}`);
    lines.push(`四柱：${chart.yearStem}${chart.yearBranch} ${chart.monthStem}${chart.monthBranch} ${chart.dayStem}${chart.dayBranch} ${chart.hourStem}${chart.hourBranch}`);
    lines.push(`命主：${chart.soul}  身主：${chart.body}`);
    lines.push(`五行局：${chart.fiveElement}`);
    lines.push(`属相：${chart.zodiac}  星座：${chart.sign}`);
    lines.push('');
    lines.push('【十二宫位】');
    chart.palaces.forEach((palace) => {
        const bodyMark = palace.isBodyPalace ? '（身宫）' : '';
        const majorStars = palace.majorStars.map(s => {
            let str = s.name;
            if (s.brightness) str += s.brightness;
            if (s.mutagen) str += `化${s.mutagen}`;
            return str;
        }).join('、') || '无主星';
        const minorStars = palace.minorStars.map(s => s.name + (s.brightness || '')).join('、');
        const adjStars = palace.adjStars?.map(s => s.name).join('、');
        lines.push(`${palace.name}${bodyMark}（${palace.heavenlyStem}${palace.earthlyBranch}）`);
        lines.push(`  主星：${majorStars}`);
        if (minorStars) lines.push(`  辅星：${minorStars}`);
        if (adjStars) lines.push(`  杂曜：${adjStars}`);
    });
    lines.push('');

    // 大限列表
    const decadalList: DecadalInfo[] = getDecadalList(chart);
    if (decadalList.length > 0) {
        lines.push('【大限排列】');
        decadalList.forEach((d: DecadalInfo) => {
            lines.push(`${d.startAge}-${d.endAge}岁 ${d.heavenlyStem}${d.palace.earthlyBranch} ${d.palace.name}`);
        });
        lines.push('');
    }

    // 当前选中的流年
    if (horoscopeInfo?.yearly) {
        lines.push(`【当前流年】${horoscopeInfo.yearly.heavenlyStem}${horoscopeInfo.yearly.earthlyBranch}`);
    }

    return lines.join('\n');
}

/**
 * 紫微斗数命盘 12 宫位图
 */
export function ZiweiChartGrid({ chart, horoscopeHighlight = {}, horoscopeInfo }: ZiweiChartProps) {
    const lifePalaceIndex = chart.palaces.findIndex(p => p.name === '命宫');
    const bodyPalaceIndex = chart.palaces.findIndex(p => p.isBodyPalace);

    // 默认选中命宫，显示三方四正
    const [selectedPalace, setSelectedPalace] = useState<number | null>(lifePalaceIndex >= 0 ? lifePalaceIndex : null);
    const [showAdjStars, setShowAdjStars] = useState(true); // 默认显示杂曜
    const [copied, setCopied] = useState(false);

    // 当命盘变化时重新选中命宫
    useEffect(() => {
        const newLifeIndex = chart.palaces.findIndex(p => p.name === '命宫');
        setSelectedPalace(newLifeIndex >= 0 ? newLifeIndex : null);
    }, [chart]);

    const getPalaceByBranch = (branchIndex: number) => {
        return chart.palaces.find(p => getBranchIndex(p.earthlyBranch) === branchIndex);
    };

    // 计算三方四正高亮
    const sanFangSiZhengPalaces = selectedPalace !== null ? getSanFangSiZheng(selectedPalace) : [];

    // 获取宫位高亮类型（多色支持）
    const getHighlightTypes = (palaceIndex: number) => {
        const types: string[] = [];
        if (horoscopeHighlight.decadalIndex === palaceIndex) types.push('decadal');
        if (horoscopeHighlight.yearlyIndex === palaceIndex) types.push('yearly');
        if (horoscopeHighlight.monthlyIndex === palaceIndex) types.push('monthly');
        if (horoscopeHighlight.dailyIndex === palaceIndex) types.push('daily');
        return types;
    };

    // 复制命盘
    const handleCopy = async () => {
        const text = generateChartText(chart, horoscopeInfo);
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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
                ages: `${horoscopeInfo.decadal.startAge}岁`,
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
            {/* 工具栏 */}
            <div className="flex justify-end gap-2 mb-2">
                <button
                    onClick={handleCopy}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-colors ${copied
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-background-secondary text-foreground-secondary hover:bg-background-tertiary'
                        }`}
                >
                    {copied ? '已复制' : '复制排盘'}
                </button>
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
            {/* 三方四正连线SVG层 */}
            <div className="relative">
                {selectedPalace !== null && (
                    <svg
                        className="absolute inset-0 w-full h-full pointer-events-none z-10"
                        style={{ aspectRatio: '4/4' }}
                    >
                        {(() => {
                            // 宫位在网格中的位置映射 (branchIndex -> {row, col})
                            const positionMap: Record<number, { row: number; col: number }> = {
                                5: { row: 0, col: 0 }, 6: { row: 0, col: 1 }, 7: { row: 0, col: 2 }, 8: { row: 0, col: 3 },
                                4: { row: 1, col: 0 }, 9: { row: 1, col: 3 },
                                3: { row: 2, col: 0 }, 10: { row: 2, col: 3 },
                                2: { row: 3, col: 0 }, 1: { row: 3, col: 1 }, 0: { row: 3, col: 2 }, 11: { row: 3, col: 3 },
                            };

                            const selectedBranch = getBranchIndex(chart.palaces[selectedPalace]?.earthlyBranch || '');
                            const selectedPos = positionMap[selectedBranch];
                            if (!selectedPos) return null;

                            const sanFangIndexes = getSanFangSiZheng(selectedPalace);
                            const cellSize = 25; // 每个宫位占25%
                            const padding = 1; // 边框内侧偏移

                            const getAnchorPoint = (pos: { row: number; col: number }) => {
                                const isTop = pos.row === 0;
                                const isBottom = pos.row === 3;
                                const isLeft = pos.col === 0;
                                const isRight = pos.col === 3;
                                const centerX = (pos.col + 0.5) * cellSize;
                                const centerY = (pos.row + 0.5) * cellSize;

                                // 角落宫：取靠近中心的角点
                                if ((isTop && isLeft) || (isTop && isRight) || (isBottom && isLeft) || (isBottom && isRight)) {
                                    const x = isLeft ? (pos.col + 1) * cellSize - padding : pos.col * cellSize + padding;
                                    const y = isTop ? (pos.row + 1) * cellSize - padding : pos.row * cellSize + padding;
                                    return { x, y };
                                }

                                // 非角落：取靠近中心的边中点
                                if (isTop) return { x: centerX, y: (pos.row + 1) * cellSize - padding };
                                if (isBottom) return { x: centerX, y: pos.row * cellSize + padding };
                                if (isLeft) return { x: (pos.col + 1) * cellSize - padding, y: centerY };
                                if (isRight) return { x: pos.col * cellSize + padding, y: centerY };

                                return { x: centerX, y: centerY };
                            };

                            const lines: React.ReactNode[] = [];
                            const startPoint = getAnchorPoint(selectedPos);
                            sanFangIndexes.forEach((palaceIdx, i) => {
                                if (palaceIdx === selectedPalace) return;
                                const branch = getBranchIndex(chart.palaces[palaceIdx]?.earthlyBranch || '');
                                const targetPos = positionMap[branch];
                                if (!targetPos) return;

                                const from = startPoint;
                                const to = getAnchorPoint(targetPos);

                                lines.push(
                                    <line
                                        key={i}
                                        x1={`${from.x}%`}
                                        y1={`${from.y}%`}
                                        x2={`${to.x}%`}
                                        y2={`${to.y}%`}
                                        stroke="#9ca3af"
                                        strokeWidth="1.5"
                                        strokeOpacity="0.8"
                                    />
                                );
                            });
                            return lines;
                        })()}
                    </svg>
                )}

                <div className="grid grid-cols-4 gap-0.5 sm:gap-2 max-w-[460px] sm:max-w-none mx-auto">
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
                                                {/* 四柱信息 - 五行着色 */}
                                                <div className="grid grid-cols-4 gap-0.5 text-center text-xs">
                                                    <div>
                                                        <div className="text-foreground-secondary text-[10px]">年柱</div>
                                                        <div className="font-semibold">
                                                            <span className={getStemElementColor(chart.yearStem)}>{chart.yearStem || '*'}</span>
                                                            <span style={getBranchElementStyle(chart.yearBranch)}>{chart.yearBranch || '*'}</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-foreground-secondary text-[10px]">月柱</div>
                                                        <div className="font-semibold">
                                                            <span className={getStemElementColor(chart.monthStem)}>{chart.monthStem || '*'}</span>
                                                            <span style={getBranchElementStyle(chart.monthBranch)}>{chart.monthBranch || '*'}</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-foreground-secondary text-[10px]">日柱</div>
                                                        <div className="font-semibold">
                                                            <span className={getStemElementColor(chart.dayStem)}>{chart.dayStem || '*'}</span>
                                                            <span style={getBranchElementStyle(chart.dayBranch)}>{chart.dayBranch || '*'}</span>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <div className="text-foreground-secondary text-[10px]">时柱</div>
                                                        <div className="font-semibold">
                                                            <span className={getStemElementColor(chart.hourStem)}>{chart.hourStem || '*'}</span>
                                                            <span style={getBranchElementStyle(chart.hourBranch)}>{chart.hourBranch || '*'}</span>
                                                        </div>
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
                                                    <span>属相：{chart.zodiac}</span>
                                                    <span>星座：{chart.sign}</span>
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
                            const highlightTypes = getHighlightTypes(palaceIndex);
                            const isHighlighted = highlightTypes.length > 0 || sanFangSiZhengPalaces.includes(palaceIndex);
                            const flowInfo = getFlowInfoForPalace(palaceIndex);

                            return (
                                <PalaceCard
                                    key={`palace-${branchIdx}`}
                                    palace={palace}
                                    isSelected={selectedPalace === palaceIndex}
                                    isLifePalace={isLifePalace}
                                    isHighlighted={isHighlighted}
                                    highlightTypes={highlightTypes}
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
            </div>
        </div >
    );
}
