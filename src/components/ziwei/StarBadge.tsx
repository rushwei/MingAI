import type { StarInfo } from '@/lib/ziwei';
import { getBrightnessColor, getMutagenColor } from '@/lib/ziwei';

interface StarBadgeProps {
    star: StarInfo;
    size?: 'sm' | 'md';
}

export function StarBadge({ star, size = 'sm' }: StarBadgeProps) {
    const isMajor = star.type === 'major';
    const isMinor = star.type === 'minor';

    // 根据星曜类型决定样式
    const baseClass = size === 'sm' ? 'text-[10px] px-1 py-0.5' : 'text-xs px-1.5 py-0.5';

    // 主星用紫色，辅星用灰色，杂曜用更淡的灰色
    const textColor = isMajor
        ? 'text-purple-500'
        : isMinor
            ? 'text-foreground-secondary'
            : 'text-gray-400';

    const bgColor = isMajor ? 'bg-purple-500/10' : 'bg-background';

    // 亮度颜色标记
    const brightnessStyle = star.brightness
        ? { color: getBrightnessColor(star.brightness) }
        : undefined;

    // 四化颜色标记
    const mutagenColor = getMutagenColor(star.mutagen);
    const hasMutagen = star.mutagen && mutagenColor !== 'transparent';

    return (
        <span className={`inline-flex items-center gap-0.5 rounded ${baseClass} ${bgColor}`}>
            <span className={textColor}>{star.name}</span>
            {star.brightness && (
                <span
                    className="font-medium"
                    style={brightnessStyle}
                >
                    {star.brightness}
                </span>
            )}
            {hasMutagen && (
                <span
                    className="font-medium text-amber-500"
                >
                    {star.mutagen}
                </span>
            )}
        </span>
    );
}
