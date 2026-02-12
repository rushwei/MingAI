/**
 * MCP Core 主入口
 */
export { tools } from './tools.js';
export * from './types.js';
export { handleBaziCalculate, handleBaziPillarsResolve, handleZiweiCalculate, handleLiuyaoAnalyze, handleTarotDraw, handleDailyFortune, handleLiunianAnalyze, } from './handlers/index.js';
import { handleBaziCalculate, handleBaziPillarsResolve, handleZiweiCalculate, handleLiuyaoAnalyze, handleTarotDraw, handleDailyFortune, handleLiunianAnalyze, } from './handlers/index.js';
/**
 * 统一工具调用分发（消除 mcp-server / mcp-local 重复 switch）
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleToolCall(name, args) {
    switch (name) {
        case 'bazi_calculate':
            return handleBaziCalculate(args);
        case 'bazi_pillars_resolve':
            return handleBaziPillarsResolve(args);
        case 'ziwei_calculate':
            return handleZiweiCalculate(args);
        case 'liuyao_analyze':
            return handleLiuyaoAnalyze(args);
        case 'tarot_draw':
            return handleTarotDraw(args);
        case 'daily_fortune':
            return handleDailyFortune(args);
        case 'liunian_analyze':
            return handleLiunianAnalyze(args);
        default:
            throw new Error(`Unknown tool: ${name}`);
    }
}
