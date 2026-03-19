import type { BaziChart } from '@/types';
import { generateBaziChartText } from '@/lib/divination/bazi';
import { formatBaziCaseProfileForAI, type BaziCaseProfile } from '@/lib/bazi-case-profile';

export type BaziChartPromptInput = Partial<Omit<BaziChart, 'id' | 'createdAt' | 'userId' | 'gender'>> & {
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

function resolveBaziChartData(chart?: BaziChartPromptInput): Omit<BaziChart, 'id' | 'createdAt' | 'userId'> | null {
    if (!chart) return null;
    const chartData = chart.chartData as Omit<BaziChart, 'id' | 'createdAt' | 'userId'> | undefined;
    if (chartData?.fourPillars) return chartData;
    if ((chart as Omit<BaziChart, 'id' | 'createdAt' | 'userId'>).fourPillars) {
        return chart as Omit<BaziChart, 'id' | 'createdAt' | 'userId'>;
    }
    return null;
}

function formatBaziFallback(chart: BaziChartPromptInput): string {
    const gender = chart.gender === 'male' ? '男' : chart.gender === 'female' ? '女' : (chart.gender || '');
    return [
        '【八字命盘】',
        `姓名：${chart.name || ''}`,
        `性别：${gender}`,
        `出生日期：${chart.birthDate || ''}${chart.birthTime ? ` ${chart.birthTime}` : ''}`,
    ].filter(Boolean).join('\n');
}

export function formatBaziChartPromptBlock(
    chart: BaziChartPromptInput,
    profile?: Pick<BaziCaseProfile, 'masterReview' | 'ownerFeedback' | 'events'> | null,
): string {
    const resolvedChart = resolveBaziChartData(chart);
    const chartText = resolvedChart
        ? generateBaziChartText(resolvedChart)
        : formatBaziFallback(chart);
    const caseText = formatBaziCaseProfileForAI(profile);
    return caseText ? `${chartText}\n\n${caseText}` : chartText;
}
