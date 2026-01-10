/**
 * 卦象显示组件
 * 
 * 显示完整的六爻卦象，从下到上排列
 */
'use client';

import { type Yao, type Hexagram, getHexagramBrief } from '@/lib/liuyao';
import { YaoLine } from './YaoLine';

interface HexagramDisplayProps {
    yaos: Yao[];
    hexagram: Hexagram;
    changedHexagram?: Hexagram;
    changedLines?: number[];
    showDetails?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export function HexagramDisplay({
    yaos,
    hexagram,
    changedHexagram,
    changedLines = [],
    showDetails = true,
    size = 'md',
}: HexagramDisplayProps) {
    // 从上到下显示，所以反转数组
    const displayYaos = [...yaos].reverse();

    return (
        <div className="flex flex-col items-center gap-4">
            {/* 卦象名称 */}
            <div className="text-center">
                <h3 className="text-xl font-bold text-foreground">
                    {hexagram.name}
                </h3>
                <p className="text-sm text-foreground-secondary mt-1">
                    上{hexagram.upperTrigram} 下{hexagram.lowerTrigram} · {hexagram.element}
                </p>
            </div>

            {/* 卦象 */}
            <div className="flex gap-8 items-start">
                {/* 本卦 */}
                <div className="flex flex-col items-center">
                    <span className="text-xs text-foreground-secondary mb-2">本卦</span>
                    <div className="flex flex-col gap-1.5 p-4 bg-background-secondary rounded-lg">
                        {displayYaos.map((yao) => (
                            <YaoLine key={yao.position} yao={yao} size={size} showLabel />
                        ))}
                    </div>
                </div>

                {/* 变卦 */}
                {changedHexagram && changedLines.length > 0 && (
                    <>
                        <div className="flex items-center self-center">
                            <span className="text-2xl text-foreground-secondary">→</span>
                        </div>
                        <div className="flex flex-col items-center">
                            <span className="text-xs text-foreground-secondary mb-2">变卦</span>
                            <div className="flex flex-col gap-1.5 p-4 bg-background-secondary rounded-lg">
                                {displayYaos.map((yao) => {
                                    // 变爻翻转
                                    const isChanged = changedLines.includes(yao.position);
                                    const changedYao: Yao = isChanged
                                        ? { ...yao, type: yao.type === 1 ? 0 : 1, change: 'stable' }
                                        : { ...yao, change: 'stable' };
                                    return (
                                        <YaoLine key={yao.position} yao={changedYao} size={size} showLabel />
                                    );
                                })}
                            </div>
                            <h4 className="text-lg font-semibold text-foreground mt-2">
                                {changedHexagram.name}
                            </h4>
                        </div>
                    </>
                )}
            </div>

            {/* 简要解读 */}
            {showDetails && (
                <div className="text-center max-w-md mt-4">
                    <p className="text-sm text-foreground-secondary">
                        {getHexagramBrief(hexagram.name)}
                    </p>
                    {changedLines.length > 0 && (
                        <p className="text-xs text-red-500 mt-2">
                            变爻：{changedLines.map(l => `第${l}爻`).join('、')}
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

// 小型卦象预览
export function HexagramPreview({ hexagram, yaos }: { hexagram: Hexagram; yaos: Yao[] }) {
    const displayYaos = [...yaos].reverse();

    return (
        <div className="flex items-center gap-3">
            <div className="flex flex-col gap-0.5">
                {displayYaos.map((yao) => (
                    <YaoLine key={yao.position} yao={yao} size="sm" />
                ))}
            </div>
            <span className="text-sm font-medium text-foreground">{hexagram.name}</span>
        </div>
    );
}
