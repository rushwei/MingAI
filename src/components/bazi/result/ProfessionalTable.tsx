'use client';

import { useState } from 'react';
import {
    calculateBazi,
    calculateProfessionalData,
    getElementColor,
    STEM_ELEMENTS,
    type PillarShenSha,
} from '@/lib/bazi';
import type { Gender, HeavenlyStem } from '@/types';
import { ChevronDown, ChevronUp } from 'lucide-react';

export function ProfessionalTable({
    baziResult,
    proData,
    gender,
    isUnknownTime = false,
    pillarShenSha,
}: {
    baziResult: ReturnType<typeof calculateBazi>;
    proData: ReturnType<typeof calculateProfessionalData>;
    gender: Gender;
    isUnknownTime?: boolean;
    pillarShenSha?: PillarShenSha;
}) {
    const [shenShaExpanded, setShenShaExpanded] = useState(false);

    const columns = [
        { key: 'year', label: '年柱', pillar: baziResult.fourPillars.year, naYin: proData.naYin.year, diShi: proData.diShi.year, shiShen: proData.shiShenGan.year, shiShenZhi: proData.shiShenZhi.year, hidden: false, shenSha: pillarShenSha?.year || [] },
        { key: 'month', label: '月柱', pillar: baziResult.fourPillars.month, naYin: proData.naYin.month, diShi: proData.diShi.month, shiShen: proData.shiShenGan.month, shiShenZhi: proData.shiShenZhi.month, hidden: false, shenSha: pillarShenSha?.month || [] },
        { key: 'day', label: '日柱', pillar: baziResult.fourPillars.day, naYin: proData.naYin.day, diShi: proData.diShi.day, shiShen: gender === 'male' ? '元男' : '元女', shiShenZhi: proData.shiShenZhi.day, hidden: false, shenSha: pillarShenSha?.day || [] },
        { key: 'hour', label: '时柱', pillar: baziResult.fourPillars.hour, naYin: proData.naYin.hour, diShi: proData.diShi.hour, shiShen: proData.shiShenGan.hour, shiShenZhi: proData.shiShenZhi.hour, hidden: isUnknownTime, shenSha: pillarShenSha?.hour || [] },
    ];

    const hasShenSha = columns.some(col => col.shenSha.length > 0);

    return (
        <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full border-collapse text-sm min-w-[320px]">
                <thead>
                    <tr className="border-b border-border">
                        <th className="py-2 px-1 sm:px-2 text-left text-foreground-secondary font-medium w-12 sm:w-16"></th>
                        {columns.map((col) => (
                            <th key={col.key} className="py-2 px-1 sm:px-2 text-center font-medium text-xs sm:text-sm">
                                {col.label}
                                {col.hidden && <span className="text-amber-500 ml-1">*</span>}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    <tr className="border-b border-border/50">
                        <td className="py-2 px-1 sm:px-2 text-foreground-secondary text-xs">主星</td>
                        {columns.map((col) => (
                            <td key={col.key} className={`py-2 px-1 sm:px-2 text-center text-xs ${col.hidden ? 'opacity-40' : ''}`}>
                                {col.hidden ? '?' : col.shiShen}
                            </td>
                        ))}
                    </tr>
                    <tr className="border-b border-border/50">
                        <td className="py-2 px-1 sm:px-2 text-foreground-secondary text-xs">天干</td>
                        {columns.map((col) => (
                            <td key={col.key} className={`py-2 px-1 sm:px-2 text-center ${col.hidden ? 'opacity-40' : ''}`}>
                                <span
                                    className="text-xl sm:text-2xl font-bold"
                                    style={{ color: col.hidden ? undefined : getElementColor(col.pillar.stemElement) }}
                                >
                                    {col.hidden ? '*' : col.pillar.stem}
                                </span>
                            </td>
                        ))}
                    </tr>
                    <tr className="border-b border-border/50">
                        <td className="py-2 px-1 sm:px-2 text-foreground-secondary text-xs">地支</td>
                        {columns.map((col) => (
                            <td key={col.key} className={`py-2 px-1 sm:px-2 text-center ${col.hidden ? 'opacity-40' : ''}`}>
                                <span
                                    className="text-xl sm:text-2xl font-bold"
                                    style={{ color: col.hidden ? undefined : getElementColor(col.pillar.branchElement) }}
                                >
                                    {col.hidden ? '*' : col.pillar.branch}
                                </span>
                            </td>
                        ))}
                    </tr>
                    <tr className="border-b border-border/50">
                        <td className="py-2 px-1 sm:px-2 text-foreground-secondary text-xs">藏干</td>
                        {columns.map((col) => (
                            <td key={col.key} className={`py-2 px-1 sm:px-2 text-center ${col.hidden ? 'opacity-40' : ''}`}>
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
                    <tr className="border-b border-border/50">
                        <td className="py-2 px-1 sm:px-2 text-foreground-secondary text-xs">星运</td>
                        {columns.map((col) => (
                            <td key={col.key} className={`py-2 px-1 sm:px-2 text-center text-xs ${col.hidden ? 'opacity-40' : ''}`}>
                                {col.hidden ? '?' : col.diShi}
                            </td>
                        ))}
                    </tr>
                    <tr className="border-b border-border/50">
                        <td className="py-2 px-1 sm:px-2 text-foreground-secondary text-xs">纳音</td>
                        {columns.map((col) => (
                            <td key={col.key} className={`py-2 px-1 sm:px-2 text-center text-xs text-foreground-secondary ${col.hidden ? 'opacity-40' : ''}`}>
                                {col.hidden ? '?' : col.naYin}
                            </td>
                        ))}
                    </tr>
                    {/* 神煞星行 */}
                    {hasShenSha && (
                        <tr>
                            <td className="py-2 px-1 sm:px-2 text-foreground-secondary text-xs">
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
                            {columns.map((col) => (
                                <td key={col.key} className={`py-2 px-1 sm:px-2 text-center ${col.hidden ? 'opacity-40' : ''}`}>
                                    {col.hidden ? (
                                        <span className="text-xs">?</span>
                                    ) : col.shenSha.length > 0 ? (
                                        <div className="flex flex-col items-center gap-0.5">
                                            {/* 默认只显示第一个神煞 */}
                                            {(shenShaExpanded ? col.shenSha : col.shenSha.slice(0, 1)).map((sha, idx) => (
                                                <span
                                                    key={idx}
                                                    className={`text-xs px-1 py-0.5 rounded whitespace-nowrap ${sha === '羊刃' || sha === '桃花'
                                                            ? 'text-rose-500 bg-rose-500/10'
                                                            : 'text-emerald-500 bg-emerald-500/10'
                                                        }`}
                                                >
                                                    {sha}
                                                </span>
                                            ))}
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
            </table>
            {isUnknownTime && (
                <p className="mt-2 text-xs text-amber-500">
                    * 时辰未知，时柱数据仅供参考
                </p>
            )}
        </div>
    );
}
