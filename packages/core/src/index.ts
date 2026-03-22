/**
 * Core 主入口
 */

import { tools } from './tools.js';
import { getToolRegistryEntry } from './tool-registry.js';
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
  handleQimenCalculate,
  handleDaliurenCalculate,
} from './handlers/index.js';

export { tools } from './tools.js';
export { toolRegistry } from './tool-registry.js';
export type { ToolRegistryEntry } from './tool-registry.js';
export { formatAsMarkdown, hasMarkdownFormatter, renderToolResult } from './tool-output.js';
export {
  renderBaziCanonicalText,
  renderDayunCanonicalText,
  renderFortuneCanonicalText,
  renderZiweiCanonicalText,
  renderLiuyaoCanonicalText,
  renderDaliurenCanonicalText,
  renderQimenCanonicalText,
  renderTarotCanonicalText,
} from './text.js';
export type { ZiweiCanonicalTextOptions } from './text.js';
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
  handleQimenCalculate,
  handleDaliurenCalculate,
};

/**
 * 统一工具调用分发（消除 mcp-server / mcp 重复 switch）
 */
export async function handleToolCall(name: string, args: unknown): Promise<unknown> {
  const entry = getToolRegistryEntry(name);
  if (!entry) {
    const availableTools = tools.map((t) => t.name).join(', ');
    throw new Error(`未知工具: ${name}。可用的工具: ${availableTools}`);
  }

  return entry.handler(args);
}
