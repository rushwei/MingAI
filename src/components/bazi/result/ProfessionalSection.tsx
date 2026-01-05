import { Calendar, TrendingUp } from 'lucide-react';
import { calculateBazi, calculateProfessionalData, type LiuNianInfo, type LiuYueInfo } from '@/lib/bazi';
import type { Gender } from '@/types';
import { DaYunTable } from './DaYunTable';
import { LiuNianTable } from './LiuNianTable';
import { LiuYueTable } from './LiuYueTable';
import { ProfessionalTable } from './ProfessionalTable';

export function ProfessionalSection({
    baziResult,
    proData,
    gender,
    selectedDaYunIndex,
    onSelectDaYun,
    currentLiuNian,
    currentYear,
    selectedLiuNianYear,
    onSelectLiuNian,
    liuYue,
    currentMonth,
}: {
    baziResult: ReturnType<typeof calculateBazi>;
    proData: ReturnType<typeof calculateProfessionalData>;
    gender: Gender;
    selectedDaYunIndex: number;
    onSelectDaYun: (index: number) => void;
    currentLiuNian: LiuNianInfo[];
    currentYear: number;
    selectedLiuNianYear: number;
    onSelectLiuNian: (year: number) => void;
    liuYue: LiuYueInfo[];
    currentMonth: number;
}) {
    return (
        <div className="space-y-4">
            <section className="bg-background-secondary rounded-xl p-4 border border-border">
                <h2 className="text-base font-semibold mb-3">四柱详解</h2>
                <ProfessionalTable baziResult={baziResult} proData={proData} gender={gender} />
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
                        currentYear={currentYear}
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
                        currentMonth={selectedLiuNianYear === currentYear ? currentMonth : 0}
                    />
                </section>
            )}
        </div>
    );
}
