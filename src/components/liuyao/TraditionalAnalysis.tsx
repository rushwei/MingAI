/**
 * 传统六爻分析组件（多用神分组版）
 */
'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';
import {
    type FullYaoInfo,
    type FullYaoInfoExtended,
    type YongShenGroup,
    type TimeRecommendation,
    type GanZhiTime,
    type KongWang,
    type KongWangByPillar,
    type FuShen,
    type ShenSystemByYongShen,
    KONG_WANG_LABELS,
} from '@/lib/liuyao';
import { type HexagramText } from '@/lib/hexagram-texts';
import { LIU_QIN_TIPS, SHEN_XI_TIPS, TERM_TIPS } from '@/lib/liuyao-term-tips';

interface TraditionalAnalysisProps {
    fullYaos: FullYaoInfo[] | FullYaoInfoExtended[];
    yongShen: YongShenGroup[];
    shenSystemByYongShen: ShenSystemByYongShen[];
    globalShenSha: string[];
    timeRecommendations: TimeRecommendation[];
    hexagramText?: HexagramText;
    changedHexagramText?: HexagramText;
    changedLines?: number[];
    ganZhiTime?: GanZhiTime;
    kongWang?: KongWang;
    kongWangByPillar?: KongWangByPillar;
    fuShen?: FuShen[];
    warnings?: string[];
}

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
                <ChevronDown className={`w-4 h-4 text-foreground-secondary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`grid transition-[grid-template-rows] duration-200 ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                <div className="overflow-hidden">
                    <div className="p-3 text-sm">{children}</div>
                </div>
            </div>
        </div>
    );
}

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

const wuXingColorValues: Record<string, string> = {
    '金': '#FFD700',
    '木': '#228B22',
    '水': '#1E90FF',
    '火': '#FF4500',
    '土': '#8B4513',
};

const KONG_WANG_PILLAR_ITEMS: Array<{ key: keyof KongWangByPillar; label: string; suffix: string }> = [
    { key: 'year', label: '年空', suffix: '年' },
    { key: 'month', label: '月空', suffix: '月' },
    { key: 'day', label: '日空', suffix: '日' },
    { key: 'hour', label: '时空', suffix: '时' },
];
const YAO_NAMES = ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'];

function getWuXingStyle(wuXing: string | undefined): CSSProperties | undefined {
    const color = wuXing ? wuXingColorValues[wuXing] : undefined;
    return color ? { color } : undefined;
}

function getGanStyle(gan: string): CSSProperties | undefined {
    const wuXing = tianGanWuXing[gan] || '';
    return getWuXingStyle(wuXing);
}

function getZhiStyle(zhi: string): CSSProperties | undefined {
    const wuXing = diZhiWuXing[zhi] || '';
    return getWuXingStyle(wuXing);
}

const RECOMMENDATION_TYPE_TIPS: Record<TimeRecommendation['type'], string> = {
    favorable: '顺势推进窗口',
    unfavorable: '风险回避窗口',
    critical: '关键观察节点',
};

function getSourceLabel(source: 'input'): string {
    if (source === 'input') return '手动指定';
    return '';
}

function formatConfidence(value: number): string {
    const pct = Math.round(value * 100);
    return `${pct}%`;
}

function getPositionLabel(position?: number): string {
    if (typeof position !== 'number') return '未定位';
    return YAO_NAMES[position - 1] ?? `第${position}爻`;
}

