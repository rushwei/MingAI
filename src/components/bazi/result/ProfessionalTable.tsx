/**
 * 八字专业排盘表格组件
 *
 * 'use client' 标记说明：
 * - 使用 React hooks (useState)
 * - 有折叠/展开交互功能
 */
'use client';

import { useState } from 'react';
import type { BaziCanonicalJSON } from '@mingai/core/json';
import {
    getElementColor,
    STEM_ELEMENTS,
    BRANCH_ELEMENTS,
    type DaYunInfo,
    type LiuNianInfo,
    type LiuYueInfo,
    type LiuRiInfo,
} from '@/lib/divination/bazi';
import type { EarthlyBranch, HeavenlyStem, HiddenStemDetail } from '@/types';
import { ChevronDown, ChevronUp } from 'lucide-react';

// 神煞吉凶分类
const JI_SHEN = new Set([
    '天乙贵人', '太极贵人', '天德贵人', '月德贵人', '天德合', '月德合',
    '三奇贵人', '文昌贵人', '文昌', '学堂', '词馆', '华盖', '金舆',
    '天医', '福星', '禄神', '天禄', '暗禄', '驿马', '将星', '天厨',
    '金匮', '玉堂', '龙德', '紫薇', '天喜', '红鸾', '月德', '天德',
    '天赦', '天巫', '国印', '进神', '天罗', '地网', '天官', '福德',
    '红鸾', '天喜',
]);

const XIONG_SHA = new Set([
    '羊刃', '飞刃', '亡神', '劫煞', '灾煞', '血刃', '血光',
    '白虎', '丧门', '吊客', '天狗', '勾绞', '孤辰', '寡宿',
    '空亡', '元辰', '破碎', '大耗', '小耗', '咸池', '桃花',
    '红艳', '流霞', '披麻', '天哭', '病符', '死符', '官符',
    '岁破', '月破', '四废', '阴差阳错', '孤鸾', '童子煞',
    '铁扫', '扫把', '寒命', '孤神', '亡劫', '六厄',
]);

// 获取神煞的吉凶颜色样式
function getShenShaStyle(sha: string): { text: string; bg: string } {
    if (JI_SHEN.has(sha)) {
        return { text: 'text-emerald-500', bg: 'bg-emerald-500/10' };
    }
    if (XIONG_SHA.has(sha)) {
        return { text: 'text-rose-500', bg: 'bg-rose-500/10' };
    }
    // 中性或未分类的神煞
    return { text: 'text-foreground-secondary', bg: 'bg-background' };
}

// 运势柱信息接口
interface FortuneColumn {
    key: string;
    label: string;
    stem: string;
    branch: string;
    shiShen?: string;
    hiddenStems: HiddenStemDetail[];
    naYin: string;
    diShi: string;
    shenSha: string[];
    active?: boolean;
}

