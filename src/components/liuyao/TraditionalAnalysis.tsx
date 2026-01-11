/**
 * 传统六爻分析组件
 *
 * 显示完整的传统六爻分析，包括：
 * 1. 卦辞/象辞
 * 2. 用神分析
 * 3. 六爻详解表格（六亲/六神/纳甲/世应）
 * 4. 时间建议
 */
'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Star, Clock, AlertCircle, CheckCircle, Info } from 'lucide-react';
import {
    type FullYaoInfo,
    type YongShen,
    type TimeRecommendation,
    getLiuShenMeaning,
    getLiuQinMeaning,
} from '@/lib/liuyao';
import { type HexagramText } from '@/lib/hexagram-texts';

interface TraditionalAnalysisProps {
    fullYaos: FullYaoInfo[];
    yongShen: YongShen;
    timeRecommendations: TimeRecommendation[];
    hexagramText?: HexagramText;
    changedHexagramText?: HexagramText;
    changedLines?: number[];
}

// 可折叠区块组件
function CollapsibleSection({
    title,
    icon,
    children,
    defaultOpen = false,
}: {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border border-border rounded-lg overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-background-secondary hover:bg-background-secondary/80 transition-colors"
            >
                <div className="flex items-center gap-2">
                    {icon}
                    <span className="font-medium text-foreground">{title}</span>
                </div>
                {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-foreground-secondary" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-foreground-secondary" />
                )}
            </button>
            {isOpen && <div className="p-4 bg-background">{children}</div>}
        </div>
    );
}

