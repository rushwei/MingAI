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
    const yaoLabels = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];
    const rowHeight = 'h-4';

    return (
        <div className="flex flex-col items-center gap-4">
            {/* 卦象 */}
            <div className="flex gap-8 items-start">
                {/* 本卦 */}
                <div className="flex flex-col items-center" data-hexagram="base">
                    <div className="grid grid-cols-[3rem_auto] gap-x-2">
                        <div />
                        <div className="text-center mb-2 justify-self-center">
                            <span className="text-xs text-foreground-secondary">本卦</span>
                            <h3 className="text-lg font-semibold text-foreground mt-1">
                                {hexagram.name}
                            </h3>
                            <p className="text-xs text-foreground-secondary mt-1">
                                上{hexagram.upperTrigram} 下{hexagram.lowerTrigram} · {hexagram.element}
                            </p>
                        </div>
                        <div className="flex flex-col gap-1.5 items-end py-4">
                            {displayYaos.map((yao) => (
                                <span
                                    key={`label-${yao.position}`}
                                    className={`text-xs w-12 text-right inline-flex items-center justify-end ${rowHeight} ${yao.change === 'changing' ? 'text-red-500 font-medium' : 'text-foreground-secondary'}`}
                                >
                                    {yaoLabels[yao.position - 1]}
                                    {yao.change === 'changing' && ' ○'}
                                </span>
                            ))}
                        </div>
                        <div className="flex flex-col gap-1.5 p-4 bg-background rounded-lg w-fit justify-self-center">
                            {displayYaos.map((yao) => (
                                <div key={yao.position} className={`flex items-center justify-center ${rowHeight}`}>
                                    <YaoLine yao={yao} size={size} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 变卦 */}
                {changedHexagram && changedLines.length > 0 && (
                    <>
                        <div className="flex items-center self-center">
                            <span className="text-2xl text-foreground-secondary">→</span>
                        </div>
                        <div className="flex flex-col items-center" data-hexagram="changed">
                            <div className="grid grid-cols-[3rem_auto] gap-x-2">
                                <div />
                                <div className="text-center mb-2 justify-self-center">
                                    <span className="text-xs text-foreground-secondary">变卦</span>
                                    <h4 className="text-lg font-semibold text-foreground mt-1">
                                        {changedHexagram.name}
                                    </h4>
                                    <p className="text-xs text-foreground-secondary mt-1">
                                        上{changedHexagram.upperTrigram} 下{changedHexagram.lowerTrigram} · {changedHexagram.element}
                                    </p>
                                </div>
                                <div className="flex flex-col gap-1.5 items-end py-4">
                                    {displayYaos.map((yao) => (
                                        <span
                                            key={`label-changed-${yao.position}`}
                                            className={`text-xs w-12 text-right inline-flex items-center justify-end ${rowHeight} text-foreground-secondary`}
                                        >
                                            {yaoLabels[yao.position - 1]}
                                        </span>
                                    ))}
                                </div>
                                <div className="flex flex-col gap-1.5 p-4 bg-background rounded-lg w-fit justify-self-center">
                                    {displayYaos.map((yao) => {
                                        // 变爻翻转
                                        const isChanged = changedLines.includes(yao.position);
                                        const changedYao: Yao = isChanged
                                            ? { ...yao, type: yao.type === 1 ? 0 : 1, change: 'stable' }
                                            : { ...yao, change: 'stable' };
                                        return (
                                            <div key={yao.position} className={`flex items-center justify-center ${rowHeight}`}>
                                                <YaoLine yao={changedYao} size={size} />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
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
