'use client';

import { useState } from 'react';
import {
    calculateBazi,
    calculateProfessionalData,
    calculateTenGod,
    getNaYin,
    getDiShi,
    calculateFortuneShenSha,
    getElementColor,
    STEM_ELEMENTS,
    BRANCH_ELEMENTS,
    HIDDEN_STEMS,
    type PillarShenSha,
    type DaYunInfo,
    type LiuNianInfo,
    type LiuYueInfo,
    type LiuRiInfo,
} from '@/lib/bazi';
import type { Gender, HeavenlyStem, EarthlyBranch, TenGod } from '@/types';
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
    shiShen?: TenGod | string;
    hiddenStems: HeavenlyStem[];
    shiShenZhi: string[];
    naYin: string;
    diShi: string;
    shenSha: string[];
    active?: boolean;
}

export function ProfessionalTable({
    baziResult,
    proData,
    gender,
    isUnknownTime = false,
    pillarShenSha,
    // 运势信息 - 新增
    activeDaYun,
    activeLiuNian,
    activeLiuYue,
    activeLiuRi,
}: {
    baziResult: ReturnType<typeof calculateBazi>;
    proData: ReturnType<typeof calculateProfessionalData>;
    gender: Gender;
    isUnknownTime?: boolean;
    pillarShenSha?: PillarShenSha;
    // 运势信息 - 新增
    activeDaYun?: DaYunInfo;
    activeLiuNian?: LiuNianInfo;
    activeLiuYue?: LiuYueInfo;
    activeLiuRi?: LiuRiInfo;
}) {
    const [shenShaExpanded, setShenShaExpanded] = useState(false);

    // 获取日主及相关支
    const dayStem = baziResult.fourPillars.day.stem as HeavenlyStem;
    const dayBranch = baziResult.fourPillars.day.branch as EarthlyBranch;
    const yearBranch = baziResult.fourPillars.year.branch as EarthlyBranch;

    // 构建运势柱列表（左侧列）
    const fortuneColumns: FortuneColumn[] = [];

    if (activeLiuRi) {
        const shiShen = calculateTenGod(dayStem, activeLiuRi.gan as HeavenlyStem);
        const branch = activeLiuRi.zhi as EarthlyBranch;
        const hiddenStems = HIDDEN_STEMS[branch] || [];
        const shiShenZhi = hiddenStems.map(s => calculateTenGod(dayStem, s));
        const ganZhi = activeLiuRi.gan + activeLiuRi.zhi;

        fortuneColumns.push({
            key: 'liuRi',
            label: '流日',
            stem: activeLiuRi.gan,
            branch: activeLiuRi.zhi,
            shiShen,
            hiddenStems,
            shiShenZhi,
            naYin: getNaYin(ganZhi),
            diShi: getDiShi(dayStem, branch),
            shenSha: calculateFortuneShenSha(branch, dayStem, dayBranch, yearBranch),
            active: true,
        });
    }

    if (activeLiuYue) {
        // LiuYueInfo 只有 ganZhi，需要拆分
        const gan = activeLiuYue.ganZhi.charAt(0);
        const zhi = activeLiuYue.ganZhi.charAt(1) as EarthlyBranch;
        const shiShen = calculateTenGod(dayStem, gan as HeavenlyStem);
        const hiddenStems = HIDDEN_STEMS[zhi] || [];
        const shiShenZhi = hiddenStems.map(s => calculateTenGod(dayStem, s));

        fortuneColumns.push({
            key: 'liuYue',
            label: '流月',
            stem: gan,
            branch: zhi,
            shiShen,
            hiddenStems,
            shiShenZhi,
            naYin: getNaYin(activeLiuYue.ganZhi),
            diShi: getDiShi(dayStem, zhi),
            shenSha: calculateFortuneShenSha(zhi, dayStem, dayBranch, yearBranch),
            active: true,
        });
    }

    if (activeLiuNian) {
        const shiShen = calculateTenGod(dayStem, activeLiuNian.gan as HeavenlyStem);
        const branch = activeLiuNian.zhi as EarthlyBranch;
        const hiddenStems = HIDDEN_STEMS[branch] || [];
        const shiShenZhi = hiddenStems.map(s => calculateTenGod(dayStem, s));
        const ganZhi = activeLiuNian.gan + activeLiuNian.zhi;

        fortuneColumns.push({
            key: 'liuNian',
            label: '流年',
            stem: activeLiuNian.gan,
            branch: activeLiuNian.zhi,
            shiShen,
            hiddenStems,
            shiShenZhi,
            naYin: getNaYin(ganZhi),
            diShi: getDiShi(dayStem, branch),
            shenSha: calculateFortuneShenSha(branch, dayStem, dayBranch, yearBranch),
            active: true,
        });
    }

    if (activeDaYun) {
        const shiShen = calculateTenGod(dayStem, activeDaYun.gan as HeavenlyStem);
        const branch = activeDaYun.zhi as EarthlyBranch;
        const hiddenStems = HIDDEN_STEMS[branch] || [];
        const shiShenZhi = hiddenStems.map(s => calculateTenGod(dayStem, s));
        const ganZhi = activeDaYun.gan + activeDaYun.zhi;

        fortuneColumns.push({
            key: 'daYun',
            label: '大运',
            stem: activeDaYun.gan,
            branch: activeDaYun.zhi,
            shiShen,
            hiddenStems,
            shiShenZhi,
            naYin: getNaYin(ganZhi),
            diShi: getDiShi(dayStem, branch),
            shenSha: calculateFortuneShenSha(branch, dayStem, dayBranch, yearBranch),
            active: true,
        });
    }

    const columns = [
        { key: 'year', label: '年柱', pillar: baziResult.fourPillars.year, naYin: proData.naYin.year, diShi: proData.diShi.year, shiShen: proData.shiShenGan.year, shiShenZhi: proData.shiShenZhi.year, hidden: false, shenSha: pillarShenSha?.year || [] },
        { key: 'month', label: '月柱', pillar: baziResult.fourPillars.month, naYin: proData.naYin.month, diShi: proData.diShi.month, shiShen: proData.shiShenGan.month, shiShenZhi: proData.shiShenZhi.month, hidden: false, shenSha: pillarShenSha?.month || [] },
        { key: 'day', label: '日柱', pillar: baziResult.fourPillars.day, naYin: proData.naYin.day, diShi: proData.diShi.day, shiShen: gender === 'male' ? '元男' : '元女', shiShenZhi: proData.shiShenZhi.day, hidden: false, shenSha: pillarShenSha?.day || [] },
        { key: 'hour', label: '时柱', pillar: baziResult.fourPillars.hour, naYin: proData.naYin.hour, diShi: proData.diShi.hour, shiShen: proData.shiShenGan.hour, shiShenZhi: proData.shiShenZhi.hour, hidden: isUnknownTime, shenSha: pillarShenSha?.hour || [] },
    ];

    const hasShenSha = columns.some(col => col.shenSha.length > 0)
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
                        <th className="py-2 px-0.5 sm:px-1 text-left text-foreground-secondary font-medium w-8 sm:w-auto sticky left-0 z-20 bg-white/60 dark:bg-black/60 backdrop-blur-md border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"></th>
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
                        <td className="py-2 px-0.5 sm:px-1 max-sm:text-center text-foreground-secondary text-xs sticky left-0 z-20 bg-white/60 dark:bg-black/60 backdrop-blur-md border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">主星</td>
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
                        <td className="py-2 px-0.5 sm:px-1 max-sm:text-center text-foreground-secondary text-xs sticky left-0 z-20 bg-white/60 dark:bg-black/60 backdrop-blur-md border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">天干</td>
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
                                    style={{ color: col.hidden ? undefined : getElementColor(col.pillar.stemElement) }}
                                >
                                    {col.hidden ? '*' : col.pillar.stem}
                                </span>
                            </td>
                        ))}
                    </tr>
                    {/* 地支行 */}
                    <tr className="border-b border-border/50">
                        <td className="py-2 px-0.5 sm:px-1 max-sm:text-center text-foreground-secondary text-xs sticky left-0 z-20 bg-white/60 dark:bg-black/60 backdrop-blur-md border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">地支</td>
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
                                    style={{ color: col.hidden ? undefined : getElementColor(col.pillar.branchElement) }}
                                >
                                    {col.hidden ? '*' : col.pillar.branch}
                                </span>
                            </td>
                        ))}
                    </tr>
                    {/* 藏干行 */}
                    <tr className="border-b border-border/50">
                        <td className="py-2 px-0.5 sm:px-1 max-sm:text-center text-foreground-secondary text-xs sticky left-0 z-20 bg-white/60 dark:bg-black/60 backdrop-blur-md border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">藏干</td>
                        {/* 运势柱的藏干 */}
                        {fortuneColumns.map((col) => (
                            <td key={col.key} className="py-2 px-0.5 sm:px-1 text-center">
                                <div className="flex flex-col items-center gap-0.5">
                                    {col.hiddenStems.map((stem, idx) => {
                                        const element = STEM_ELEMENTS[stem];
                                        const shiShen = col.shiShenZhi[idx] || '';
                                        return (
                                            <div key={idx} className="flex items-center gap-0.5">
                                                <span
                                                    className="text-xs font-medium"
                                                    style={{ color: element ? getElementColor(element) : undefined }}
                                                >
                                                    {stem}
                                                </span>
                                                <span className="text-xs text-foreground-secondary">
                                                    {shiShen}
                                                </span>
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
                                        {col.pillar.hiddenStems.map((stem, idx) => {
                                            const element = STEM_ELEMENTS[stem as HeavenlyStem];
                                            const shiShen = col.shiShenZhi[idx] || '';
                                            return (
                                                <div key={idx} className="flex items-center gap-0.5">
                                                    <span
                                                        className="text-xs font-medium"
                                                        style={{ color: element ? getElementColor(element) : undefined }}
                                                    >
                                                        {stem}
                                                    </span>
                                                    <span className="text-xs text-foreground-secondary">
                                                        {shiShen}
                                                    </span>
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
                        <td className="py-2 px-0.5 sm:px-1 max-sm:text-center text-foreground-secondary text-xs sticky left-0 z-20 bg-white/60 dark:bg-black/60 backdrop-blur-md border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">星运</td>
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
                                    {col.hidden ? '?' : col.diShi}
                                </td>
                            ))
                        }
                    </tr>
                    {/* 纳音行 */}
                    <tr className="border-b border-border/50">
                        <td className="py-2 px-0.5 sm:px-1 max-sm:text-center text-foreground-secondary text-xs sticky left-0 z-20 bg-white/60 dark:bg-black/60 backdrop-blur-md border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">纳音</td>
                        {fortuneColumns.map((col) => (
                            <td key={col.key} className="py-2 px-0.5 sm:px-1 text-center text-xs text-foreground-secondary/70">
                                {col.naYin}
                            </td>
                        ))}
                        {columns.map((col, idx) => (
                            <td key={col.key} className={`py-2 px-0.5 sm:px-1 text-center text-xs text-foreground-secondary ${col.hidden ? 'opacity-40' : ''} ${idx === 0 && hasFortuneColumns ? 'border-l border-border' : ''}`}>
                                {col.hidden ? '?' : col.naYin}
                            </td>
                        ))}
                    </tr>
                    {/* 神煞星行 */}
                    {hasShenSha && (
                        <tr>
                            <td className="py-2 px-0.5 sm:px-1 text-center text-foreground-secondary text-xs sticky left-0 z-20 bg-white/60 dark:bg-black/60 backdrop-blur-md border-r border-border shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
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
                                    ) : col.shenSha.length > 0 ? (
                                        <div className="flex flex-col items-center gap-0.5">
                                            {/* 默认只显示第一个神煞 */}
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
                                            {/* 如果未展开且有多个，显示数量提示 */}
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
