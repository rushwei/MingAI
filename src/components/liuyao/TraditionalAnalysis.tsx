/**
 * 传统六爻分析组件
 *
 * 显示完整的传统六爻分析，包括：
 * 1. 干支时间
 * 2. 卦辞/象辞
 * 3. 用神、伏神分析
 * 4. 伏神/神系分析
 * 5. 六爻详解表格（六亲/六神/纳甲/世应/旺衰/空亡/五行）
 * 6. 旺衰
 * 7. 六合/六冲/刑害破关系
 * 8. 原神/忌神/仇神体系
 * 7. 时间建议
 */
'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Star, Clock, AlertCircle, CheckCircle, Info, Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import {
    type FullYaoInfo,
    type FullYaoInfoExtended,
    type YongShen,
    type TimeRecommendation,
    type GanZhiTime,
    type KongWang,
    type FuShen,
    type ShenSystem,
    getLiuShenMeaning,
    getLiuQinMeaning,
    WANG_SHUAI_LABELS,
    KONG_WANG_LABELS,
    HUA_TYPE_LABELS,
} from '@/lib/liuyao';
import { type HexagramText } from '@/lib/hexagram-texts';

interface TraditionalAnalysisProps {
    fullYaos: FullYaoInfo[] | FullYaoInfoExtended[];
    yongShen: YongShen;
    timeRecommendations: TimeRecommendation[];
    hexagramText?: HexagramText;
    changedHexagramText?: HexagramText;
    changedLines?: number[];
    // 新增属性
    ganZhiTime?: GanZhiTime;
    kongWang?: KongWang;
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
        <div className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.02] backdrop-blur-sm transition-all hover:border-white/20">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors"
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
            {isOpen && <div className="p-4">{children}</div>}
        </div>
    );
}

