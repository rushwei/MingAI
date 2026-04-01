import { calculateZiwei, generateZiweiChartText, type ZiweiChart, type ZiweiFormData } from '@/lib/divination/ziwei';
import { extractLongitudeFromChartData } from '@/lib/divination/place-resolution';
import { resolveChartTextDetailLevel, type ChartTextDetailLevel } from '@/lib/divination/detail-level';

export type ZiweiPromptInput = Partial<ZiweiChart> & {
    id?: string;
    name?: string;
    gender?: ZiweiFormData['gender'] | string;
    birthDate?: string;
    birthTime?: string;
    birthPlace?: string;
    calendarType?: ZiweiFormData['calendarType'];
    isLeapMonth?: boolean;
    chartData?: Record<string, unknown>;
};

function rebuildZiweiChart(chart: ZiweiPromptInput): ZiweiChart | null {
    const birthDate = chart.birthDate || (chart.chartData as Record<string, unknown> | undefined)?.solarDate as string | undefined;
    const birthTime = chart.birthTime || chart.time;
    if (!birthDate || !birthTime) return null;

    const [birthYear, birthMonth, birthDay] = birthDate.split('-').map(Number);
    const [birthHour, birthMinute] = birthTime.split(':').map(Number);
    if (
        !Number.isFinite(birthYear)
        || !Number.isFinite(birthMonth)
        || !Number.isFinite(birthDay)
        || !Number.isFinite(birthHour)
        || !Number.isFinite(birthMinute)
    ) {
        return null;
    }

    try {
        return calculateZiwei({
            name: chart.name || '未命名',
            gender: chart.gender === 'female' ? 'female' : 'male',
            birthYear,
            birthMonth,
            birthDay,
            birthHour,
            birthMinute,
            birthPlace: chart.birthPlace,
            longitude: extractLongitudeFromChartData(chart.chartData),
            calendarType: chart.calendarType === 'lunar' ? 'lunar' : 'solar',
            isLeapMonth: chart.isLeapMonth ?? false,
        });
    } catch {
        return null;
    }
}

export function resolveZiweiPromptData(chart?: ZiweiPromptInput): ZiweiChart | null {
    if (!chart) return null;
    const chartData = chart.chartData as ZiweiChart | undefined;
    const mergedInput: ZiweiPromptInput = {
        ...(chartData as Partial<ZiweiChart>),
        ...chart,
        chartData: chart.chartData,
    };

    const rebuilt = rebuildZiweiChart(mergedInput);
    if (rebuilt) return rebuilt;

    if (chartData?.palaces) return chartData;
    if ((chart as ZiweiChart).palaces) return chart as ZiweiChart;
    return null;
}

export function formatZiweiPromptText(chart?: ZiweiPromptInput, detailLevel?: ChartTextDetailLevel): string {
    const resolved = resolveZiweiPromptData(chart);
    if (!resolved) return '';
    return generateZiweiChartText(resolved, { detailLevel: resolveChartTextDetailLevel('ziwei', detailLevel) });
}
