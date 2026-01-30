/**
 * 卦象显示组件
 *
 * 显示完整的六爻卦象，从下到上排列
 * 支持传统六爻分析标签（六亲/六神/世应/用神）
 * 整合旺衰、空亡等详细信息
 */
'use client';

import {
    type Yao,
    type Hexagram,
    type FullYaoInfo,
    type FullYaoInfoExtended,
    getHexagramBrief,
    WANG_SHUAI_LABELS,
    KONG_WANG_LABELS,
} from '@/lib/liuyao';
import { YaoLine } from './YaoLine';

interface HexagramDisplayProps {
    yaos: Yao[];
    hexagram: Hexagram;
    changedHexagram?: Hexagram;
    changedLines?: number[];
    showDetails?: boolean;
    size?: 'sm' | 'md' | 'lg';
    fullYaos?: FullYaoInfo[] | FullYaoInfoExtended[];
    showTraditional?: boolean;
    yongShenPosition?: number;
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
    const yaoLabels = ['初', '二', '三', '四', '五', '上'];
    const rowHeight = 'h-5';

    // 六神颜色映射
    const liuShenColors: Record<string, string> = {
        '青龙': 'text-green-500',
        '朱雀': 'text-red-500',
        '勾陈': 'text-yellow-600',
        '螣蛇': 'text-purple-500',
        '白虎': 'text-gray-400',
        '玄武': 'text-blue-500',
    };

    // 检查是否有扩展信息
    const hasExtendedInfo = displayFullYaos && displayFullYaos.length > 0 && 'strength' in displayFullYaos[0];

    return (
        <div className="flex flex-col items-center gap-3">
            {/* 卦象 */}
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start">
                {/* 本卦 */}
                <div className="flex flex-col items-center" data-hexagram="base">
                    {/* 卦名 */}
                    <div className="text-center mb-2">
                        <span className="text-xs text-foreground-secondary">本卦</span>
                        <h3 className="text-lg font-semibold text-foreground">
                            {hexagram.name}
                        </h3>
                        <p className="text-xs text-foreground-secondary">
                            {hexagram.upperTrigram}/{hexagram.lowerTrigram} · {hexagram.element}
                        </p>
                    </div>

                    {/* 爻表格 - 整合所有信息 */}
                    <div className="bg-white/5 border border-white/5 rounded-lg overflow-hidden">
                        <table className="text-xs">
                            <tbody>
                                {displayYaos.map((yao, index) => {
                                    const fullYao = displayFullYaos?.[index];
                                    const extYao = fullYao as FullYaoInfoExtended | undefined;
                                    const isYongShen = fullYao?.position === yongShenPosition;
                                    const isChanging = yao.change === 'changing';

                                    return (
                                        <tr
                                            key={yao.position}
                                            className={`${isYongShen ? 'bg-accent/10' : ''} ${isChanging ? 'bg-red-500/5' : ''}`}
                                        >
                                            {/* 爻位 */}
                                            <td className={`px-1.5 py-1 text-center ${isChanging ? 'text-red-500 font-medium' : 'text-foreground-secondary'}`}>
                                                {yaoLabels[yao.position - 1]}
                                                {isChanging && '○'}
                                            </td>

                                            {/* 六亲 + 用神标记 */}
                                            {showTraditional && fullYao && (
                                                <td className={`px-1.5 py-1 text-center ${isYongShen ? 'text-accent font-bold' : 'text-foreground'}`}>
                                                    {fullYao.liuQin}
                                                    {isYongShen && <span className="text-accent ml-0.5">★</span>}
                                                </td>
                                            )}

                                            {/* 纳甲 + 五行 */}
                                            {showTraditional && fullYao && (
                                                <td className="px-1.5 py-1 text-center text-foreground-secondary">
                                                    {fullYao.naJia}{fullYao.wuXing}
                                                </td>
                                            )}

                                            {/* 卦象 */}
                                            <td className="px-2 py-1">
                                                <div className={`flex items-center justify-center ${rowHeight}`}>
                                                    <YaoLine yao={yao} size={size} />
                                                </div>
                                            </td>

                                            {/* 世应 */}
                                            {showTraditional && fullYao && (
                                                <td className="px-1 py-1 text-center w-5">
                                                    {fullYao.isShiYao && <span className="text-accent font-bold">世</span>}
                                                    {fullYao.isYingYao && <span className="text-blue-500 font-bold">应</span>}
                                                </td>
                                            )}

                                            {/* 六神 */}
                                            {showTraditional && fullYao && (
                                                <td className={`px-1.5 py-1 text-center ${liuShenColors[fullYao.liuShen] || 'text-foreground-secondary'}`}>
                                                    {fullYao.liuShen}
                                                </td>
                                            )}

                                            {/* 旺衰 + 空亡 (扩展信息) */}
                                            {showTraditional && hasExtendedInfo && extYao?.strength && (
                                                <td className="px-1.5 py-1 text-center">
                                                    <span className={extYao.strength.isStrong ? 'text-green-500' : 'text-red-500'}>
                                                        {WANG_SHUAI_LABELS[extYao.strength.wangShuai]}
                                                    </span>
                                                    {extYao.kongWangState !== 'not_kong' && (
                                                        <span className="text-red-400 ml-1">
                                                            {KONG_WANG_LABELS[extYao.kongWangState]}
                                                        </span>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 变卦 */}
                {changedHexagram && changedLines.length > 0 && (
                    <>
                        <div className="flex items-center self-center transform rotate-90 md:rotate-0">
                            <span className="text-xl text-foreground-secondary">→</span>
                        </div>
                        <div className="flex flex-col items-center" data-hexagram="changed">
                            {/* 卦名 */}
                            <div className="text-center mb-2">
                                <span className="text-xs text-foreground-secondary">变卦</span>
                                <h4 className="text-lg font-semibold text-foreground">
                                    {changedHexagram.name}
                                </h4>
                                <p className="text-xs text-foreground-secondary">
                                    {changedHexagram.upperTrigram}/{changedHexagram.lowerTrigram} · {changedHexagram.element}
                                </p>
                            </div>

                            {/* 变卦爻表格 */}
                            <div className="bg-white/5 border border-white/5 rounded-lg overflow-hidden">
                                <table className="text-xs">
                                    <tbody>
                                        {displayYaos.map((yao) => {
                                            const isChanged = changedLines.includes(yao.position);
                                            const changedYao: Yao = isChanged
                                                ? { ...yao, type: yao.type === 1 ? 0 : 1, change: 'stable' }
                                                : { ...yao, change: 'stable' };
                                            return (
                                                <tr key={yao.position}>
                                                    <td className="px-1.5 py-1 text-center text-foreground-secondary">
                                                        {yaoLabels[yao.position - 1]}
                                                    </td>
                                                    <td className="px-2 py-1">
                                                        <div className={`flex items-center justify-center ${rowHeight}`}>
                                                            <YaoLine yao={changedYao} size={size} />
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* 简要解读 */}
            {showDetails && (
                <div className="text-center max-w-md">
                    <p className="text-sm text-foreground-secondary">
                        {getHexagramBrief(hexagram.name)}
                    </p>
                    {changedLines.length > 0 && (
                        <p className="text-xs text-red-500 mt-1">
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
