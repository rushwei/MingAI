import {
    calculateBazi,
    calculateProfessionalData,
    getElementColor,
    STEM_ELEMENTS,
} from '@/lib/bazi';
import type { Gender, HeavenlyStem } from '@/types';

export function ProfessionalTable({
    baziResult,
    proData,
    gender,
}: {
    baziResult: ReturnType<typeof calculateBazi>;
    proData: ReturnType<typeof calculateProfessionalData>;
    gender: Gender;
}) {
    const columns = [
        { label: '年柱', pillar: baziResult.fourPillars.year, naYin: proData.naYin.year, diShi: proData.diShi.year, shiShen: proData.shiShenGan.year, shiShenZhi: proData.shiShenZhi.year },
        { label: '月柱', pillar: baziResult.fourPillars.month, naYin: proData.naYin.month, diShi: proData.diShi.month, shiShen: proData.shiShenGan.month, shiShenZhi: proData.shiShenZhi.month },
        { label: '日柱', pillar: baziResult.fourPillars.day, naYin: proData.naYin.day, diShi: proData.diShi.day, shiShen: gender === 'male' ? '元男' : '元女', shiShenZhi: proData.shiShenZhi.day },
        { label: '时柱', pillar: baziResult.fourPillars.hour, naYin: proData.naYin.hour, diShi: proData.diShi.hour, shiShen: proData.shiShenGan.hour, shiShenZhi: proData.shiShenZhi.hour },
    ];

    return (
        <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full border-collapse text-sm min-w-[320px]">
                <thead>
                    <tr className="border-b border-border">
                        <th className="py-2 px-1 sm:px-2 text-left text-foreground-secondary font-medium w-12 sm:w-16"></th>
                        {columns.map((col) => (
                            <th key={col.label} className="py-2 px-1 sm:px-2 text-center font-medium text-xs sm:text-sm">
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    <tr className="border-b border-border/50">
                        <td className="py-2 px-1 sm:px-2 text-foreground-secondary text-xs">主星</td>
                        {columns.map((col) => (
                            <td key={col.label} className="py-2 px-1 sm:px-2 text-center text-xs">
                                {col.shiShen}
                            </td>
                        ))}
                    </tr>
                    <tr className="border-b border-border/50">
                        <td className="py-2 px-1 sm:px-2 text-foreground-secondary text-xs">天干</td>
                        {columns.map((col) => (
                            <td key={col.label} className="py-2 px-1 sm:px-2 text-center">
                                <span
                                    className="text-xl sm:text-2xl font-bold"
                                    style={{ color: getElementColor(col.pillar.stemElement) }}
                                >
                                    {col.pillar.stem}
                                </span>
                            </td>
                        ))}
                    </tr>
                    <tr className="border-b border-border/50">
                        <td className="py-2 px-1 sm:px-2 text-foreground-secondary text-xs">地支</td>
                        {columns.map((col) => (
                            <td key={col.label} className="py-2 px-1 sm:px-2 text-center">
                                <span
                                    className="text-xl sm:text-2xl font-bold"
                                    style={{ color: getElementColor(col.pillar.branchElement) }}
                                >
                                    {col.pillar.branch}
                                </span>
                            </td>
                        ))}
                    </tr>
                    <tr className="border-b border-border/50">
                        <td className="py-2 px-1 sm:px-2 text-foreground-secondary text-xs">藏干</td>
                        {columns.map((col) => (
                            <td key={col.label} className="py-2 px-1 sm:px-2 text-center">
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
                            </td>
                        ))}
                    </tr>
                    <tr className="border-b border-border/50">
                        <td className="py-2 px-1 sm:px-2 text-foreground-secondary text-xs">星运</td>
                        {columns.map((col) => (
                            <td key={col.label} className="py-2 px-1 sm:px-2 text-center text-xs">
                                {col.diShi}
                            </td>
                        ))}
                    </tr>
                    <tr>
                        <td className="py-2 px-1 sm:px-2 text-foreground-secondary text-xs">纳音</td>
                        {columns.map((col) => (
                            <td key={col.label} className="py-2 px-1 sm:px-2 text-center text-xs text-foreground-secondary">
                                {col.naYin}
                            </td>
                        ))}
                    </tr>
                </tbody>
            </table>
        </div>
    );
}