// 六神颜色映射
const liuShenColors: Record<string, string> = {
    '青龙': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    '朱雀': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    '勾陈': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    '螣蛇': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    '白虎': 'bg-gray-100 text-gray-700 dark:bg-gray-700/30 dark:text-gray-400',
    '玄武': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

// 用神强度颜色
const strengthColors: Record<string, string> = {
    weak: 'text-red-500',
    moderate: 'text-yellow-500',
    strong: 'text-green-500',
};

const strengthLabels: Record<string, string> = {
    weak: '弱',
    moderate: '中',
    strong: '强',
};

// 时间建议类型颜色
const timeTypeColors: Record<string, string> = {
    favorable: 'text-green-500',
    unfavorable: 'text-red-500',
    critical: 'text-accent',
};

const timeTypeIcons: Record<string, React.ReactNode> = {
    favorable: <CheckCircle className="w-4 h-4 text-green-500" />,
    unfavorable: <AlertCircle className="w-4 h-4 text-red-500" />,
    critical: <Star className="w-4 h-4 text-accent" />,
};

export function TraditionalAnalysis({
    fullYaos,
    yongShen,
    timeRecommendations,
    hexagramText,
    changedHexagramText,
    changedLines = [],
}: TraditionalAnalysisProps) {
    // 爻位名称映射
    const yaoNames = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

    return (
        <div className="space-y-4">
            {/* 卦辞/象辞 */}
            {hexagramText && (
                <CollapsibleSection
                    title="卦辞象辞"
                    icon={<Info className="w-5 h-5 text-accent" />}
                    defaultOpen={true}
                >
                    <div className="space-y-4">
                        {/* 卦辞 */}
                        <div>
                            <h4 className="text-sm font-medium text-foreground mb-2">卦辞</h4>
                            <p className="text-foreground-secondary text-sm leading-relaxed">
                                {hexagramText.gua}
                            </p>
                        </div>

                        {/* 象辞 */}
                        <div>
                            <h4 className="text-sm font-medium text-foreground mb-2">象曰</h4>
                            <p className="text-foreground-secondary text-sm leading-relaxed italic">
                                {hexagramText.xiang}
                            </p>
                        </div>

                        {/* 变爻爻辞 */}
                        {changedLines.length > 0 && hexagramText.yao && (
                            <div>
                                <h4 className="text-sm font-medium text-foreground mb-2">
                                    变爻爻辞
                                    <span className="text-red-500 ml-2 text-xs">
                                        ({changedLines.map(l => yaoNames[l - 1]).join('、')})
                                    </span>
                                </h4>
                                {/* 权重图例 */}
                                <div className="flex items-center gap-4 mb-3 text-xs text-foreground-secondary">
                                    <span className="flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-accent"></span>
                                        高权重（关键）
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                                        中权重
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-gray-400"></span>
                                        低权重
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {changedLines.map((linePos) => {
                                        const yaoText = hexagramText.yao.find(y => y.position === linePos);
                                        if (!yaoText) return null;
                                        return (
                                            <div
                                                key={linePos}
                                                className={`p-3 rounded-lg border-l-4 ${yaoText.emphasis === 'high'
                                                    ? 'border-l-accent bg-accent/10 border border-accent/30'
                                                    : yaoText.emphasis === 'medium'
                                                        ? 'border-l-yellow-500 bg-yellow-500/10 border border-yellow-500/30'
                                                        : 'border-l-gray-400 bg-gray-100 dark:bg-gray-800 border border-border'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-medium text-foreground">
                                                        {yaoText.name}
                                                    </span>
                                                    {yaoText.emphasis === 'high' && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-white font-medium">
                                                            ★ 关键爻辞
                                                        </span>
                                                    )}
                                                    {yaoText.emphasis === 'medium' && (
                                                        <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500 text-white font-medium">
                                                            参考
                                                        </span>
                                                    )}
                                                    {yaoText.timing && (
                                                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-500">
                                                            ⏰ {yaoText.timing}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-foreground-secondary">
                                                    {yaoText.text}
                                                </p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* 变卦卦辞 */}
                        {changedHexagramText && (
                            <div className="mt-4 pt-4 border-t border-border">
                                <h4 className="text-sm font-medium text-foreground mb-2">
                                    变卦：{changedHexagramText.name}
                                </h4>
                                <p className="text-foreground-secondary text-sm leading-relaxed">
                                    {changedHexagramText.gua}
                                </p>
                            </div>
                        )}
                    </div>
                </CollapsibleSection>
            )}

            {/* 用神分析 */}
            <CollapsibleSection
                title="用神分析"
                icon={<Star className="w-5 h-5 text-accent" />}
                defaultOpen={true}
            >
                <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-background-secondary rounded-lg">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-lg font-bold text-accent">{yongShen.type}</span>
                                <span className="text-sm text-foreground-secondary">为用神</span>
                                {yongShen.position > 0 && (
                                    <span className="text-xs px-2 py-0.5 rounded bg-accent/20 text-accent">
                                        {yaoNames[yongShen.position - 1]}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                                <span className="text-foreground-secondary">
                                    五行：<span className="text-foreground">{yongShen.element}</span>
                                </span>
                                <span className="text-foreground-secondary">
                                    强度：
                                    <span className={strengthColors[yongShen.strength]}>
                                        {strengthLabels[yongShen.strength]}
                                    </span>
                                </span>
                            </div>
                        </div>
                    </div>
                    <p className="text-sm text-foreground-secondary">{yongShen.analysis}</p>
                    <p className="text-xs text-foreground-secondary opacity-70">
                        {getLiuQinMeaning(yongShen.type)}
                    </p>
                </div>
            </CollapsibleSection>

            {/* 六爻详解表格 */}
            <CollapsibleSection
                title="六爻详解"
                icon={<Info className="w-5 h-5 text-blue-500" />}
                defaultOpen={false}
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border">
                                <th className="py-2 px-2 text-left text-foreground-secondary font-medium">爻位</th>
                                <th className="py-2 px-2 text-left text-foreground-secondary font-medium">六亲</th>
                                <th className="py-2 px-2 text-left text-foreground-secondary font-medium">六神</th>
                                <th className="py-2 px-2 text-left text-foreground-secondary font-medium">纳甲</th>
                                <th className="py-2 px-2 text-left text-foreground-secondary font-medium">五行</th>
                                <th className="py-2 px-2 text-center text-foreground-secondary font-medium">世应</th>
                                <th className="py-2 px-2 text-center text-foreground-secondary font-medium">状态</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...fullYaos].reverse().map((yao) => (
                                <tr
                                    key={yao.position}
                                    className={`border-b border-border/50 ${yao.position === yongShen.position ? 'bg-accent/5' : ''
                                        }`}
                                >
                                    <td className="py-2 px-2 text-foreground">
                                        {yaoNames[yao.position - 1]}
                                    </td>
                                    <td className="py-2 px-2">
                                        <span className={yao.position === yongShen.position ? 'text-accent font-bold' : 'text-foreground'}>
                                            {yao.liuQin}
                                            {yao.position === yongShen.position && ' ★'}
                                        </span>
                                    </td>
                                    <td className="py-2 px-2">
                                        <span
                                            className={`inline-block px-2 py-0.5 rounded text-xs ${liuShenColors[yao.liuShen] || ''}`}
                                            title={getLiuShenMeaning(yao.liuShen)}
                                        >
                                            {yao.liuShen}
                                        </span>
                                    </td>
                                    <td className="py-2 px-2 text-foreground">{yao.naJia}</td>
                                    <td className="py-2 px-2 text-foreground">{yao.wuXing}</td>
                                    <td className="py-2 px-2 text-center">
                                        {yao.isShiYao && (
                                            <span className="text-accent font-bold">世</span>
                                        )}
                                        {yao.isYingYao && (
                                            <span className="text-blue-500 font-bold">应</span>
                                        )}
                                    </td>
                                    <td className="py-2 px-2 text-center">
                                        {yao.change === 'changing' ? (
                                            <span className="text-red-500">动</span>
                                        ) : (
                                            <span className="text-foreground-secondary">静</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* 六神含义说明 */}
                <div className="mt-4 pt-4 border-t border-border">
                    <h4 className="text-xs font-medium text-foreground-secondary mb-2">六神含义</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                        {(['青龙', '朱雀', '勾陈', '螣蛇', '白虎', '玄武'] as const).map((shen) => (
                            <div key={shen} className="flex items-center gap-1">
                                <span className={`inline-block px-1.5 py-0.5 rounded ${liuShenColors[shen]}`}>
                                    {shen}
                                </span>
                                <span className="text-foreground-secondary">{getLiuShenMeaning(shen)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </CollapsibleSection>

            {/* 时间建议 */}
            {timeRecommendations.length > 0 && (
                <CollapsibleSection
                    title="时间建议"
                    icon={<Clock className="w-5 h-5 text-green-500" />}
                    defaultOpen={true}
                >
                    <div className="space-y-3">
                        {timeRecommendations.map((rec, index) => (
                            <div
                                key={index}
                                className={`flex items-start gap-3 p-3 rounded-lg border ${rec.type === 'favorable'
                                    ? 'border-green-500/30 bg-green-500/5'
                                    : rec.type === 'unfavorable'
                                        ? 'border-red-500/30 bg-red-500/5'
                                        : 'border-accent/30 bg-accent/5'
                                    }`}
                            >
                                <div className="mt-0.5">{timeTypeIcons[rec.type]}</div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-sm font-medium ${timeTypeColors[rec.type]}`}>
                                            {rec.type === 'favorable' ? '有利' : rec.type === 'unfavorable' ? '不利' : '关键'}
                                        </span>
                                        <span className="text-xs text-foreground-secondary">
                                            {rec.timeframe}
                                        </span>
                                        {rec.earthlyBranch && (
                                            <span className="text-xs px-1.5 py-0.5 rounded bg-background-secondary text-foreground">
                                                {rec.earthlyBranch}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-foreground-secondary">{rec.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CollapsibleSection>
            )}
        </div>
    );
}
