import type { DaliurenOutput } from '@mingai/core/daliuren';
import { renderDaliurenCanonicalText } from '@mingai/core/text';
import { resolveChartTextDetailLevel, type ChartTextDetailLevel } from '@/lib/divination/detail-level';

export function generateDaliurenResultText(result: DaliurenOutput, options: { detailLevel?: ChartTextDetailLevel } = {}): string {
    return renderDaliurenCanonicalText(result, {
        detailLevel: resolveChartTextDetailLevel('daliuren', options.detailLevel),
    });
}
