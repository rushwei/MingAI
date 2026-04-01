import type { BaziChart } from '@/types';
import { calculateBazi, generateBaziChartText } from '@/lib/divination/bazi';
import { formatBaziCaseProfileForAI, type BaziCaseProfile } from '@/lib/bazi-case-profile';
import { extractLongitudeFromChartData } from '@/lib/divination/place-resolution';
import { resolveChartTextDetailLevel, type ChartTextDetailLevel } from '@/lib/divination/detail-level';

export type BaziPromptInput = Partial<Omit<BaziChart, 'id' | 'createdAt' | 'userId' | 'gender'>> & {
    id?: string;
    name?: string;
    gender?: BaziChart['gender'] | string;
    birthDate?: string;
    birthTime?: string;
    birthPlace?: string;
    calendarType?: BaziChart['calendarType'];
    isLeapMonth?: boolean;
    chartData?: Record<string, unknown>;
};

export function hasCompletePillarDetails(chart: Omit<BaziChart, 'id' | 'createdAt' | 'userId'>): boolean {
    return [chart.fourPillars.year, chart.fourPillars.month, chart.fourPillars.day, chart.fourPillars.hour].every((pillar) => {
        if (!pillar.hiddenStemDetails?.length) return false;
        if (pillar.hiddenStemDetails.length !== pillar.hiddenStems.length) return false;
        if (!pillar.naYin || !pillar.diShi) return false;
        return pillar.hiddenStemDetails.every((item) => typeof item.tenGod === 'string' && item.tenGod.trim().length > 0);
    });
}

function rebuildBaziChart(chart: BaziPromptInput): Omit<BaziChart, 'id' | 'createdAt' | 'userId'> | null {
    if (!chart.birthDate || !chart.birthTime) return null;
    const [birthYear, birthMonth, birthDay] = chart.birthDate.split('-').map(Number);
    const [birthHour, birthMinute] = chart.birthTime.split(':').map(Number);
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
        return calculateBazi({
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

function resolveBaziChartData(chart?: BaziPromptInput): Omit<BaziChart, 'id' | 'createdAt' | 'userId'> | null {
    if (!chart) return null;
    const chartData = chart.chartData as Omit<BaziChart, 'id' | 'createdAt' | 'userId'> | undefined;
    const mergedInput: BaziPromptInput = {
        ...(chartData as Partial<Omit<BaziChart, 'id' | 'createdAt' | 'userId'>>),
        ...chart,
        chartData: chart.chartData,
        name: chart.name || chartData?.name,
        gender: chart.gender || chartData?.gender,
        birthDate: chart.birthDate || chartData?.birthDate,
        birthTime: chart.birthTime || chartData?.birthTime,
        birthPlace: chart.birthPlace || chartData?.birthPlace,
        calendarType: chart.calendarType || chartData?.calendarType,
        isLeapMonth: chart.isLeapMonth ?? chartData?.isLeapMonth,
    };
    const rebuilt = rebuildBaziChart(mergedInput);
    if (rebuilt) {
        return rebuilt;
    }
    if (chartData?.fourPillars) {
        return chartData;
    }
    if ((chart as Omit<BaziChart, 'id' | 'createdAt' | 'userId'>).fourPillars) {
        return chart as Omit<BaziChart, 'id' | 'createdAt' | 'userId'>;
    }
    return null;
}

function formatBaziFallback(chart: BaziPromptInput): string {
    return [
        '【八字命盘】',
        `姓名：${chart.name || '未命名'}`,
        `出生日期：${chart.birthDate || ''}${chart.birthTime ? ` ${chart.birthTime}` : ''}`,
        '命盘数据不完整，无法重建标准命盘文本。',
    ].filter(Boolean).join('\n');
}

export function formatBaziPromptText(
    chart: BaziPromptInput,
    profile?: Pick<BaziCaseProfile, 'masterReview' | 'ownerFeedback' | 'events'> | null,
    detailLevel?: ChartTextDetailLevel,
): string {
    const resolvedLevel = resolveChartTextDetailLevel('bazi', detailLevel);
    const resolvedChart = resolveBaziChartData(chart);
    const chartText = resolvedChart
        ? generateBaziChartText(resolvedChart, { detailLevel: resolvedLevel })
        : formatBaziFallback(chart);
    const caseText = formatBaziCaseProfileForAI(profile);
    return caseText ? `${chartText}\n\n${caseText}` : chartText;
}
