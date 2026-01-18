/**
 * 卦象显示组件
 *
 * 显示完整的六爻卦象，从下到上排列
 * 支持传统六爻分析标签（六亲/六神/世应/用神）
 */
'use client';

import { type Yao, type Hexagram, type FullYaoInfo, getHexagramBrief } from '@/lib/liuyao';
import { YaoLine } from './YaoLine';

interface HexagramDisplayProps {
    yaos: Yao[];
    hexagram: Hexagram;
    changedHexagram?: Hexagram;
    changedLines?: number[];
    showDetails?: boolean;
    size?: 'sm' | 'md' | 'lg';
    fullYaos?: FullYaoInfo[];      // 完整爻信息（包含六亲/六神等）
    showTraditional?: boolean;     // 是否显示传统标签
    yongShenPosition?: number;     // 用神所在爻位
}

export function HexagramDisplay({
    yaos,
    hexagram,
    changedHexagram,
    changedLines = [],
    showDetails = true,
    size = 'md',
    fullYaos,
    showTraditional = false,
    yongShenPosition,
}: HexagramDisplayProps) {
    // 从上到下显示，所以反转数组
    const displayYaos = [...yaos].reverse();
    const displayFullYaos = fullYaos ? [...fullYaos].reverse() : undefined;
    const yaoLabels = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];
    const rowHeight = 'h-5';

    // 六神颜色映射
    const liuShenColors: Record<string, string> = {
        '青龙': 'text-green-500',
        '朱雀': 'text-red-500',
        '勾陈': 'text-yellow-600',
        '螣蛇': 'text-purple-500',
        '白虎': 'text-gray-500',
        '玄武': 'text-blue-500',
    };

    // 根据是否显示传统标签决定列布局
    const gridCols = showTraditional && displayFullYaos
        ? 'grid-cols-[3rem_2.5rem_auto_2.5rem]'  // 爻位 | 六亲 | 卦象 | 六神
        : 'grid-cols-[3rem_auto]';

    return (
        <div className="flex flex-col items-center gap-4">
            {/* 卦象 */}
            <div className="flex gap-8 items-start">
                {/* 本卦 */}
                <div className="flex flex-col items-center" data-hexagram="base">
                    <div className={`grid ${gridCols} gap-x-2`}>
                        <div />
                        {showTraditional && displayFullYaos && <div />}
                        <div className="text-center mb-2 justify-self-center">
                            <span className="text-xs text-foreground-secondary">本卦</span>
                            <h3 className="text-lg font-semibold text-foreground mt-1">
                                {hexagram.name}
                            </h3>
                            <p className="text-xs text-foreground-secondary mt-1">
                                上{hexagram.upperTrigram} 下{hexagram.lowerTrigram} · {hexagram.element}
                            </p>
                        </div>
                        {showTraditional && displayFullYaos && <div />}

                        {/* 爻位标签列 */}
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

                        {/* 六亲列（传统模式） */}
                        {showTraditional && displayFullYaos && (
                            <div className="flex flex-col gap-1.5 items-center py-4">
                                {displayFullYaos.map((yao) => (
                                    <span
                                        key={`liuqin-${yao.position}`}
                                        className={`text-xs inline-flex items-center justify-center ${rowHeight} ${yao.position === yongShenPosition
                                            ? 'text-accent font-bold'
                                            : 'text-foreground-secondary'
                                            }`}
                                        title={yao.position === yongShenPosition ? '用神' : undefined}
                                    >
                                        {yao.liuQin}
                                        {yao.position === yongShenPosition && (
                                            <span className="ml-0.5 text-accent">★</span>
                                        )}
                                    </span>
                                ))}
                            </div>
                        )}

                        {/* 卦象列 */}
                        <div className="flex flex-col gap-1.5 p-4 bg-white/5 border border-white/5 rounded-lg w-fit justify-self-center">
                            {displayYaos.map((yao, index) => {
                                const fullYao = displayFullYaos?.[index];
                                const isYongShen = fullYao?.position === yongShenPosition;
                                return (
                                    <div
                                        key={yao.position}
                                        className={`flex items-center justify-center ${rowHeight} relative ${isYongShen ? 'ring-1 ring-accent ring-offset-1 ring-offset-transparent rounded' : ''
                                            }`}
                                    >
                                        <YaoLine yao={yao} size={size} />
                                        {/* 世应标记 */}
                                        {showTraditional && fullYao && (
                                            <>
                                                {fullYao.isShiYao && (
                                                    <span className="absolute -right-5 text-xs text-accent font-bold" title="世爻">
                                                        世
                                                    </span>
                                                )}
                                                {fullYao.isYingYao && (
                                                    <span className="absolute -right-5 text-xs text-blue-500 font-bold" title="应爻">
                                                        应
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        {/* 六神列（传统模式） */}
                        {showTraditional && displayFullYaos && (
                            <div className="flex flex-col gap-1.5 items-center py-4">
                                {displayFullYaos.map((yao) => (
                                    <span
                                        key={`liushen-${yao.position}`}
                                        className={`text-xs inline-flex items-center justify-center ${rowHeight} ${liuShenColors[yao.liuShen] || 'text-foreground-secondary'}`}
                                        title={yao.liuShen}
                                    >
                                        {yao.liuShen}
                                    </span>
                                ))}
                            </div>
                        )}
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
                                <div className="flex flex-col gap-1.5 p-4 bg-white/5 border border-white/5 rounded-lg w-fit justify-self-center">
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
