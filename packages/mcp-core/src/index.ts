/**
 * MCP Core 主入口
 */

import { tools } from './tools.js';
import {
  handleBaziCalculate,
  handleBaziPillarsResolve,
  handleZiweiCalculate,
  handleZiweiHoroscope,
  handleZiweiFlyingStar,
  handleLiuyaoAnalyze,
  handleTarotDraw,
  handleDailyFortune,
  handleDayunCalculate,
} from './handlers/index.js';

export { tools } from './tools.js';
export { formatAsMarkdown } from './formatters.js';
export type { ToolDefinition, ToolInput, ToolAnnotation } from './tools.js';

export * from './types.js';

export {
  handleBaziCalculate,
  handleBaziPillarsResolve,
  handleZiweiCalculate,
  handleZiweiHoroscope,
  handleZiweiFlyingStar,
  handleLiuyaoAnalyze,
  handleTarotDraw,
  handleDailyFortune,
  handleDayunCalculate,
};

/**
 * 统一工具调用分发（消除 mcp-server / mcp-local 重复 switch）
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleToolCall(name: string, args: any): Promise<unknown> {
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
    case 'liuyao':
      return handleLiuyaoAnalyze(args);
    case 'tarot':
      return handleTarotDraw(args);
    case 'almanac':
      return handleDailyFortune(args);
    case 'bazi_dayun':
      return handleDayunCalculate(args);
    default:
      const availableTools = tools.map((t) => t.name).join(', ');
      throw new Error(`未知工具: ${name}。可用的工具: ${availableTools}`);
  }
}
