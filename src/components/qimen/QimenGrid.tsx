/**
 * 奇门遁甲九宫格组件
 *
 * 'use client' 标记说明：
 * - 需要在客户端渲染交互式九宫格
 */
'use client';

import type { QimenPalaceInfo } from '@/lib/divination/qimen-shared';

/** 五行旺衰颜色映射 */
const PHASE_COLORS: Record<string, string> = {
    '旺': 'text-green-500',
    '相': 'text-red-500',
    '休': 'text-blue-500',
    '囚': 'text-amber-500',
    '死': 'text-stone-500',
};

/** 天干五行映射 */
const STEM_ELEMENT: Record<string, string> = {
    '甲': '木', '乙': '木',
    '丙': '火', '丁': '火',
    '戊': '土', '己': '土',
    '庚': '金', '辛': '金',
    '壬': '水', '癸': '水',
};

/** 根据天干获取五行颜色 class */
function getStemColorClass(stem: string, monthPhase: Record<string, string>): string {
    const phase = monthPhase[stem];
    if (phase && PHASE_COLORS[phase]) return PHASE_COLORS[phase];
    // fallback: 按五行固定色
    const el = STEM_ELEMENT[stem];
    if (el === '木') return 'text-green-500';
    if (el === '火') return 'text-red-500';
    if (el === '土') return 'text-stone-500';
    if (el === '金') return 'text-amber-500';
    if (el === '水') return 'text-blue-500';
    return 'text-foreground-secondary';
}

/** 洛书九宫排列顺序（左上→右下，3x3） */
const LUOSHU_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6];

interface QimenGridProps {
    palaces: QimenPalaceInfo[];
    monthPhase: Record<string, string>;
    juNumber: number;
    dunType: 'yang' | 'yin';
}

function PalaceCell({
    palace,
    monthPhase,
    isCenterPalace,
    juNumber,
    dunType,
}: {
    palace: QimenPalaceInfo;
    monthPhase: Record<string, string>;
    isCenterPalace: boolean;
    juNumber: number;
    dunType: 'yang' | 'yin';
}) {
    if (isCenterPalace) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-1 text-foreground-secondary">
                <span className="text-xs opacity-60">{dunType === 'yang' ? '阳遁' : '阴遁'}</span>
                <span className="text-lg font-bold text-foreground">{juNumber}局</span>
                <span className="text-xs opacity-60">中五宫</span>
            </div>
        );
    }

    const earthColor = getStemColorClass(palace.earthStem, monthPhase);
    const heavenColor = getStemColorClass(palace.heavenStem, monthPhase);

    return (
        <div className="flex flex-col h-full gap-0.5 py-1.5 px-1 md:px-2 md:py-2 md:gap-1">
            {/* 格局标注 */}
            <div className="min-h-[1rem] md:min-h-[1.25rem]">
                {palace.patterns.length > 0 && (
                    <span className="text-[10px] md:text-xs text-purple-400 line-clamp-1">
                        {palace.patterns.join(' ')}
                    </span>
                )}
            </div>
            {/* 地盘天干 + 八神 */}
            <div className="flex items-center justify-between">
                <span className={`text-sm md:text-base font-medium ${earthColor}`}>
                    {palace.earthStem}
                </span>
                <span className="text-[10px] md:text-xs text-foreground-secondary">
                    {palace.god}
                </span>
            </div>
            {/* 九星 + 天盘天干 */}
            <div className="flex items-center justify-between">
                <span className="text-xs md:text-sm text-foreground-secondary">
                    {palace.star}
                </span>
                <span className={`text-sm md:text-base font-medium ${heavenColor}`}>
                    {palace.heavenStem}
                </span>
            </div>
            {/* 八门 */}
            <div className="flex items-center justify-between">
                <span className="text-xs md:text-sm text-foreground-secondary">
                    {palace.gate}
                </span>
            </div>
            {/* 空亡/驿马标记 */}
            {(palace.isEmpty || palace.isHorseStar) && (
                <div className="flex items-center gap-1 mt-auto">
                    {palace.isEmpty && (
                        <span className="text-[10px] text-amber-400" title="空亡">◎</span>
                    )}
                    {palace.isHorseStar && (
                        <span className="text-[10px] text-cyan-400" title="驿马">马</span>
                    )}
                </div>
            )}
        </div>
    );
}

export function QimenGrid({ palaces, monthPhase, juNumber, dunType }: QimenGridProps) {
    const palaceMap = new Map(palaces.map(p => [p.palaceNumber, p]));

    return (
        <div className="grid grid-cols-3 gap-[1px] bg-border/40 rounded-xl overflow-hidden border border-border/60">
            {LUOSHU_ORDER.map((num) => {
                const palace = palaceMap.get(num);
                if (!palace) return <div key={num} />;
                const isCenterPalace = num === 5;
                return (
                    <div
                        key={num}
                        className="bg-background min-h-[90px] md:min-h-[120px] relative"
                    >
                        {/* 宫名角标 */}
                        <span className="absolute top-0.5 left-1 text-[9px] md:text-[10px] text-foreground-tertiary/60">
                            {palace.palaceName}
                        </span>
                        <PalaceCell
                            palace={palace}
                            monthPhase={monthPhase}
                            isCenterPalace={isCenterPalace}
                            juNumber={juNumber}
                            dunType={dunType}
                        />
                    </div>
                );
            })}
        </div>
    );
}
