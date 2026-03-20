/**
 * 紫微斗数命盘转文字
 * 
 * 将紫微命盘转换为可读的文字格式，用于AI分析
 */

import { generateZiweiChartText, type ZiweiChart } from './ziwei';

/**
 * 将完整紫微命盘转为文字
 * 
 * @param chart 紫微命盘数据
 * @param includeHoroscope 是否包含运限信息（默认true）
 * @returns 格式化的文字描述
 */
export function ziweiChartToText(chart: ZiweiChart, includeHoroscope: boolean = true): string {
    return generateZiweiChartText(chart, { includeHoroscope });
}

/**
 * 生成紫微命盘的简要摘要（用于对话上下文）
 */
export function ziweiChartSummary(chart: ZiweiChart): string {
    const lifePalace = chart.palaces.find(p => p.name === '命宫');
    const lifeStars = lifePalace?.majorStars.map(s => s.name).join('、') || '无主星';

    return `紫微命盘：${chart.fiveElement}，命宫主星${lifeStars}，命主${chart.soul}，身主${chart.body}`;
}
