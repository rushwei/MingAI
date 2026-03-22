/**
 * 传统六爻分析组件（多用神分组版）
 */
'use client';

import { useMemo, useState, type CSSProperties } from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';
import type { LiuyaoCanonicalJSON } from '@mingai/core/json';
import { LIU_QIN_TIPS, SHEN_XI_TIPS } from '@/lib/divination/liuyao-term-tips';
import { KONG_WANG_LABELS } from '@/lib/divination/liuyao';

interface TraditionalAnalysisProps {
    analysis: LiuyaoCanonicalJSON;
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

function getMovementTone(state?: string): string {
    if (state === 'changing') return 'text-red-500';
    if (state === 'hidden_moving') return 'text-amber-500';
    if (state === 'day_break') return 'text-orange-500';
    return '';
}

function getPositionLabel(position?: string | number): string {
    if (typeof position === 'string' && position.trim()) return position;
    if (typeof position !== 'number') return '未定位';
    return YAO_NAMES[position - 1] ?? `第${position}爻`;
}

function getCandidateSourceLabel(source?: string): string | null {
    if (source === 'changed') return '变出';
    if (source === 'fushen') return '伏神';
    if (source === 'temporal') return '时空';
    if (source === 'visible') return '显爻';
    return null;
}

export function TraditionalAnalysis({
    analysis,
}: TraditionalAnalysisProps) {
    const movementStats = useMemo(() => {
        let changing = 0;
        let hiddenMoving = 0;
        let dayBreak = 0;
        let staticCount = 0;
        let withShenSha = 0;

        for (const yao of analysis.yaos) {
            switch (yao.movementState) {
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

            if (Array.isArray(yao.shenSha) && yao.shenSha.length > 0) {
                withShenSha += 1;
            }
        }

        return { changing, hiddenMoving, dayBreak, staticCount, withShenSha };
    }, [analysis.yaos]);

    const totalRecommendations = useMemo(
        () => analysis.yongShenAnalysis.reduce((sum, group) => sum + (group.timeRecommendations?.length || 0), 0),
        [analysis.yongShenAnalysis]
    );

    const fuShenHints = useMemo(() => {
        return analysis.yaos
            .filter((yao) => yao.fuShen)
            .map((yao) => `${yao.fuShen?.liuQin}伏于${yao.position}下`);
    }, [analysis.yaos]);

    return (
        <div className="mx-auto w-full max-w-3xl space-y-4">
            {analysis.ganZhiTime.length > 0 && (
                <div className="space-y-1.5">
                    <div className="overflow-x-auto">
                        <div className="min-w-max overflow-hidden rounded-xl border border-border/70 bg-white/[0.02]">
                            <table className="w-full text-xs text-center">
                                <tbody className="divide-y divide-border/70">
                                    <tr className="divide-x divide-border/70">
                                        <td className="px-3 py-2 bg-white/5 text-accent font-semibold whitespace-nowrap">干支</td>
                                        {analysis.ganZhiTime.map((pillar) => {
                                            return (
                                                <td key={pillar.pillar} className="px-3 py-2 whitespace-nowrap">
                                                    <span className="font-medium">
                                                        <span style={getGanStyle(pillar.ganZhi.charAt(0))}>{pillar.ganZhi.charAt(0)}</span>
                                                        <span style={getZhiStyle(pillar.ganZhi.charAt(1))}>{pillar.ganZhi.charAt(1)}</span>
                                                        <span className="text-foreground-secondary">{pillar.pillar}</span>
                                                    </span>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                    <tr className="divide-x divide-border/70">
                                        <td className="px-3 py-2 bg-white/5 text-accent font-semibold whitespace-nowrap">空亡</td>
                                        {analysis.ganZhiTime.map((pillar) => {
                                            return (
                                                <td
                                                    key={pillar.pillar}
                                                    className="px-3 py-2 whitespace-nowrap"
                                                >
                                                    {pillar.kongWang.length > 0 ? (
                                                        <span className="tracking-wide">
                                                            <span style={getZhiStyle(pillar.kongWang[0])}>{pillar.kongWang[0]}</span>
                                                            <span style={getZhiStyle(pillar.kongWang[1])}>{pillar.kongWang[1]}</span>
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

            {(analysis.hexagramInfo.nuclearHexagram || analysis.hexagramInfo.oppositeHexagram || analysis.hexagramInfo.reversedHexagram || analysis.hexagramInfo.guaShen) && (
                <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 space-y-1 text-xs text-foreground-secondary">
                    <div className="text-sm font-semibold text-foreground">衍生卦象</div>
                    <div>互卦：{analysis.hexagramInfo.nuclearHexagram?.name || '无'}</div>
                    <div>错卦：{analysis.hexagramInfo.oppositeHexagram?.name || '无'}</div>
                    <div>综卦：{analysis.hexagramInfo.reversedHexagram?.name || '无'}</div>
                    <div>
                        卦身：
                        {analysis.hexagramInfo.guaShen
                            ? `${analysis.hexagramInfo.guaShen.branch}${analysis.hexagramInfo.guaShen.position ? `（${analysis.hexagramInfo.guaShen.position}）` : ''}${analysis.hexagramInfo.guaShen.absent ? '（飞伏）' : ''}`
                            : '无'}
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
                        <span className="text-foreground-secondary">用神 {analysis.yongShenAnalysis.length}</span>
                        <span className="text-foreground-secondary">应期 {totalRecommendations}</span>
                        {(analysis.globalShenSha?.length || 0) > 0 && (
                            <>
                                <span className="text-foreground-tertiary">|</span>
                                <span className="text-foreground-secondary">
                                    {'全局神煞：'}
                                    {analysis.globalShenSha?.join(' ')}
                                </span>
                            </>
                        )}
                    </div>

                    {analysis.warnings.length > 0 && (
                        <div className="flex items-start gap-1.5 text-xs md:max-w-[48%]">
                            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                            <span className="text-foreground-secondary">
                                <span className="text-foreground-tertiary">{'关键信号提示：'}</span>
                                {analysis.warnings.join('；')}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {analysis.yongShenAnalysis.length > 0 && (
                <div className="grid gap-3 md:grid-cols-2">
                    {analysis.yongShenAnalysis.map((group, groupIndex) => {
                        const selectedSourceLabel = getCandidateSourceLabel(group.selected.source);
                        const selectedKongState = group.selected.kongWangState;
                        const selectedKongLabel = selectedKongState && selectedKongState !== 'not_kong'
                            ? KONG_WANG_LABELS[selectedKongState as keyof typeof KONG_WANG_LABELS] || selectedKongState
                            : '';
                        return (
                            <div key={group.targetLiuQin} className="rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden text-xs">
                                {/* 卡片头：目标 */}
                                <div className="flex items-center justify-start gap-2 px-3 py-2 bg-white/5">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-accent text-sm" title={LIU_QIN_TIPS[group.targetLiuQin]}>{group.targetLiuQin}</span>
                                        {groupIndex === 0 && (
                                            <span className="px-1.5 py-0.5 rounded border border-accent/40 bg-accent/10 text-accent text-[10px] leading-none">主</span>
                                        )}
                                        <span className="text-foreground-tertiary">{group.selectionStatus}</span>
                                    </div>
                                </div>

                                {/* 卡片体：结构化行 */}
                                <div className="px-3 py-2 space-y-1 text-xs">
                                    <div className="flex gap-2">
                                        <span className="text-foreground-tertiary shrink-0 w-8">用神</span>
                                            <span>
                                                <span className="text-foreground font-medium" title={LIU_QIN_TIPS[group.selected.liuQin]}>{group.selected.liuQin}</span>
                                                {group.selected.position && (
                                                    <span className="text-foreground-secondary">{' @'}{getPositionLabel(group.selected.position)}</span>
                                                )}
                                                {group.selected.isShiYao && <span className="text-accent">{' · 世位'}</span>}
                                                {group.selected.isYingYao && <span className="text-blue-500">{' · 应位'}</span>}
                                                {selectedSourceLabel && <span className="text-foreground-tertiary">{` · ${selectedSourceLabel}`}</span>}
                                            </span>
                                    </div>

                                    <div className="flex gap-2">
                                        <span className="text-foreground-tertiary shrink-0 w-8">状态</span>
                                        <span className="text-foreground-secondary">
                                            <span className={getMovementTone(group.selected.movementState)}>{group.selected.movementLabel}</span>
                                            {' · '}
                                            <span>{group.selected.strengthLabel}</span>
                                            {group.selected.naJia && group.selected.element && ` · ${group.selected.naJia}${group.selected.element}`}
                                            {selectedKongLabel && (
                                                <span className="text-orange-500">{' · '}{selectedKongLabel}</span>
                                            )}
                                        </span>
                                    </div>

                                    {(group.shenSystem?.yuanShen || group.shenSystem?.jiShen || group.shenSystem?.chouShen) && (
                                        <div className="flex gap-2">
                                            <span className="text-foreground-tertiary shrink-0 w-8">神系</span>
                                            <span className="text-foreground-secondary">
                                                {[
                                                    group.shenSystem?.yuanShen && <span key="yuan" className="text-green-500" title={SHEN_XI_TIPS['原神']}>{'原神'}{group.shenSystem.yuanShen}</span>,
                                                    group.shenSystem?.jiShen && <span key="ji" className="text-red-500" title={SHEN_XI_TIPS['忌神']}>{'忌神'}{group.shenSystem.jiShen}</span>,
                                                    group.shenSystem?.chouShen && <span key="chou" className="text-orange-500" title={SHEN_XI_TIPS['仇神']}>{'仇神'}{group.shenSystem.chouShen}</span>,
                                                ].filter(Boolean).map((node, i) => <span key={i}>{i > 0 && ' · '}{node}</span>)}
                                            </span>
                                        </div>
                                    )}

                                    {group.selected.evidence && group.selected.evidence.length > 0 && (
                                        <div className="flex gap-2">
                                            <span className="text-foreground-tertiary shrink-0 w-8">判据</span>
                                            <span className="text-foreground-secondary">{group.selected.evidence.join('、')}</span>
                                        </div>
                                    )}

                                    {group.selectionNote && (
                                        <div className="flex gap-2">
                                            <span className="text-foreground-tertiary shrink-0 w-8">取用</span>
                                            <span className="text-foreground-secondary">{group.selectionNote}</span>
                                        </div>
                                    )}

                                    {group.candidates && group.candidates.length > 0 && (
                                        <div className="flex gap-2">
                                            <span className="text-foreground-tertiary shrink-0 w-12">{`候选（${group.candidates.length}）`}</span>
                                            <span className="text-foreground-tertiary">{group.candidates.map((c) => {
                                                const sourceLabel = getCandidateSourceLabel(c.source);
                                                return `${c.liuQin}@${getPositionLabel(c.position)}${sourceLabel ? `(${sourceLabel})` : ''}`;
                                            }).join('、')}</span>
                                        </div>
                                    )}

                                    {group.candidates && group.candidates.length > 1 && (
                                        <div className="flex gap-2">
                                            <span className="text-foreground-tertiary shrink-0 w-12">说明</span>
                                            <span className="text-foreground-tertiary">候选仅表示并看线索，不代表数值高低。</span>
                                        </div>
                                    )}

                                    {group.timeRecommendations && group.timeRecommendations.length > 0 && (
                                        <div className="flex gap-2">
                                            <span className="text-foreground-tertiary shrink-0 w-12">近期应期</span>
                                            <span className="text-foreground-secondary space-y-1 flex flex-col">
                                                {group.timeRecommendations.slice(0, 2).map((rec, i) => (
                                                    <span key={i}>
                                                        {rec.trigger}
                                                        {rec.basis.length > 0 && <span className="text-foreground-tertiary">{`（${rec.basis.join('、')}）`}</span>}
                                                        {` ${rec.description}`}
                                                    </span>
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

            {fuShenHints.length > 0 && (
                <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 py-2 text-xs space-y-1">
                    <div className="text-orange-400 font-medium">伏神提示</div>
                    <div className="text-foreground-secondary">
                        {fuShenHints.join('；')}
                    </div>
                </div>
            )}

            {analysis.guaLevelAnalysis.length > 0 && (
                <div className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 space-y-1 text-xs text-foreground-secondary">
                    <div className="text-sm font-semibold text-foreground">卦级分析</div>
                    {analysis.guaLevelAnalysis.map((line, index) => (
                        <div key={`${line}-${index}`}>{line}</div>
                    ))}
                </div>
            )}

            {(analysis.hexagramInfo.mainHexagram.guaCi || analysis.hexagramInfo.mainHexagram.xiangCi || analysis.hexagramInfo.changedHexagram?.changingYaoCi?.length) && (
                <CollapsibleSection title="卦辞象辞" defaultOpen={false}>
                    <div className="space-y-2">
                        {analysis.hexagramInfo.mainHexagram.guaCi && (
                            <div>
                                <span className="text-foreground-secondary">卦辞：</span>
                                <span className="text-foreground">{analysis.hexagramInfo.mainHexagram.guaCi}</span>
                            </div>
                        )}
                        {analysis.hexagramInfo.mainHexagram.xiangCi && (
                            <div>
                                <span className="text-foreground-secondary">象曰：</span>
                                <span className="text-foreground italic">{analysis.hexagramInfo.mainHexagram.xiangCi}</span>
                            </div>
                        )}

                        {analysis.hexagramInfo.changedHexagram?.changingYaoCi && analysis.hexagramInfo.changedHexagram.changingYaoCi.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-white/10">
                                <div className="text-foreground-secondary mb-1">变爻爻辞：</div>
                                {analysis.hexagramInfo.changedHexagram.changingYaoCi.map((yaoText) => {
                                    return (
                                        <div
                                            key={`${yaoText.yaoName}-${yaoText.yaoCi}`}
                                            className="p-2 rounded border-l-2 mb-1 border-l-accent bg-accent/5"
                                        >
                                            <span className="font-medium text-foreground">{yaoText.yaoName}：</span>
                                            <span className="text-foreground-secondary">{yaoText.yaoCi}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {analysis.hexagramInfo.changedHexagram && (
                            <div className="mt-2 pt-2 border-t border-white/10">
                                {analysis.hexagramInfo.changedHexagram.guaCi && (
                                    <div>
                                        <span className="text-foreground-secondary">变卦 {analysis.hexagramInfo.changedHexagram.name} 卦辞：</span>
                                        <span className="text-foreground">{analysis.hexagramInfo.changedHexagram.guaCi}</span>
                                    </div>
                                )}
                                {analysis.hexagramInfo.changedHexagram.xiangCi && (
                                    <div className="mt-1">
                                        <span className="text-foreground-secondary">变卦象曰：</span>
                                        <span className="text-foreground italic">{analysis.hexagramInfo.changedHexagram.xiangCi}</span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </CollapsibleSection>
            )}

        </div>
    );
}