export function TraditionalAnalysis({
    fullYaos,
    yongShen,
    shenSystemByYongShen,
    globalShenSha,
    timeRecommendations,
    hexagramText,
    changedHexagramText,
    changedLines = [],
    ganZhiTime,
    kongWang,
    kongWangByPillar,
    fuShen,
    warnings,
}: TraditionalAnalysisProps) {
    const movementStats = useMemo(() => {
        let changing = 0;
        let hiddenMoving = 0;
        let dayBreak = 0;
        let staticCount = 0;
        let withShenSha = 0;

        for (const yao of fullYaos) {
            const ext = yao as Partial<FullYaoInfoExtended>;
            switch (ext.movementState) {
                case 'changing':
                    changing += 1;
                    break;
                case 'hidden_moving':
                    hiddenMoving += 1;
                    break;
                case 'day_break':
                    dayBreak += 1;
                    break;
                default:
                    staticCount += 1;
                    break;
            }

            if (Array.isArray(ext.shenSha) && ext.shenSha.length > 0) {
                withShenSha += 1;
            }
        }

        return { changing, hiddenMoving, dayBreak, staticCount, withShenSha };
    }, [fullYaos]);

    const recommendationByTarget = useMemo(() => {
        const grouped = new Map<string, TimeRecommendation[]>();

        for (const rec of timeRecommendations) {
            const list = grouped.get(rec.targetLiuQin) ?? [];
            list.push(rec);
            grouped.set(rec.targetLiuQin, list);
        }

        for (const recs of grouped.values()) {
            recs.sort((a, b) => a.startDate.localeCompare(b.startDate));
        }

        return grouped;
    }, [timeRecommendations]);

    return (
        <div className="mx-auto w-full max-w-3xl space-y-4">
            {ganZhiTime && (
                <div className="space-y-1.5">
                    <div className="overflow-x-auto">
                        <div className="min-w-max overflow-hidden rounded-xl border border-border/70 bg-white/[0.02]">
                            <table className="w-full text-xs text-center">
                                <tbody className="divide-y divide-border/70">
                                    <tr className="divide-x divide-border/70">
                                        <td className="px-3 py-2 bg-white/5 text-accent font-semibold whitespace-nowrap">干支</td>
                                        {KONG_WANG_PILLAR_ITEMS.map(({ key, suffix }) => {
                                            const pillar = ganZhiTime[key];
                                            return (
                                                <td key={key} className="px-3 py-2 whitespace-nowrap">
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
                                        <td className="px-3 py-2 bg-white/5 text-accent font-semibold whitespace-nowrap">空亡</td>
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
                        {'注：六爻断卦判空亡以"日旬空"为主，年/月/时旬空供参考。'}
                    </div>
                </div>
            )}

            <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 space-y-2">
                <div className="text-sm font-semibold text-foreground">关键信号</div>
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                        {movementStats.changing > 0 && (
                            <span className="text-red-500 font-medium">明动 {movementStats.changing}</span>
                        )}
                        {movementStats.hiddenMoving > 0 && (
                            <span className="text-amber-500 font-medium">暗动 {movementStats.hiddenMoving}</span>
                        )}
                        {movementStats.dayBreak > 0 && (
                            <span className="text-orange-500 font-medium">日破 {movementStats.dayBreak}</span>
                        )}
                        <span className="text-foreground-tertiary">静爻 {movementStats.staticCount}</span>
                        <span className="text-foreground-tertiary">|</span>
                        <span className="text-foreground-secondary">用神 {yongShen.length}</span>
                        <span className="text-foreground-secondary">应期 {timeRecommendations.length}</span>
                        {globalShenSha.length > 0 && (
                            <>
                                <span className="text-foreground-tertiary">|</span>
                                <span className="text-foreground-secondary">
                                    {'全局神煞：'}
                                    {globalShenSha.join(' ')}
                                </span>
                            </>
                        )}
                    </div>

                    {warnings && warnings.length > 0 && (
                        <div className="flex items-start gap-1.5 text-xs md:max-w-[48%]">
                            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                            <span className="text-foreground-secondary">
                                <span className="text-foreground-tertiary">{'关键信号提示：'}</span>
                                {warnings.join('；')}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {yongShen.length > 0 && (
                <div className="grid gap-3 md:grid-cols-2">
                    {yongShen.map((group) => {
                        const system = shenSystemByYongShen.find(item => item.targetLiuQin === group.targetLiuQin);
                        const recs = recommendationByTarget.get(group.targetLiuQin) ?? [];
                        const selectedLine = typeof group.selected.position === 'number'
                            ? fullYaos.find(item => item.position === group.selected.position)
                            : undefined;
                        const isFuShenSelected = !!selectedLine && selectedLine.liuQin !== group.selected.liuQin;

                        return (
                            <div key={group.targetLiuQin} className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden text-xs">
                                {/* 卡片头：目标 + 评分 */}
                                <div className="flex items-center justify-start gap-2 px-3 py-2 bg-white/5">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-accent text-sm" title={LIU_QIN_TIPS[group.targetLiuQin]}>{group.targetLiuQin}</span>
                                        <span className="text-foreground-tertiary">{getSourceLabel(group.source)}</span>
                                    </div>
                                    <span className="tabular-nums px-2 py-0.5 rounded-md border border-accent/20 bg-accent/5 text-accent font-medium">
                                        {group.selected.rankScore}分
                                    </span>
                                </div>

                                {/* 卡片体：结构化行 */}
                                <div className="px-3 py-2 space-y-1 text-xs">
                                    <div className="flex gap-2">
                                        <span className="text-foreground-tertiary shrink-0 w-8">用神</span>
                                        <span>
                                            <span className="text-foreground font-medium" title={LIU_QIN_TIPS[group.selected.liuQin]}>{group.selected.liuQin}</span>
                                            {typeof group.selected.position === 'number' && (
                                                <span className="text-foreground-secondary">{' @'}{getPositionLabel(group.selected.position)}</span>
                                            )}
                                            {isFuShenSelected && <span className="text-orange-500" title={TERM_TIPS['伏神取用']}>{' · 伏神取用'}</span>}
                                            {group.selected.isShiYao && <span className="text-accent" title={TERM_TIPS['世位']}>{' · 世位'}</span>}
                                            {group.selected.isYingYao && <span className="text-blue-500" title={TERM_TIPS['应位']}>{' · 应位'}</span>}
                                        </span>
                                    </div>

                                    <div className="flex gap-2">
                                        <span className="text-foreground-tertiary shrink-0 w-8">状态</span>
                                        <span className="text-foreground-secondary">
                                            <span className={group.selected.movementState === 'changing' ? 'text-red-500' : group.selected.movementState === 'hidden_moving' ? 'text-amber-500' : group.selected.movementState === 'day_break' ? 'text-orange-500' : ''}>{group.selected.movementLabel}</span>
                                            {' · '}
                                            <span className={group.selected.isStrong ? 'text-green-500' : 'text-red-500'}>{group.selected.strengthLabel}</span>
                                            {group.selected.naJia && ` · ${group.selected.naJia}${group.selected.element}`}
                                            {group.selected.kongWangState && group.selected.kongWangState !== 'not_kong' && (
                                                <span className="text-orange-500">{' · '}{KONG_WANG_LABELS[group.selected.kongWangState]}</span>
                                            )}
                                        </span>
                                    </div>

                                    {(system?.yuanShen || system?.jiShen || system?.chouShen) && (
                                        <div className="flex gap-2">
                                            <span className="text-foreground-tertiary shrink-0 w-8">神系</span>
                                            <span className="text-foreground-secondary">
                                                {[
                                                    system?.yuanShen && <span key="yuan" className="text-green-500" title={SHEN_XI_TIPS['原神']}>{'原神'}{system.yuanShen.liuQin}({system.yuanShen.wuXing})</span>,
                                                    system?.jiShen && <span key="ji" className="text-red-500" title={SHEN_XI_TIPS['忌神']}>{'忌神'}{system.jiShen.liuQin}({system.jiShen.wuXing})</span>,
                                                    system?.chouShen && <span key="chou" className="text-orange-500" title={SHEN_XI_TIPS['仇神']}>{'仇神'}{system.chouShen.liuQin}({system.chouShen.wuXing})</span>,
                                                ].filter(Boolean).map((node, i) => <span key={i}>{i > 0 && ' · '}{node}</span>)}
                                            </span>
                                        </div>
                                    )}

                                    {group.selected.factors.length > 0 && (
                                        <div className="flex gap-2">
                                            <span className="text-foreground-tertiary shrink-0 w-8">判据</span>
                                            <span className="text-foreground-secondary">{group.selected.factors.join('、')}</span>
                                        </div>
                                    )}

                                    {group.candidates.length > 0 && (
                                        <div className="flex gap-2">
                                            <span className="text-foreground-tertiary shrink-0 w-12">{`候选（${group.candidates.length}）`}</span>
                                            <span className="text-foreground-tertiary">{group.candidates.map(c =>
                                                `${c.liuQin}@${getPositionLabel(c.position)}(${c.rankScore}分)`
                                            ).join('、')}</span>
                                        </div>
                                    )}

                                    {recs.length > 0 && (
                                        <div className="flex gap-2">
                                            <span className="text-foreground-tertiary shrink-0 w-12">近期应期</span>
                                            <span className="text-foreground-secondary space-y-1 flex flex-col">
                                                {recs.slice(0, 2).map((rec, i) => (
                                                    <span key={i}><span className="font-semibold">{RECOMMENDATION_TYPE_TIPS[rec.type]}</span><span className="text-foreground-tertiary">（概率{formatConfidence(rec.confidence)}）</span> {rec.startDate} ~ {rec.endDate}</span>
                                                ))}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {fuShen && fuShen.length > 0 && (
                <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs space-y-1">
                    <div className="text-orange-400 font-medium">伏神提示</div>
                    <div className="text-foreground-secondary">
                        {fuShen.map((fs) => `${fs.liuQin}伏于${getPositionLabel(fs.feiShenPosition)}下（${fs.availabilityReason}）`).join('；')}
                    </div>
                </div>
            )}

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

                        {changedHexagramText && (
                            <div className="mt-2 pt-2 border-t border-white/10">
                                <div>
                                    <span className="text-foreground-secondary">变卦 {changedHexagramText.name} 卦辞：</span>
                                    <span className="text-foreground">{changedHexagramText.gua}</span>
                                </div>
                                <div className="mt-1">
                                    <span className="text-foreground-secondary">变卦象曰：</span>
                                    <span className="text-foreground italic">{changedHexagramText.xiang}</span>
                                </div>
                            </div>
                        )}
                    </div>
                </CollapsibleSection>
            )}

        </div>
    );
}
