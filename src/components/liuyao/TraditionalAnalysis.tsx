/**
 * 传统六爻分析组件（精简版）
 *
 * 显示核心传统六爻分析信息：
 * 1. 起卦时间 + 空亡 + 整体趋势（合并为信息条）
 * 2. 用神/原神/忌神/仇神（紧凑卡片）
 * 3. 卦辞象辞（可折叠）
 * 4. 时间建议（紧凑列表）
 *
 * 注：六爻详解已整合到 HexagramDisplay 组件中
 */
'use client';

import { useState, type CSSProperties } from 'react';
import { ChevronDown, ChevronUp, Star, AlertCircle, CheckCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
    type FullYaoInfo,
    type FullYaoInfoExtended,
    type YongShen,
    type TimeRecommendation,
    type GanZhiTime,
    type KongWang,
    type KongWangByPillar,
    type FuShen,
    type ShenSystem,
} from '@/lib/liuyao';
import { type HexagramText } from '@/lib/hexagram-texts';

interface TraditionalAnalysisProps {
    fullYaos: FullYaoInfo[] | FullYaoInfoExtended[];
    yongShen: YongShen;
    timeRecommendations: TimeRecommendation[];
    hexagramText?: HexagramText;
    changedHexagramText?: HexagramText;
    changedLines?: number[];
    ganZhiTime?: GanZhiTime;
    kongWang?: KongWang;
    kongWangByPillar?: KongWangByPillar;
    fuShen?: FuShen[];
    shenSystem?: ShenSystem;
    summary?: {
        overallTrend: 'favorable' | 'neutral' | 'unfavorable';
        keyFactors: string[];
    };
}

// 可折叠区块组件
function CollapsibleSection({
    title,
    children,
    defaultOpen = false,
}: {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="border border-white/10 rounded-lg overflow-hidden bg-white/[0.02]">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 bg-white/5 hover:bg-white/10 transition-colors text-sm"
            >
                <span className="font-medium text-foreground">{title}</span>
                {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-foreground-secondary" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-foreground-secondary" />
                )}
            </button>
            {isOpen && <div className="p-3 text-sm">{children}</div>}
        </div>
    );
}

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

// 天干对应五行
const tianGanWuXing: Record<string, string> = {
    '甲': '木', '乙': '木',
    '丙': '火', '丁': '火',
    '戊': '土', '己': '土',
    '庚': '金', '辛': '金',
    '壬': '水', '癸': '水',
};

// 地支对应五行
const diZhiWuXing: Record<string, string> = {
    '寅': '木', '卯': '木',
    '巳': '火', '午': '火',
    '辰': '土', '戌': '土', '丑': '土', '未': '土',
    '申': '金', '酉': '金',
    '亥': '水', '子': '水',
};

// 五行颜色（对齐 bazi.getElementColor）
const wuXingColorValues: Record<string, string> = {
    '金': '#FFD700', // 金色
    '木': '#228B22', // 森林绿
    '水': '#1E90FF', // 道奇蓝
    '火': '#FF4500', // 橙红
    '土': '#8B4513', // 马鞍棕
};

const KONG_WANG_PILLAR_ITEMS: Array<{ key: keyof KongWangByPillar; label: string; suffix: string }> = [
    { key: 'year', label: '年空', suffix: '年' },
    { key: 'month', label: '月空', suffix: '月' },
    { key: 'day', label: '日空', suffix: '日' },
    { key: 'hour', label: '时空', suffix: '时' },
];

function getWuXingStyle(wuXing: string | undefined): CSSProperties | undefined {
    const color = wuXing ? wuXingColorValues[wuXing] : undefined;
    return color ? { color } : undefined;
}

// 获取天干的五行颜色
function getGanStyle(gan: string): CSSProperties | undefined {
    const wuXing = tianGanWuXing[gan] || '';
    return getWuXingStyle(wuXing);
}

// 获取地支的五行颜色
function getZhiStyle(zhi: string): CSSProperties | undefined {
    const wuXing = diZhiWuXing[zhi] || '';
    return getWuXingStyle(wuXing);
}

