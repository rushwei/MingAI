/**
 * MCP Core 主入口
 */
export { tools } from './tools.js';
export { formatAsMarkdown } from './formatters.js';
export type { ToolDefinition, ToolInput, ToolAnnotation } from './tools.js';
export * from './types.js';
export { handleBaziCalculate, handleBaziPillarsResolve, handleZiweiCalculate, handleLiuyaoAnalyze, handleTarotDraw, handleDailyFortune, handleDayunCalculate, } from './handlers/index.js';
/**
 * 统一工具调用分发（消除 mcp-server / mcp-local 重复 switch）
 * 支持 responseFormat 参数：json 或 markdown
 */
export declare function handleToolCall(name: string, args: any): Promise<unknown>;
//# sourceMappingURL=index.d.ts.map