export function ProfessionalTable({
    canonicalChart,
    isUnknownTime = false,
    // 运势信息 - 新增
    activeDaYun,
    activeLiuNian,
    activeLiuYue,
    activeLiuRi,
}: {
    canonicalChart: BaziCanonicalJSON;
    isUnknownTime?: boolean;
    // 运势信息 - 新增
    activeDaYun?: DaYunInfo;
    activeLiuNian?: LiuNianInfo;
    activeLiuYue?: LiuYueInfo;
    activeLiuRi?: LiuRiInfo;
}) {
    const [shenShaExpanded, setShenShaExpanded] = useState(false);

    // 构建运势柱列表（左侧列）
    const fortuneColumns: FortuneColumn[] = [];

    if (activeLiuRi) {
        fortuneColumns.push({
            key: 'liuRi',
            label: '流日',
            stem: activeLiuRi.gan,
            branch: activeLiuRi.zhi,
            shiShen: activeLiuRi.tenGod,
            hiddenStems: activeLiuRi.hiddenStems,
            naYin: activeLiuRi.naYin,
            diShi: activeLiuRi.diShi,
            shenSha: activeLiuRi.shenSha,
            active: true,
        });
    }

    if (activeLiuYue) {
        fortuneColumns.push({
            key: 'liuYue',
            label: '流月',
            stem: activeLiuYue.gan,
            branch: activeLiuYue.zhi,
            shiShen: activeLiuYue.tenGod,
            hiddenStems: activeLiuYue.hiddenStems,
            naYin: activeLiuYue.naYin,
            diShi: activeLiuYue.diShi,
            shenSha: activeLiuYue.shenSha,
            active: true,
        });
    }

    if (activeLiuNian) {
        fortuneColumns.push({
            key: 'liuNian',
            label: '流年',
            stem: activeLiuNian.gan,
            branch: activeLiuNian.zhi,
            shiShen: activeLiuNian.tenGod,
            hiddenStems: activeLiuNian.hiddenStems,
            naYin: activeLiuNian.naYin,
            diShi: activeLiuNian.diShi,
            shenSha: activeLiuNian.shenSha,
            active: true,
        });
    }

    if (activeDaYun) {
        fortuneColumns.push({
            key: 'daYun',
            label: '大运',
            stem: activeDaYun.gan,
            branch: activeDaYun.zhi,
            shiShen: activeDaYun.tenGod,
            hiddenStems: activeDaYun.hiddenStems,
            naYin: activeDaYun.naYin,
            diShi: activeDaYun.diShi,
            shenSha: activeDaYun.shenSha,
            active: true,
        });
    }

    const columns = canonicalChart.fourPillars.map((pillar, index) => {
        const stem = pillar.ganZhi.charAt(0);
        const branch = pillar.ganZhi.charAt(1);
        return {
            key: ['year', 'month', 'day', 'hour'][index] || `pillar-${index}`,
            label: pillar.pillar,
            pillar,
            stem,
            branch,
            shiShen: index === 2 ? (canonicalChart.basicInfo.gender === '男' ? '元男' : '元女') : (pillar.tenGod || ''),
            hidden: isUnknownTime && index === 3,
        };
    });

    const hasShenSha = columns.some(col => (col.pillar.shenSha || []).length > 0)
        || fortuneColumns.some(col => col.shenSha.length > 0);
    const hasFortuneColumns = fortuneColumns.length > 0;

    // 获取天干五行颜色
    const getStemColor = (stem: string) => {
        const element = STEM_ELEMENTS[stem as HeavenlyStem];
        return element ? getElementColor(element) : undefined;
    };

    // 获取地支五行颜色
    const getBranchColor = (branch: string) => {
        const element = BRANCH_ELEMENTS[branch as EarthlyBranch];
        return element ? getElementColor(element) : undefined;
    };

    const columnCount = fortuneColumns.length + columns.length;

    return (
        <div className="overflow-x-auto -mx-2 px-1">
            <table className="w-max sm:w-full table-fixed sm:table-auto border-collapse text-sm">
                <colgroup>
                    <col className="w-8 sm:w-auto" />
                    {Array.from({ length: columnCount }).map((_, idx) => (
                        <col key={idx} className="w-[48px] sm:w-auto" />
                    ))}
                </colgroup>
                <thead>
                    <tr className=" border-b border-border">
                        <th className="py-2 px-0.5 sm:px-1 text-left text-foreground-secondary font-medium w-8 sm:w-auto sticky left-0 z-20 bg-background/90 backdrop-blur-md border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"></th>
                        {/* 运势柱表头 */}
                        {fortuneColumns.map((col) => (
                            <th key={col.key} className="py-2 px-0.5 sm:px-1 text-center font-medium text-xs sm:text-sm">
                                {col.label}
                            </th>
                        ))}
                        {/* 四柱表头 */}
                        {columns.map((col, idx) => (
                            <th key={col.key} className={`py-2 px-0.5 sm:px-1 text-center font-medium text-xs sm:text-sm ${idx === 0 && hasFortuneColumns ? 'border-l border-border' : ''}`}>
                                {col.label}
                                {col.hidden && <span className="text-amber-500 ml-1">*</span>}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {/* 主星行 */}
                    <tr className="border-b border-border/50">
                        <td className="py-2 px-0.5 sm:px-1 max-sm:text-center text-foreground-secondary text-xs sticky left-0 z-20 bg-background/90 backdrop-blur-md border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">主星</td>
                        {fortuneColumns.map((col) => (
                            <td key={col.key} className="py-2 px-0.5 sm:px-1 text-center text-xs">
                                {col.shiShen || '-'}
                            </td>
                        ))}
                        {columns.map((col, idx) => (
                            <td key={col.key} className={`py-2 px-0.5 sm:px-1 text-center text-xs ${col.hidden ? 'opacity-40' : ''} ${idx === 0 && hasFortuneColumns ? 'border-l border-border' : ''}`}>
                                {col.hidden ? '?' : col.shiShen}
                            </td>
                        ))}
                    </tr>
                    {/* 天干行 */}
                    <tr className="border-b border-border/50">
                        <td className="py-2 px-0.5 sm:px-1 max-sm:text-center text-foreground-secondary text-xs sticky left-0 z-20 bg-background/90 backdrop-blur-md border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">天干</td>
                        {fortuneColumns.map((col) => (
                            <td key={col.key} className="py-2 px-0.5 sm:px-1 text-center">
                                <span
                                    className="text-xl sm:text-2xl font-bold"
                                    style={{ color: getStemColor(col.stem) }}
                                >
                                    {col.stem}
                                </span>
                            </td>
                        ))}
                        {columns.map((col, idx) => (
                            <td key={col.key} className={`py-2 px-0.5 sm:px-1 text-center ${col.hidden ? 'opacity-40' : ''} ${idx === 0 && hasFortuneColumns ? 'border-l border-border' : ''}`}>
                                <span
                                    className="text-xl sm:text-2xl font-bold"
                                    style={{ color: col.hidden ? undefined : getStemColor(col.stem) }}
                                >
                                    {col.hidden ? '*' : col.stem}
                                </span>
                            </td>
                        ))}
                    </tr>
                    {/* 地支行 */}
                    <tr className="border-b border-border/50">
                        <td className="py-2 px-0.5 sm:px-1 max-sm:text-center text-foreground-secondary text-xs sticky left-0 z-20 bg-background/90 backdrop-blur-md border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">地支</td>
                        {fortuneColumns.map((col) => (
                            <td key={col.key} className="py-2 px-0.5 sm:px-1 text-center">
                                <span
                                    className="text-xl sm:text-2xl font-bold"
                                    style={{ color: getBranchColor(col.branch) }}
                                >
                                    {col.branch}
                                </span>
                            </td>
                        ))}
                        {columns.map((col, idx) => (
                            <td key={col.key} className={`py-2 px-0.5 sm:px-1 text-center ${col.hidden ? 'opacity-40' : ''} ${idx === 0 && hasFortuneColumns ? 'border-l border-border' : ''}`}>
                                <span
                                    className="text-xl sm:text-2xl font-bold"
                                    style={{ color: col.hidden ? undefined : getBranchColor(col.branch) }}
                                >
                                    {col.hidden ? '*' : col.branch}
                                </span>
                            </td>
                        ))}
                    </tr>
                    {/* 藏干行 */}
                    <tr className="border-b border-border/50">
                        <td className="py-2 px-0.5 sm:px-1 max-sm:text-center text-foreground-secondary text-xs sticky left-0 z-20 bg-background/90 backdrop-blur-md border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">藏干</td>
                        {/* 运势柱的藏干 */}
                        {fortuneColumns.map((col) => (
                            <td key={col.key} className="py-2 px-0.5 sm:px-1 text-center">
                                <div className="flex flex-col items-center gap-0.5">
                                        {col.hiddenStems.map((stem, idx) => {
                                            const element = STEM_ELEMENTS[stem.stem as HeavenlyStem];
                                            const detailLabel = stem.tenGod || '';
                                            return (
                                                <div key={idx} className="flex items-center gap-0.5">
                                                    <span
                                                        className="text-xs font-medium"
                                                        style={{ color: element ? getElementColor(element) : undefined }}
                                                    >
                                                        {stem.stem}
                                                    </span>
                                                    {detailLabel && (
                                                        <span className="text-xs text-foreground-secondary">
                                                            {detailLabel}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                </div>
                            </td>
                        ))}
                        {columns.map((col, idx) => (
                            <td key={col.key} className={`py-2 px-0.5 sm:px-1 text-center ${col.hidden ? 'opacity-40' : ''} ${idx === 0 && hasFortuneColumns ? 'border-l border-border' : ''}`}>
                                {col.hidden ? (
                                    <span className="text-xs">*</span>
                                ) : (
                                    <div className="flex flex-col items-center gap-0.5">
                                        {(col.pillar.hiddenStems || []).map((stem, idx) => {
                                            const element = STEM_ELEMENTS[stem.stem as HeavenlyStem];
                                            const detailLabel = stem.tenGod || '';
                                            return (
                                                <div key={idx} className="flex items-center gap-0.5">
                                                    <span
                                                        className="text-xs font-medium"
                                                        style={{ color: element ? getElementColor(element) : undefined }}
                                                    >
                                                        {stem.stem}
                                                    </span>
                                                    {detailLabel && (
                                                        <span className="text-xs text-foreground-secondary">
                                                            {detailLabel}
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </td>
                        ))}
                    </tr>
                    {/* 星运行 */}
                    <tr className="border-b border-border/50">
                        <td className="py-2 px-0.5 sm:px-1 max-sm:text-center text-foreground-secondary text-xs sticky left-0 z-20 bg-background/90 backdrop-blur-md border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">星运</td>
                        {
                            fortuneColumns.map((col) => (
                                <td key={col.key} className="py-2 px-0.5 sm:px-1 text-center text-xs text-foreground-secondary/70">
                                    {col.diShi}
                                </td>
                            ))
                        }
                        {
                            columns.map((col, idx) => (
                                <td key={col.key} className={`py-2 px-0.5 sm:px-1 text-center text-xs ${col.hidden ? 'opacity-40' : ''} ${idx === 0 && hasFortuneColumns ? 'border-l border-border' : ''}`}>
                                    {col.hidden ? '?' : (col.pillar.diShi || '-')}
                                </td>
                            ))
                        }
                    </tr>
                    {/* 纳音行 */}
                    <tr className="border-b border-border/50">
                        <td className="py-2 px-0.5 sm:px-1 max-sm:text-center text-foreground-secondary text-xs sticky left-0 z-20 bg-background/90 backdrop-blur-md border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">纳音</td>
                        {fortuneColumns.map((col) => (
                            <td key={col.key} className="py-2 px-0.5 sm:px-1 text-center text-xs text-foreground-secondary/70">
                                {col.naYin}
                            </td>
                        ))}
                        {columns.map((col, idx) => (
                            <td key={col.key} className={`py-2 px-0.5 sm:px-1 text-center text-xs text-foreground-secondary ${col.hidden ? 'opacity-40' : ''} ${idx === 0 && hasFortuneColumns ? 'border-l border-border' : ''}`}>
                                {col.hidden ? '?' : (col.pillar.naYin || '-')}
                            </td>
                        ))}
                    </tr>
                    {/* 神煞星行 */}
                    {hasShenSha && (
                        <tr>
                            <td className="py-2 px-0.5 sm:px-1 text-center text-foreground-secondary text-xs sticky left-0 z-20 bg-background/90 backdrop-blur-md border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                <button
                                    onClick={() => setShenShaExpanded(!shenShaExpanded)}
                                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                                    title={shenShaExpanded ? '收起神煞' : '展开神煞'}
                                >
                                    神煞
                                    {shenShaExpanded ? (
                                        <ChevronUp className="w-3 h-3" />
                                    ) : (
                                        <ChevronDown className="w-3 h-3" />
                                    )}
                                </button>
                            </td>
                            {/* 运势柱的神煞 */}
                            {fortuneColumns.map((col) => (
                                <td key={col.key} className="py-2 px-0.5 sm:px-1 text-center">
                                    {col.shenSha.length > 0 ? (
                                        <div className="flex flex-col items-center gap-0.5">
                                            {(shenShaExpanded ? col.shenSha : col.shenSha.slice(0, 1)).map((sha, idx) => {
                                                const style = getShenShaStyle(sha);
                                                return (
                                                    <span
                                                        key={idx}
                                                        className={`text-xs sm:px-1 py-0.5 sm:rounded whitespace-nowrap ${style.text} sm:${style.bg}`}
                                                    >
                                                        {sha}
                                                    </span>
                                                );
                                            })}
                                            {!shenShaExpanded && col.shenSha.length > 1 && (
                                                <span className="text-xs text-foreground-secondary/50">
                                                    +{col.shenSha.length - 1}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-foreground-secondary/50">-</span>
                                    )}
                                </td>
                            ))}
                            {columns.map((col, idx) => (
                                <td key={col.key} className={`py-2 px-0.5 sm:px-1 text-center ${col.hidden ? 'opacity-40' : ''} ${idx === 0 && hasFortuneColumns ? 'border-l border-border' : ''}`}>
                                    {col.hidden ? (
                                        <span className="text-xs">?</span>
                                    ) : (col.pillar.shenSha || []).length > 0 ? (
                                        <div className="flex flex-col items-center gap-0.5">
                                            {/* 默认只显示第一个神煞 */}
                                            {((shenShaExpanded ? col.pillar.shenSha : col.pillar.shenSha?.slice(0, 1)) || []).map((sha, idx) => {
                                                const style = getShenShaStyle(sha);
                                                return (
                                                    <span
                                                        key={idx}
                                                        className={`text-xs sm:px-1 py-0.5 sm:rounded whitespace-nowrap ${style.text} sm:${style.bg}`}
                                                    >
                                                        {sha}
                                                    </span>
                                                );
                                            })}
                                            {/* 如果未展开且有多个，显示数量提示 */}
                                            {!shenShaExpanded && (col.pillar.shenSha?.length || 0) > 1 && (
                                                <span className="text-xs text-foreground-secondary/50">
                                                    +{(col.pillar.shenSha?.length || 0) - 1}
                                                </span>
                                            )}
                                        </div>
                                    ) : (
                                        <span className="text-xs text-foreground-secondary/50">-</span>
                                    )}
                                </td>
                            ))}
                        </tr>
                    )}
                </tbody>
            </table >
            {isUnknownTime && (
                <p className="mt-2 text-xs text-amber-500">
                    * 时辰未知，时柱数据仅供参考
                </p>
            )
            }
        </div >
    );
}
