import type { PalaceInfo } from '@/lib/divination/ziwei';
import { StarBadge } from '@/components/ziwei/StarBadge';

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
    highlightTypes?: string[];
    isSanFangSiZheng?: boolean;
    showAdjStars?: boolean;
    flowInfo?: FlowInfo;
    onClick?: () => void;
}

// 高亮类型对应的颜色
const highlightColors: Record<string, { border: string; bg: string }> = {
    decadal: { border: 'border-purple-500', bg: 'bg-purple-500/10' },
    yearly: { border: 'border-blue-500', bg: 'bg-blue-500/10' },
    monthly: { border: 'border-green-500', bg: 'bg-green-500/10' },
    daily: { border: 'border-orange-500', bg: 'bg-orange-500/10' },
};

export function PalaceCard({
    palace,
    isSelected = false,
    isLifePalace = false,
    isHighlighted = false,
    highlightTypes = [],
    isSanFangSiZheng = false,
    showAdjStars = false,
    flowInfo,
    onClick
}: PalaceCardProps) {

    // 获取边框样式（支持多色）
    const getBorderClasses = () => {
        if (isSelected) return 'border-accent bg-accent/5 shadow-md';
        if (isSanFangSiZheng) return 'border-green-500/50 bg-green-500/5 shadow-sm';
        if (isHighlighted && highlightTypes.length > 0) {
            const highlight = highlightColors[highlightTypes[0]];
            if (highlight) {
                return `${highlight.border} ${highlight.bg} shadow-sm`;
            }
        }
        return 'border-border bg-background-secondary hover:bg-background-tertiary';
    };

    // 是否有流限信息
    const hasFlowInfo = flowInfo && (flowInfo.decadal || flowInfo.yearly || flowInfo.monthly || flowInfo.daily);

    return (
        <div
            onClick={onClick}
            className={`
                relative h-full min-h-[100px] p-2 rounded-lg border-2 transition-all cursor-pointer flex flex-col
                ${getBorderClasses()}
            `}
        >
            {/* 宫名和干支 */}
            <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-semibold ${isLifePalace ? 'text-accent' : 'text-foreground'}`}>
                    {palace.name}
                    {palace.isBodyPalace && (
                        <span className="md:ml-1 ml-0 px-1 py-0.5 text-[9px] bg-amber-500/20 text-amber-500 rounded font-medium">
                            身宫
                        </span>
                    )}
                </span>
                <span className="text-[10px] text-foreground-secondary">
                    {palace.heavenlyStem}{palace.earthlyBranch}
                </span>
            </div>
            {/* 星曜列表 - 主内容区 */}
            <div className="flex-1 flex flex-wrap gap-0.5 content-start">
                {/* 主星全部显示 */}
                {palace.majorStars.map((star, idx) => (
                    <StarBadge key={`major-${idx}`} star={star} size="sm" />
                ))}
                {/* 辅星全部显示 */}
                {palace.minorStars.map((star, idx) => (
                    <StarBadge key={`minor-${idx}`} star={star} size="sm" />
                ))}
                {/* 杂曜全部显示（受showAdjStars控制） */}
                {showAdjStars && palace.adjStars?.map((star, idx) => (
                    <StarBadge key={`adj-${idx}`} star={star} size="sm" />
                ))}
            </div>

            {/* 流限信息 - 底部横向排列 */}
            {hasFlowInfo && (
                <div className="flex flex-wrap gap-1 mt-1 pt-1 border-t border-border/50 text-[8px]">
                    {flowInfo.decadal && (
                        <span className="flex flex-col items-center px-1 py-0.5 bg-purple-500/20 text-purple-500 rounded leading-tight">
                            <span>限</span>
                            <span>{flowInfo.decadal.stem}</span>
                        </span>
                    )}
                    {flowInfo.yearly && (
                        <span className="flex flex-col items-center px-1 py-0.5 bg-blue-500/20 text-blue-500 rounded leading-tight">
                            <span>年</span>
                            <span>{flowInfo.yearly}</span>
                        </span>
                    )}
                    {flowInfo.monthly && (
                        <span className="flex flex-col items-center px-1 py-0.5 bg-green-500/20 text-green-500 rounded leading-tight">
                            <span>月</span>
                            <span>{flowInfo.monthly}</span>
                        </span>
                    )}
                    {flowInfo.daily && (
                        <span className="flex flex-col items-center px-1 py-0.5 bg-orange-500/20 text-orange-500 rounded leading-tight">
                            <span>日</span>
                            <span>{flowInfo.daily}</span>
                        </span>
                    )}
                    {flowInfo.decadal?.ages && (
                        <span className="text-foreground-secondary ml-auto">
                            {flowInfo.decadal.ages}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
