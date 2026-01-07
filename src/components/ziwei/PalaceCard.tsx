import type { PalaceInfo } from '@/lib/ziwei';
import { StarBadge } from './StarBadge';

interface FlowInfo {
    decadal?: { stem: string; ages: string };
    yearly?: string;
    monthly?: string;
    daily?: string;
}

interface PalaceCardProps {
    palace: PalaceInfo;
    isSelected?: boolean;
    isLifePalace?: boolean;
    isHighlighted?: boolean;
    isSanFangSiZheng?: boolean;
    showAdjStars?: boolean;
    flowInfo?: FlowInfo;
    onClick?: () => void;
}

export function PalaceCard({
    palace,
    isSelected = false,
    isLifePalace = false,
    isHighlighted = false,
    isSanFangSiZheng = false,
    showAdjStars = false,
    flowInfo,
    onClick
}: PalaceCardProps) {
    // 根据是否显示杂曜来决定显示的星星
    const allStars = showAdjStars
        ? [...palace.majorStars, ...palace.minorStars, ...(palace.adjStars || [])]
        : [...palace.majorStars, ...palace.minorStars];

    return (
        <div
            onClick={onClick}
            className={`
                relative h-full min-h-[100px] p-2 rounded-lg border transition-all cursor-pointer
                ${isSelected
                    ? 'border-accent bg-accent/5 shadow-md'
                    : isSanFangSiZheng
                        ? 'border-green-500 bg-green-500/10 shadow-sm'
                        : isHighlighted
                            ? 'border-amber-500 bg-amber-500/10 shadow-sm'
                            : 'border-border bg-background-secondary hover:bg-background-tertiary'
                }
                ${isLifePalace ? 'ring-2 ring-accent/50' : ''}
            `}
        >
            {/* 宫名和干支 */}
            <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold ${isLifePalace ? 'text-accent' : 'text-foreground'}`}>
                    {palace.name}
                </span>
                <span className="text-[10px] text-foreground-secondary">
                    {palace.heavenlyStem}{palace.earthlyBranch}
                </span>
            </div>

            {/* 身宫标记 */}
            {palace.isBodyPalace && (
                <span className="absolute top-1 right-1 px-1 py-0.5 text-[9px] bg-amber-500/20 text-amber-500 rounded font-medium">
                    身
                </span>
            )}

            {/* 三方四正标记 */}
            {isSanFangSiZheng && !isSelected && (
                <span className="absolute top-1 left-1 px-1 py-0.5 text-[8px] bg-green-500/20 text-green-500 rounded font-medium">
                    三方
                </span>
            )}

            {/* 流年/流月/流日标注 - 右下角 */}
            {flowInfo && (
                <div className="absolute bottom-1 right-1 flex flex-col items-end gap-0.5 text-[9px]">
                    {flowInfo.decadal && (
                        <span className="px-1 py-0.5 bg-purple-500/20 text-purple-500 rounded">
                            限{flowInfo.decadal.stem}
                        </span>
                    )}
                    {flowInfo.yearly && (
                        <span className="px-1 py-0.5 bg-blue-500/20 text-blue-500 rounded">
                            年{flowInfo.yearly}
                        </span>
                    )}
                    {flowInfo.monthly && (
                        <span className="px-1 py-0.5 bg-green-500/20 text-green-500 rounded">
                            月{flowInfo.monthly}
                        </span>
                    )}
                    {flowInfo.daily && (
                        <span className="px-1 py-0.5 bg-orange-500/20 text-orange-500 rounded">
                            日{flowInfo.daily}
                        </span>
                    )}
                </div>
            )}

            {/* 大限年龄范围 - 左下角 */}
            {flowInfo?.decadal?.ages && (
                <span className="absolute bottom-1 left-1 text-[9px] text-foreground-secondary">
                    {flowInfo.decadal.ages}
                </span>
            )}

            {/* 星曜列表 */}
            <div className="flex flex-wrap gap-0.5 mt-1">
                {allStars.slice(0, 6).map((star, idx) => (
                    <StarBadge key={idx} star={star} size="sm" />
                ))}
                {allStars.length > 6 && (
                    <span className="text-[10px] text-foreground-secondary">
                        +{allStars.length - 6}
                    </span>
                )}
            </div>
        </div>
    );
}
