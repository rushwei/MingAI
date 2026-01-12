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

    // 四化颜色标记 - 使用不同颜色区分
    const mutagenColor = getMutagenColor(star.mutagen);
    const hasMutagen = star.mutagen && mutagenColor !== 'transparent';

    // 四化样式：化禄-绿色，化权-红色，化科-蓝色，化忌-紫色
    const getMutagenStyle = (mutagen: string | undefined) => {
        switch (mutagen) {
            case '禄': return 'bg-green-500/20 text-green-600 border-green-500';
            case '权': return 'bg-red-500/20 text-red-600 border-red-500';
            case '科': return 'bg-blue-500/20 text-blue-600 border-blue-500';
            case '忌': return 'bg-purple-500/20 text-purple-600 border-purple-500';
            default: return 'bg-amber-500/20 text-amber-600 border-amber-500';
        }
    };

    return (
        <span className="inline-flex flex-col items-center">
            <span className={`inline-flex flex-col items-center rounded ${baseClass} ${bgColor} ${hasMutagen ? 'ring-1 ring-red-400/50' : ''}`}>
                <span className="flex items-center gap-0.5">
                    <span className={textColor}>{star.name}</span>
                    {star.brightness && (
                        <span
                            className="font-medium"
                            style={brightnessStyle}
                        >
                            {star.brightness}
                        </span>
                    )}
                </span>
            </span>
            {hasMutagen && (
                <span className={`text-[8px] px-1 rounded border font-bold mt-0.5 ${getMutagenStyle(star.mutagen)}`}>
                    {star.mutagen}
                </span>
            )}
        </span>
    );
}