export function TraditionalAnalysis({
    yongShen,
    timeRecommendations,
    hexagramText,
    changedHexagramText,
    changedLines = [],
    ganZhiTime,
    kongWang,
    kongWangByPillar,
    fuShen,
    shenSystem,
    summary,
}: TraditionalAnalysisProps) {
    const yaoNames = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

    // 趋势配置
    const trendConfig = {
        favorable: { icon: <TrendingUp className="w-4 h-4" />, color: 'text-green-500', label: '吉' },
        neutral: { icon: <Minus className="w-4 h-4" />, color: 'text-yellow-500', label: '平' },
        unfavorable: { icon: <TrendingDown className="w-4 h-4" />, color: 'text-red-500', label: '凶' },
    };

    return (
        <div className="space-y-3">
            {/* 干支 + 空亡（表格更清晰） */}
            {ganZhiTime && (
                <div className="space-y-1.5">
                    <div className="overflow-x-auto">
                        <div className="min-w-max overflow-hidden rounded-xl border border-border/70 bg-white/[0.02]">
                            <table className="w-full text-xs text-center">
                                <tbody className="divide-y divide-border/70">
                                    <tr className="divide-x divide-border/70">
                                        <td className="px-3 py-2 bg-white/5 text-accent font-semibold whitespace-nowrap">
                                            干支
                                        </td>
                                        {KONG_WANG_PILLAR_ITEMS.map(({ key, suffix }) => {
                                            const pillar = ganZhiTime[key];
                                            return (
                                                <td
                                                    key={key}
                                                    className="px-3 py-2 whitespace-nowrap"
                                                >
                                                    <span className="font-medium">
                                                        <span style={getGanStyle(pillar.gan)}>{pillar.gan}</span>
                                                        <span style={getZhiStyle(pillar.zhi)}>{pillar.zhi}</span>
                                                        <span className="text-foreground-secondary">{suffix}</span>
                                                    </span>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                    <tr className="divide-x divide-border/70">
                                        <td className="px-3 py-2 bg-white/5 text-accent font-semibold whitespace-nowrap">
                                            空亡
                                        </td>
                                        {KONG_WANG_PILLAR_ITEMS.map(({ key, suffix }) => {
                                            const value = kongWangByPillar?.[key] ?? (key === 'day' ? kongWang : undefined);
                                            return (
                                                <td
                                                    key={key}
                                                    title={value ? `${suffix}旬空：${value.xun}（${value.kongDizhi.join(' ')}）` : undefined}
                                                    className="px-3 py-2 whitespace-nowrap"
                                                >
                                                    {value ? (
                                                        <span className="tracking-wide">
                                                            <span style={getZhiStyle(value.kongDizhi[0])}>{value.kongDizhi[0]}</span>
                                                            <span style={getZhiStyle(value.kongDizhi[1])}>{value.kongDizhi[1]}</span>
                                                        </span>
                                                    ) : (
                                                        <span className="text-foreground-tertiary">-</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div className="text-[10px] text-foreground-tertiary">
                        注：六爻断卦判空亡以“日旬空”为主，年/月/时旬空供参考。
                    </div>
                </div>
            )}

            {/* 整体趋势 */}
            {summary && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                    <div className={`flex items-center gap-1 px-2 py-1 rounded border ${trendConfig[summary.overallTrend].color} bg-current/10 border-current/20`}>
                        <span className={trendConfig[summary.overallTrend].color}>
                            {trendConfig[summary.overallTrend].icon}
                        </span>
                        <span className={`font-bold ${trendConfig[summary.overallTrend].color}`}>
                            {trendConfig[summary.overallTrend].label}
                        </span>
                    </div>
                </div>
            )}

            {/* 关键因素标签 */}
            {summary && summary.keyFactors.length > 0 && (
                <div className="flex flex-wrap gap-1">
                    {summary.keyFactors.map((factor, i) => (
                        <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-foreground-secondary">
                            {factor}
                        </span>
                    ))}
                </div>
            )}

            {/* 用神/神系 - 一行紧凑标签 */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* 用神 */}
                <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border ${yongShen.strength === 'strong' ? 'bg-green-500/10 border-green-500/30' : yongShen.strength === 'weak' ? 'bg-red-500/10 border-red-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
                    <span className="text-foreground-secondary">用神</span>
                    <span className="font-bold text-accent">{yongShen.type}</span>
                    <span className="text-foreground-secondary">{yongShen.element}</span>
                    <span className={`font-medium ${strengthColors[yongShen.strength]}`}>{strengthLabels[yongShen.strength]}</span>
                </div>

                {/* 原神 */}
                {shenSystem?.yuanShen && (
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-green-500/10 border border-green-500/30">
                        <span className="text-foreground-secondary">原神</span>
                        <span className="font-bold text-green-500">{shenSystem.yuanShen.liuQin}</span>
                        <span className="text-foreground-secondary">{shenSystem.yuanShen.wuXing}</span>
                    </div>
                )}

                {/* 忌神 */}
                {shenSystem?.jiShen && (
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-red-500/10 border border-red-500/30">
                        <span className="text-foreground-secondary">忌神</span>
                        <span className="font-bold text-red-500">{shenSystem.jiShen.liuQin}</span>
                        <span className="text-foreground-secondary">{shenSystem.jiShen.wuXing}</span>
                    </div>
                )}

                {/* 仇神 */}
                {shenSystem?.chouShen && (
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-orange-500/10 border border-orange-500/30">
                        <span className="text-foreground-secondary">仇神</span>
                        <span className="font-bold text-orange-500">{shenSystem.chouShen.liuQin}</span>
                        <span className="text-foreground-secondary">{shenSystem.chouShen.wuXing}</span>
                    </div>
                )}
            </div>

            {/* 伏神提示 */}
            {fuShen && fuShen.length > 0 && (
                <div className="flex items-start gap-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs">
                    <AlertCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                    <div>
                        <span className="text-foreground-secondary">用神不上卦，伏于</span>
                        {fuShen.map((fs, i) => (
                            <span key={i} className={`ml-1 ${fs.isAvailable ? 'text-green-500' : 'text-red-500'}`}>
                                {yaoNames[fs.feiShenPosition - 1]}下（{fs.availabilityReason}）
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* 卦辞象辞 - 可折叠 */}
            {hexagramText && (
                <CollapsibleSection title="卦辞象辞" defaultOpen={false}>
                    <div className="space-y-2">
                        <div>
                            <span className="text-foreground-secondary">卦辞：</span>
                            <span className="text-foreground">{hexagramText.gua}</span>
                        </div>
                        <div>
                            <span className="text-foreground-secondary">象曰：</span>
                            <span className="text-foreground italic">{hexagramText.xiang}</span>
                        </div>

                        {/* 变爻爻辞 */}
                        {changedLines.length > 0 && hexagramText.yao && (
                            <div className="mt-2 pt-2 border-t border-white/10">
                                <div className="text-foreground-secondary mb-1">变爻爻辞：</div>
                                {changedLines.map((linePos) => {
                                    const yaoText = hexagramText.yao.find(y => y.position === linePos);
                                    if (!yaoText) return null;
                                    return (
                                        <div
                                            key={linePos}
                                            className={`p-2 rounded border-l-2 mb-1 ${yaoText.emphasis === 'high' ? 'border-l-accent bg-accent/5' : 'border-l-gray-500 bg-white/5'}`}
                                        >
                                            <span className="font-medium text-foreground">{yaoText.name}：</span>
                                            <span className="text-foreground-secondary">{yaoText.text}</span>
                                            {yaoText.emphasis === 'high' && <span className="text-accent ml-1">★关键</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {/* 变卦卦辞 */}
                        {changedHexagramText && (
                            <div className="mt-2 pt-2 border-t border-white/10">
                                <span className="text-foreground-secondary">变卦 {changedHexagramText.name}：</span>
                                <span className="text-foreground">{changedHexagramText.gua}</span>
                            </div>
                        )}
                    </div>
                </CollapsibleSection>
            )}

            {/* 时间建议 - 紧凑列表 */}
            {timeRecommendations.length > 0 && (
                <CollapsibleSection title="时间建议" defaultOpen={false}>
                    <div className="space-y-1">
                        {timeRecommendations.map((rec, index) => (
                            <div
                                key={index}
                                className={`flex items-center gap-2 px-2 py-1 rounded ${rec.type === 'favorable' ? 'text-green-500' : rec.type === 'unfavorable' ? 'text-red-500' : 'text-accent'}`}
                            >
                                {rec.type === 'favorable' ? <CheckCircle className="w-3 h-3" /> : rec.type === 'unfavorable' ? <AlertCircle className="w-3 h-3" /> : <Star className="w-3 h-3" />}
                                <span className="font-medium">{rec.timeframe}</span>
                                {rec.earthlyBranch && <span className="text-foreground-secondary">({rec.earthlyBranch})</span>}
                                <span className="text-foreground-secondary flex-1">{rec.description}</span>
                            </div>
                        ))}
                    </div>
                </CollapsibleSection>
            )}
        </div>
    );
}
