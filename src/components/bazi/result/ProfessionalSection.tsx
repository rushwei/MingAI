import { Calendar, TrendingUp } from 'lucide-react';
import { calculateBazi, calculateProfessionalData, type DaYunInfo, type LiuNianInfo, type LiuYueInfo, type LiuRiInfo, type ShenShaInfo } from '@/lib/divination/bazi';
import type { Gender } from '@/types';
import { DaYunTable } from '@/components/bazi/result/DaYunTable';
import { LiuNianTable } from '@/components/bazi/result/LiuNianTable';
import { LiuYueTable } from '@/components/bazi/result/LiuYueTable';
import { LiuRiTable } from '@/components/bazi/result/LiuRiTable';
import { ProfessionalTable } from '@/components/bazi/result/ProfessionalTable';
import { DiZhiRelations } from '@/components/bazi/result/DiZhiRelations';

export function ProfessionalSection({
    baziResult,
    proData,
    gender,
    isUnknownTime = false,
    selectedDaYunIndex,
    onSelectDaYun,
    currentLiuNian,
    selectedLiuNianYear,
    onSelectLiuNian,
    liuYue,
    selectedLiuYueMonth,
    onSelectLiuYue,
    liuRi,
    selectedLiuRiDate,
    onSelectLiuRi,
    activeLiuYue,
    shenSha,
}: {
    baziResult: ReturnType<typeof calculateBazi>;
    proData: ReturnType<typeof calculateProfessionalData>;
    gender: Gender;
    isUnknownTime?: boolean;
    selectedDaYunIndex: number;
    onSelectDaYun: (index: number) => void;
    currentLiuNian: LiuNianInfo[];
    selectedLiuNianYear: number;
    onSelectLiuNian: (year: number) => void;
    liuYue: LiuYueInfo[];
    selectedLiuYueMonth: number;
    onSelectLiuYue: (month: number) => void;
    liuRi: LiuRiInfo[];
    selectedLiuRiDate: string;
    onSelectLiuRi: (date: string) => void;
    activeLiuYue: LiuYueInfo | null;
    shenSha?: ShenShaInfo;
}) {
    // 获取当前选中的运势信息
    const activeDaYun: DaYunInfo | undefined = proData.daYun[selectedDaYunIndex];
    const activeLiuNian: LiuNianInfo | undefined = currentLiuNian.find(ln => ln.year === selectedLiuNianYear);
    const activeLiuRi: LiuRiInfo | undefined = liuRi.find(lr => lr.date === selectedLiuRiDate);

    return (
        <div className="sm:space-y-4 space-y-1">
            <section className="bg-background rounded-xl md:p-4 p-1 border border-border overflow-x-hidden w-full mx-auto sm:max-w-none">
                <h2 className="text-base font-semibold mb-3">四柱详解</h2>
                <ProfessionalTable
                    baziResult={baziResult}
                    proData={proData}
                    gender={gender}
                    isUnknownTime={isUnknownTime}
                    pillarShenSha={shenSha?.pillarShenSha}
                    // 运势信息
                    activeDaYun={activeDaYun}
                    activeLiuNian={activeLiuNian}
                    activeLiuYue={activeLiuYue ?? undefined}
                    activeLiuRi={activeLiuRi}
                />
                <div className="mt-1 sm:mt-3 sm:pt-3 border-t border-border sm:text-sm text-xs text-foreground-secondary">
                    起运：{proData.startAgeDetail}
                </div>
            </section>

            <section className="bg-background rounded-xl md:p-4 p-1 max-w-[390px] mx-auto sm:max-w-none">
                <h2 className="text-base font-semibold sm:mb-3 mb-1 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-accent" />
                    大运（每运10年）
                </h2>
                <DaYunTable
                    daYun={proData.daYun}
                    selectedIndex={selectedDaYunIndex}
                    onSelect={onSelectDaYun}
                />
            </section>

            {currentLiuNian.length > 0 && (
                <section className="bg-background rounded-xl md:p-4 p-1 max-w-[390px] mx-auto sm:max-w-none">
                    <h2 className="text-base font-semibold sm:mb-3 mb-1 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-accent" />
                        流年
                    </h2>
                    <LiuNianTable
                        liuNian={currentLiuNian}
                        selectedYear={selectedLiuNianYear}
                        onSelect={onSelectLiuNian}
                    />
                </section>
            )}

            {liuYue.length > 0 && (
                <section className="bg-background rounded-xl md:p-4 p-1 max-w-[390px] mx-auto sm:max-w-none">
                    <h2 className="text-base font-semibold sm:mb-3 mb-1 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-accent" />
                        {selectedLiuNianYear}年流月
                    </h2>
                    <LiuYueTable
                        liuYue={liuYue}
                        selectedMonth={selectedLiuYueMonth}
                        onSelect={onSelectLiuYue}
                    />
                    <p className="mt-2 text-xs text-foreground-secondary">
                        点击流月可查看对应的流日
                    </p>
                </section>
            )}

            {liuRi.length > 0 && activeLiuYue && (
                <section className="bg-background rounded-xl md:p-4 p-1 max-w-[390px] mx-auto sm:max-w-none">
                    <h2 className="text-base font-semibold sm:mb-3 mb-1 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-accent" />
                        流日（{activeLiuYue.startDate} ~ {activeLiuYue.endDate}）
                    </h2>
                    <LiuRiTable
                        liuRi={liuRi}
                        selectedDate={selectedLiuRiDate}
                        onSelect={onSelectLiuRi}
                    />
                </section>
            )}

            {/* 地支关系 */}
            <DiZhiRelations
                yearBranch={baziResult.fourPillars.year.branch}
                monthBranch={baziResult.fourPillars.month.branch}
                dayBranch={baziResult.fourPillars.day.branch}
                hourBranch={baziResult.fourPillars.hour.branch}
                isUnknownTime={isUnknownTime}
            />
        </div>
    );
}
