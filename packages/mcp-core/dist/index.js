/**
 * MCP Core 主入口
 */
import { tools } from './tools.js';
import { formatAsMarkdown } from './formatters.js';
export { tools } from './tools.js';
export { formatAsMarkdown } from './formatters.js';
export * from './types.js';
export { handleBaziCalculate, handleBaziPillarsResolve, handleZiweiCalculate, handleLiuyaoAnalyze, handleTarotDraw, handleDailyFortune, handleDayunCalculate, } from './handlers/index.js';
import { handleBaziCalculate, handleBaziPillarsResolve, handleZiweiCalculate, handleLiuyaoAnalyze, handleTarotDraw, handleDailyFortune, handleDayunCalculate, } from './handlers/index.js';
/**
 * 统一工具调用分发（消除 mcp-server / mcp-local 重复 switch）
 * 支持 responseFormat 参数：json 或 markdown
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleToolCall(name, args) {
    // 提取 responseFormat 参数
    const { responseFormat, ...toolArgs } = args || {};
    let result;
    switch (name) {
        case 'bazi_calculate':
            result = await handleBaziCalculate(toolArgs);
            break;
        case 'bazi_pillars_resolve':
            result = await handleBaziPillarsResolve(toolArgs);
            break;
        case 'ziwei_calculate':
            result = await handleZiweiCalculate(toolArgs);
            break;
        case 'liuyao_analyze':
            result = await handleLiuyaoAnalyze(toolArgs);
            break;
        case 'tarot_draw':
            result = await handleTarotDraw(toolArgs);
            break;
        case 'daily_fortune':
            result = await handleDailyFortune(toolArgs);
            break;
        case 'dayun_calculate':
            result = await handleDayunCalculate(toolArgs);
            break;
        default:
            const availableTools = tools.map((t) => t.name).join(', ');
            throw new Error(`未知工具: ${name}。可用的工具: ${availableTools}`);
    }
    // 如果请求 markdown 格式，则转换
    if (responseFormat === 'markdown') {
        return formatAsMarkdown(name, result);
    }
    return result;
}
