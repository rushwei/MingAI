/**
 * Core 主入口
 */
import { handleBaziCalculate, handleBaziPillarsResolve, handleZiweiCalculate, handleZiweiHoroscope, handleZiweiFlyingStar, handleLiuyaoAnalyze, handleTarotDraw, handleDailyFortune, handleDayunCalculate, handleQimenCalculate, handleDaliurenCalculate } from './handlers/index.js';
export { tools } from './tools.js';
export { toolRegistry } from './tool-registry.js';
export type { ToolRegistryEntry } from './tool-registry.js';
export { formatAsMarkdown, hasMarkdownFormatter, renderToolResult } from './tool-output.js';
export type { ToolDefinition, ToolInput, ToolAnnotation } from './tools.js';
export * from './types.js';
export { handleBaziCalculate, handleBaziPillarsResolve, handleZiweiCalculate, handleZiweiHoroscope, handleZiweiFlyingStar, handleLiuyaoAnalyze, handleTarotDraw, handleDailyFortune, handleDayunCalculate, handleQimenCalculate, handleDaliurenCalculate, };
/**
 * 统一工具调用分发（消除 mcp-server / mcp 重复 switch）
 */
export declare function handleToolCall(name: string, args: any): Promise<unknown>;
//# sourceMappingURL=index.d.ts.map