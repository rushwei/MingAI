/**
 * MCP Core 主入口
 */
export { tools } from './tools.js';
export type { ToolDefinition, ToolInput } from './tools.js';
export * from './types.js';
export { handleBaziCalculate, handleBaziPillarsResolve, handleZiweiCalculate, handleLiuyaoAnalyze, handleTarotDraw, handleDailyFortune, handleDayunCalculate, } from './handlers/index.js';
/**
 * 统一工具调用分发（消除 mcp-server / mcp-local 重复 switch）
 */
export declare function handleToolCall(name: string, args: any): Promise<unknown>;
//# sourceMappingURL=index.d.ts.map