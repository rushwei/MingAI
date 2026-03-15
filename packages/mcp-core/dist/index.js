/**
 * MCP Core 主入口
 */
import { tools } from './tools.js';
import { handleBaziCalculate, handleBaziPillarsResolve, handleZiweiCalculate, handleZiweiHoroscope, handleZiweiFlyingStar, handleLiuyaoAnalyze, handleTarotDraw, handleDailyFortune, handleDayunCalculate, handleQimenCalculate, handleDaliurenCalculate, } from './handlers/index.js';
export { tools } from './tools.js';
export { formatAsMarkdown } from './formatters.js';
export * from './types.js';
export { handleBaziCalculate, handleBaziPillarsResolve, handleZiweiCalculate, handleZiweiHoroscope, handleZiweiFlyingStar, handleLiuyaoAnalyze, handleTarotDraw, handleDailyFortune, handleDayunCalculate, handleQimenCalculate, handleDaliurenCalculate, };
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
        case 'ziwei_horoscope':
            return handleZiweiHoroscope(args);
        case 'ziwei_flying_star':
            return handleZiweiFlyingStar(args);
        case 'liuyao_analyze':
        case 'liuyao':
            return handleLiuyaoAnalyze(args);
        case 'tarot_draw':
        case 'tarot':
            return handleTarotDraw(args);
        case 'daily_fortune':
        case 'almanac':
            return handleDailyFortune(args);
        case 'dayun_calculate':
        case 'bazi_dayun':
            return handleDayunCalculate(args);
        case 'qimen_calculate':
            return handleQimenCalculate(args);
        case 'daliuren':
            return handleDaliurenCalculate(args);
        default:
            const availableTools = tools.map((t) => t.name).join(', ');
            throw new Error(`未知工具: ${name}。可用的工具: ${availableTools}`);
    }
}
