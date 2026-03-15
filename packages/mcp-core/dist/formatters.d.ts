/**
 * MCP 响应格式化器 - 将 JSON 结果转换为 Markdown 格式
 */
import type { BaziOutput, BaziPillarsResolveOutput, ZiweiOutput, ZiweiHoroscopeOutput, ZiweiFlyingStarOutput, LiuyaoOutput, TarotOutput, FortuneOutput, DayunOutput, QimenOutput } from './types.js';
/**
 * 格式化八字结果为 Markdown
 */
export declare function formatBaziAsMarkdown(result: BaziOutput): string;
/**
 * 格式化四柱反推结果为 Markdown
 */
export declare function formatBaziPillarsResolveAsMarkdown(result: BaziPillarsResolveOutput): string;
/**
 * 格式化紫微斗数结果为 Markdown
 */
export declare function formatZiweiAsMarkdown(result: ZiweiOutput): string;
/**
 * 格式化紫微运限结果为 Markdown
 */
export declare function formatZiweiHoroscopeAsMarkdown(result: ZiweiHoroscopeOutput): string;
/**
 * 格式化紫微飞星结果为 Markdown
 */
export declare function formatZiweiFlyingStarAsMarkdown(result: ZiweiFlyingStarOutput): string;
/**
 * 格式化六爻结果为 Markdown
 */
export declare function formatLiuyaoAsMarkdown(result: LiuyaoOutput): string;
/**
 * 格式化塔罗结果为 Markdown
 */
export declare function formatTarotAsMarkdown(result: TarotOutput): string;
/**
 * 格式化每日运势为 Markdown
 */
export declare function formatDailyFortuneAsMarkdown(result: FortuneOutput): string;
/**
 * 格式化大运结果为 Markdown
 */
export declare function formatDayunAsMarkdown(result: DayunOutput): string;
/**
 * 格式化奇门遁甲结果为 Markdown
 */
export declare function formatQimenAsMarkdown(result: QimenOutput): string;
/**
 * 根据工具名格式化结果
 */
export declare function formatAsMarkdown(toolName: string, result: unknown): string;
//# sourceMappingURL=formatters.d.ts.map