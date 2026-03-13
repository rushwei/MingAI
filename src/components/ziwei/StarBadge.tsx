import type { StarInfo } from '@/lib/divination/ziwei';
import { getBrightnessColor, getMutagenColor } from '@/lib/divination/ziwei';

interface StarBadgeProps {
    star: StarInfo;
    size?: 'sm' | 'md';
}

const MINOR_MALEFIC_STARS = new Set(['擎羊', '陀罗', '火星', '铃星', '地空', '地劫']);

export function StarBadge({ star, size = 'sm' }: StarBadgeProps) {
    const isMajor = star.type === 'major';
    const isMinor = star.type === 'minor';
    const isAuxiliary = star.type === 'auxiliary';
    const isMinorMalefic = isMinor && MINOR_MALEFIC_STARS.has(star.name);
    const textSize = size === 'sm' ? 'text-[10px]' : 'text-xs';
    const statusSize = size === 'sm' ? 'text-[9px]' : 'text-[10px]';

    // 竖排显示星名，不使用外框
    const textColor = isMinorMalefic
        ? 'text-rose-600 dark:text-rose-400'
        : isMajor
            ? 'text-red-500'
            : isMinor
                ? 'text-purple-500'
                : isAuxiliary
                    ? 'text-blue-500'
                    : 'text-foreground-secondary';

    // 亮度颜色标记
    const brightnessStyle = star.brightness
        ? { color: getBrightnessColor(star.brightness) }
        : undefined;

    // 四化颜色标记
    const mutagenColor = getMutagenColor(star.mutagen);
    const hasMutagen = star.mutagen && mutagenColor !== 'transparent';

    const nameChars = Array.from(star.name);

    return (
        <span className={`inline-flex flex-col items-center ${textSize} leading-tight`}>
            <span className={`flex flex-col items-center font-medium ${textColor}`}>
                {nameChars.map((char, idx) => (
                    <span key={idx}>{char}</span>
                ))}
            </span>
            {star.brightness && (
                <span className={statusSize} style={brightnessStyle}>
                    {star.brightness}
                </span>
            )}
            {hasMutagen && (
                <span className={statusSize} style={{ color: mutagenColor }}>
                    {star.mutagen}
                </span>
            )}
        </span>
    );
}
