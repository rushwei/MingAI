import { Calendar, TrendingUp } from 'lucide-react';
import { calculateBazi, calculateProfessionalData, type LiuNianInfo, type LiuYueInfo, type LiuRiInfo, type ShenShaInfo } from '@/lib/bazi';
import type { Gender } from '@/types';
import { DaYunTable } from './DaYunTable';
import { LiuNianTable } from './LiuNianTable';
import { LiuYueTable } from './LiuYueTable';
import { LiuRiTable } from './LiuRiTable';
import { ProfessionalTable } from './ProfessionalTable';

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
    return (
        <div className="space-y-4">
            <section className="bg-background-secondary rounded-xl p-4 border border-border">
                <h2 className="text-base font-semibold mb-3">四柱详解</h2>
                <ProfessionalTable
                    baziResult={baziResult}
                    proData={proData}
                    gender={gender}
                    isUnknownTime={isUnknownTime}
                    pillarShenSha={shenSha?.pillarShenSha}
                />
                <div className="mt-3 pt-3 border-t border-border text-sm text-foreground-secondary">
                    起运：{proData.startAgeDetail}
                </div>
            </section>

            <section className="bg-background-secondary rounded-xl p-4 border border-border">
                <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
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
                <section className="bg-background-secondary rounded-xl p-4 border border-border">
                    <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
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
                <section className="bg-background-secondary rounded-xl p-4 border border-border">
                    <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
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
                <section className="bg-background-secondary rounded-xl p-4 border border-border">
                    <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
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
        </div>
    );
}
