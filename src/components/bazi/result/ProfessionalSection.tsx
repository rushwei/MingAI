import { Calendar, TrendingUp, Sparkles } from 'lucide-react';
import type { BaziCanonicalJSON } from '@mingai/core/json';
import { calculateProfessionalData, type DaYunInfo, type LiuNianInfo, type LiuYueInfo, type LiuRiInfo } from '@/lib/divination/bazi';
import { DaYunTable } from '@/components/bazi/result/DaYunTable';
import { LiuNianTable } from '@/components/bazi/result/LiuNianTable';
import { LiuYueTable } from '@/components/bazi/result/LiuYueTable';
import { LiuRiTable } from '@/components/bazi/result/LiuRiTable';
import { ProfessionalTable } from '@/components/bazi/result/ProfessionalTable';

export function ProfessionalSection({
    canonicalChart,
    proData,
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
}: {
    canonicalChart: BaziCanonicalJSON;
    proData: ReturnType<typeof calculateProfessionalData>;
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
}) {
    // 获取当前选中的运势信息
    const activeDaYun: DaYunInfo | undefined = proData.daYun[selectedDaYunIndex];
    const activeLiuNian: LiuNianInfo | undefined = currentLiuNian.find(ln => ln.year === selectedLiuNianYear);
    const activeLiuRi: LiuRiInfo | undefined = liuRi.find(lr => lr.date === selectedLiuRiDate);
    const chartMetadata = [
        canonicalChart.basicInfo.trueSolarTime
            ? {
                label: '真太阳时',
                value: `${canonicalChart.basicInfo.trueSolarTime.trueSolarTime}（钟表 ${canonicalChart.basicInfo.trueSolarTime.clockTime}）`,
            }
            : null,
        canonicalChart.basicInfo.taiYuan ? { label: '胎元', value: canonicalChart.basicInfo.taiYuan } : null,
        canonicalChart.basicInfo.mingGong ? { label: '命宫', value: canonicalChart.basicInfo.mingGong } : null,
    ].filter((item): item is { label: string; value: string } => Boolean(item));
    const relationHighlights = isUnknownTime ? [] : canonicalChart.relations;
    const hasGanZhiHighlights = relationHighlights.length > 0;

    return (
        <div className="sm:space-y-4 space-y-1">
            <section className="bg-background rounded-xl md:p-4 p-1 border border-border overflow-x-hidden w-full mx-auto sm:max-w-none">
                <h2 className="text-base font-semibold mb-3">四柱详解</h2>
                {(chartMetadata.length > 0 || hasGanZhiHighlights) && (
                    <div className="mb-3 rounded-xl border border-border bg-background-secondary/40 p-3 space-y-3">
                        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                            <Sparkles className="w-4 h-4 text-accent" />
                            排盘元信息
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <div className="rounded-lg border border-border bg-background px-3 py-2">
                                <div className="text-xs text-foreground-secondary mb-1">命主五行</div>
                                <div className="font-medium">
                                    {canonicalChart.basicInfo.dayMasterElement}
                                </div>
                            </div>
                            {chartMetadata.map((item) => (
                                <div key={item.label} className="rounded-lg border border-border bg-background px-3 py-2">
                                    <div className="text-xs text-foreground-secondary mb-1">{item.label}</div>
                                    <div className="font-medium">{item.value}</div>
                                </div>
                            ))}
                        </div>
                        {hasGanZhiHighlights ? (
                            <div className="rounded-lg border border-border bg-background px-3 py-2">
                                <div className="text-xs text-foreground-secondary mb-1">干支关系</div>
                                <div className="flex flex-wrap gap-2">
                                    {relationHighlights.map((item, index) => (
                                        <span key={`${item}-${index}`} className="rounded-full bg-emerald-500/10 px-2 py-1 text-xs text-emerald-500">
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}
                <ProfessionalTable
                    canonicalChart={canonicalChart}
                    isUnknownTime={isUnknownTime}
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

        </div>
    );
}