// 六神颜色映射
const liuShenColors: Record<string, string> = {
    '青龙': 'bg-green-500/10 text-green-400 ring-1 ring-green-500/20',
    '朱雀': 'bg-red-500/10 text-red-400 ring-1 ring-red-500/20',
    '勾陈': 'bg-yellow-500/10 text-yellow-400 ring-1 ring-yellow-500/20',
    '螣蛇': 'bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20',
    '白虎': 'bg-stone-500/10 text-stone-400 ring-1 ring-stone-500/20',
    '玄武': 'bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20',
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
    ganZhiTime,
    kongWang,
    fuShen,
    shenSystem,
    summary,
}: TraditionalAnalysisProps) {
    // 爻位名称映射
    const yaoNames = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

    // 检查是否有扩展信息
    const hasExtendedInfo = fullYaos.length > 0 && 'strength' in fullYaos[0];

    // 趋势图标和颜色
    const trendConfig = {
        favorable: { icon: <TrendingUp className="w-5 h-5" />, color: 'text-green-500', bg: 'bg-green-500/10', label: '吉' },
        neutral: { icon: <Minus className="w-5 h-5" />, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: '平' },
        unfavorable: { icon: <TrendingDown className="w-5 h-5" />, color: 'text-red-500', bg: 'bg-red-500/10', label: '凶' },
    };

    return (
        <div className="space-y-4">
            {/* 综合摘要 */}
            {summary && (
                <div className={`p-4 rounded-lg border ${trendConfig[summary.overallTrend].bg} border-current/20`}>
                    <div className="flex items-center gap-3 mb-2">
                        <span className={trendConfig[summary.overallTrend].color}>
                            {trendConfig[summary.overallTrend].icon}
                        </span>
                        <span className={`text-lg font-bold ${trendConfig[summary.overallTrend].color}`}>
                            整体趋势：{trendConfig[summary.overallTrend].label}
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {summary.keyFactors.map((factor, i) => (
                            <span key={i} className="text-xs px-2 py-1 rounded bg-background border border-border text-foreground-secondary">
                                {factor}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* 干支时间显示 */}
            {ganZhiTime && (
                <CollapsibleSection
                    title="起卦时间"
                    icon={<Calendar className="w-5 h-5 text-purple-500" />}
                    defaultOpen={true}
                >
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 bg-white/5 border border-white/5 rounded-lg text-center">
                            <div className="text-xs text-foreground-secondary mb-1">年柱</div>
                            <div className="text-lg font-bold text-foreground">
                                {ganZhiTime.year.gan}{ganZhiTime.year.zhi}
                            </div>
                        </div>
                        <div className="p-3 bg-white/5 border border-white/5 rounded-lg text-center">
                            <div className="text-xs text-foreground-secondary mb-1">月柱（月建）</div>
                            <div className="text-lg font-bold text-accent">
                                {ganZhiTime.month.gan}{ganZhiTime.month.zhi}
                            </div>
                        </div>
                        <div className="p-3 bg-white/5 border border-white/5 rounded-lg text-center">
                            <div className="text-xs text-foreground-secondary mb-1">日柱（日辰）</div>
                            <div className="text-lg font-bold text-blue-400">
                                {ganZhiTime.day.gan}{ganZhiTime.day.zhi}
                            </div>
                        </div>
                        <div className="p-3 bg-white/5 border border-white/5 rounded-lg text-center">
                            <div className="text-xs text-foreground-secondary mb-1">时柱</div>
                            <div className="text-lg font-bold text-foreground">
                                {ganZhiTime.hour.gan}{ganZhiTime.hour.zhi}
                            </div>
                        </div>
                    </div>
                    {kongWang && (
                        <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-foreground-secondary">旬空：</span>
                                <span className="font-medium text-foreground">{kongWang.xun}</span>
                                <span className="text-red-500 font-bold">
                                    空亡：{kongWang.kongDizhi.join('、')}
                                </span>
                            </div>
                        </div>
                    )}
                </CollapsibleSection>
            )}
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
                                                    ? 'border-l-accent bg-accent/10 border-y border-r border-accent/20'
                                                    : yaoText.emphasis === 'medium'
                                                        ? 'border-l-yellow-500 bg-yellow-500/10 border-y border-r border-yellow-500/20'
                                                        : 'border-l-zinc-500 bg-white/5 border-y border-r border-white/10'
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
                    <div className="flex items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-lg">
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

            {/* 伏神分析 */}
            {fuShen && fuShen.length > 0 && (
                <CollapsibleSection
                    title="伏神分析"
                    icon={<AlertCircle className="w-5 h-5 text-orange-500" />}
                    defaultOpen={true}
                >
                    <div className="space-y-3">
                        <p className="text-sm text-foreground-secondary">
                            用神{yongShen.type}不上卦，需查伏神：
                        </p>
                        {fuShen.map((fs, i) => (
                            <div
                                key={i}
                                className={`p-3 rounded-lg border ${fs.isAvailable
                                    ? 'border-green-500/30 bg-green-500/5'
                                    : 'border-red-500/30 bg-red-500/5'
                                    }`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-foreground">{fs.liuQin}</span>
                                    <span className="text-sm text-foreground-secondary">
                                        伏于{yaoNames[fs.feiShenPosition - 1]}（{fs.feiShenLiuQin}）下
                                    </span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <span>纳甲：{fs.naJia}</span>
                                    <span>五行：{fs.wuXing}</span>
                                    <span className={fs.isAvailable ? 'text-green-500' : 'text-red-500'}>
                                        {fs.availabilityReason}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </CollapsibleSection>
            )}

            {/* 原神忌神仇神 */}
            {shenSystem && (
                <CollapsibleSection
                    title="神系分析"
                    icon={<Star className="w-5 h-5 text-purple-500" />}
                    defaultOpen={true}
                >
                    <div className="grid grid-cols-3 gap-3">
                        {shenSystem.yuanShen && (
                            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                                <div className="text-xs text-foreground-secondary mb-1">原神（生用神）</div>
                                <div className="font-bold text-green-500">{shenSystem.yuanShen.liuQin}</div>
                                <div className="text-xs text-foreground-secondary">
                                    {shenSystem.yuanShen.wuXing} · {shenSystem.yuanShen.positions.length > 0
                                        ? shenSystem.yuanShen.positions.map(p => yaoNames[p - 1]).join('、')
                                        : '不上卦'}
                                </div>
                            </div>
                        )}
                        {shenSystem.jiShen && (
                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-center">
                                <div className="text-xs text-foreground-secondary mb-1">忌神（克用神）</div>
                                <div className="font-bold text-red-500">{shenSystem.jiShen.liuQin}</div>
                                <div className="text-xs text-foreground-secondary">
                                    {shenSystem.jiShen.wuXing} · {shenSystem.jiShen.positions.length > 0
                                        ? shenSystem.jiShen.positions.map(p => yaoNames[p - 1]).join('、')
                                        : '不上卦'}
                                </div>
                            </div>
                        )}
                        {shenSystem.chouShen && (
                            <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-center">
                                <div className="text-xs text-foreground-secondary mb-1">仇神（克原神）</div>
                                <div className="font-bold text-orange-500">{shenSystem.chouShen.liuQin}</div>
                                <div className="text-xs text-foreground-secondary">
                                    {shenSystem.chouShen.wuXing} · {shenSystem.chouShen.positions.length > 0
                                        ? shenSystem.chouShen.positions.map(p => yaoNames[p - 1]).join('、')
                                        : '不上卦'}
                                </div>
                            </div>
                        )}
                    </div>
                </CollapsibleSection>
            )}

            {/* 六爻详解表格 */}
            <CollapsibleSection
                title="六爻详解"
                icon={<Info className="w-5 h-5 text-blue-500" />}
                defaultOpen={true}
            >
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="py-3 px-2 text-left text-foreground-secondary font-medium">爻位</th>
                                <th className="py-3 px-2 text-left text-foreground-secondary font-medium">六亲</th>
                                <th className="py-3 px-2 text-left text-foreground-secondary font-medium">六神</th>
                                <th className="py-3 px-2 text-left text-foreground-secondary font-medium">纳甲</th>
                                <th className="py-3 px-2 text-left text-foreground-secondary font-medium">五行</th>
                                <th className="py-3 px-2 text-center text-foreground-secondary font-medium">世应</th>
                                <th className="py-3 px-2 text-center text-foreground-secondary font-medium">状态</th>
                                {hasExtendedInfo && (
                                    <>
                                        <th className="py-2 px-2 text-center text-foreground-secondary font-medium">旺衰</th>
                                        <th className="py-2 px-2 text-center text-foreground-secondary font-medium">空亡</th>
                                        <th className="py-2 px-2 text-left text-foreground-secondary font-medium">月日作用</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {[...fullYaos].reverse().map((yao) => {
                                const extYao = yao as FullYaoInfoExtended;
                                return (
                                    <tr
                                        key={yao.position}
                                        className={`border-b border-white/5 ${yao.position === yongShen.position ? 'bg-accent/5' : ''
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
                                                <span className="text-red-500">
                                                    动
                                                    {extYao.changeAnalysis && HUA_TYPE_LABELS[extYao.changeAnalysis.huaType] && (
                                                        <span className="text-xs ml-1">
                                                            ({HUA_TYPE_LABELS[extYao.changeAnalysis.huaType]})
                                                        </span>
                                                    )}
                                                </span>
                                            ) : (
                                                <span className="text-foreground-secondary">静</span>
                                            )}
                                        </td>
                                        {hasExtendedInfo && extYao.strength && (
                                            <>
                                                <td className="py-2 px-2 text-center">
                                                    <span className={extYao.strength.isStrong ? 'text-green-500' : 'text-red-500'}>
                                                        {WANG_SHUAI_LABELS[extYao.strength.wangShuai]}
                                                    </span>
                                                    <span className="text-xs text-foreground-secondary ml-1">
                                                        ({extYao.strength.score})
                                                    </span>
                                                </td>
                                                <td className="py-2 px-2 text-center">
                                                    {extYao.kongWangState !== 'not_kong' && (
                                                        <span className="text-red-500 text-xs">
                                                            {KONG_WANG_LABELS[extYao.kongWangState]}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-2 px-2 text-xs text-foreground-secondary">
                                                    {extYao.influence.description}
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* 六神含义说明 */}
                <div className="mt-4 pt-4 border-t border-white/10">
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
