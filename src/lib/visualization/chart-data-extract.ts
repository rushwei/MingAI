/**
 * 从 Markdown 文本中提取 ```chart 代码块的 JSON 数据
 *
 * AI 回复中的图表数据以 ```chart ... ``` 格式嵌入。
 * 此工具函数提取并解析这些 JSON 块，用于图表数据复用。
 */

import type { ChartData, ChartType } from '@/lib/visualization/chart-types';

const CHART_BLOCK_REGEX = /```chart\s*\n([\s\S]*?)```/g;

export interface ExtractedChart {
    chartType: ChartType;
    title: string;
    raw: ChartData;
}

/**
 * 从 markdown 文本中提取所有 chart 块并解析为 ChartData。
 * 无效 JSON 会被静默跳过。
 */
export function extractChartBlocks(markdown: string): ExtractedChart[] {
    const results: ExtractedChart[] = [];
    let match: RegExpExecArray | null;

    // Reset regex state
    CHART_BLOCK_REGEX.lastIndex = 0;

    while ((match = CHART_BLOCK_REGEX.exec(markdown)) !== null) {
        const jsonStr = match[1]?.trim();
        if (!jsonStr) continue;

        try {
            const parsed = JSON.parse(jsonStr) as ChartData;
            if (parsed && typeof parsed.chartType === 'string' && typeof parsed.title === 'string') {
                results.push({
                    chartType: parsed.chartType,
                    title: parsed.title,
                    raw: parsed,
                });
            }
        } catch {
            // Skip malformed chart blocks
        }
    }

    return results;
}

/**
 * 从对话 messages 数组中提取所有 AI 回复里的 chart 数据。
 * 返回去重后的图表列表（按 chartType + title 去重，保留最新的）。
 */
export function extractChartsFromMessages(
    messages: Array<{ role: string; content: string }>,
): ExtractedChart[] {
    const seen = new Map<string, ExtractedChart>();

    for (const msg of messages) {
        if (msg.role !== 'assistant') continue;
        const charts = extractChartBlocks(msg.content);
        for (const chart of charts) {
            // Later messages override earlier ones for the same chart type + title
            seen.set(`${chart.chartType}:${chart.title}`, chart);
        }
    }

    return Array.from(seen.values());
}

/**
 * 将提取的图表数据格式化为可注入 AI prompt 的参考文本。
 * 用于在对话中引用之前生成的图表，避免 AI 重复生成。
 */
export function formatPreviousChartsForPrompt(charts: ExtractedChart[], maxCharts = 3): string {
    if (charts.length === 0) return '';

    const selected = charts.slice(-maxCharts);
    const lines = selected.map((chart) => {
        return `- ${chart.title} (${chart.chartType})`;
    });

    return [
        '用户之前的分析中已生成以下图表，如果与当前问题相关，可以参考或更新其中的数据，而不必从头生成：',
        ...lines,
    ].join('\n');
}
