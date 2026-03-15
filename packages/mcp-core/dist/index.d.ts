/**
 * MCP Core 主入口
 */
import { handleBaziCalculate, handleBaziPillarsResolve, handleZiweiCalculate, handleZiweiHoroscope, handleZiweiFlyingStar, handleLiuyaoAnalyze, handleTarotDraw, handleDailyFortune, handleDayunCalculate, handleQimenCalculate } from './handlers/index.js';
export { tools } from './tools.js';
export { formatAsMarkdown } from './formatters.js';
export type { ToolDefinition, ToolInput, ToolAnnotation } from './tools.js';
export * from './types.js';
export { handleBaziCalculate, handleBaziPillarsResolve, handleZiweiCalculate, handleZiweiHoroscope, handleZiweiFlyingStar, handleLiuyaoAnalyze, handleTarotDraw, handleDailyFortune, handleDayunCalculate, handleQimenCalculate, };
/**
 * 统一工具调用分发（消除 mcp-server / mcp-local 重复 switch）
 */
export declare function handleToolCall(name: string, args: any): Promise<unknown>;
//# sourceMappingURL=index.d.ts.map