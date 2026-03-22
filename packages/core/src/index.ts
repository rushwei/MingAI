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
export { renderToolResult } from './tool-output.js';
export {
  renderBaziCanonicalText,
  renderBaziPillarsResolveCanonicalText,
  renderDayunCanonicalText,
  renderFortuneCanonicalText,
  renderZiweiCanonicalText,
  renderZiweiHoroscopeCanonicalText,
  renderZiweiFlyingStarCanonicalText,
  renderLiuyaoCanonicalText,
  renderDaliurenCanonicalText,
  renderQimenCanonicalText,
  renderTarotCanonicalText,
} from './text.js';
export type { ZiweiCanonicalTextOptions } from './text.js';
export {
  renderBaziCanonicalJSON,
  renderBaziPillarsResolveCanonicalJSON,
  renderDaliurenCanonicalJSON,
  renderDayunCanonicalJSON,
  renderFortuneCanonicalJSON,
  renderLiuyaoCanonicalJSON,
  renderQimenCanonicalJSON,
  renderTarotCanonicalJSON,
  renderZiweiCanonicalJSON,
  renderZiweiHoroscopeCanonicalJSON,
  renderZiweiFlyingStarCanonicalJSON,
} from './json.js';
export type {
  BaziCanonicalJSON,
  BaziPillarJSON,
  BaziPillarsResolveCanonicalJSON,
  DaliurenCanonicalJSON,
  DayunCanonicalJSON,
  DayunItemJSON,
  DerivedHexagramJSON,
  FortuneCanonicalJSON,
  LiuyaoCanonicalJSON,
  LiuyaoYaoJSON,
  LiuyaoYongShenJSON,
  QimenCanonicalJSON,
  QimenPalaceJSON,
  TarotCanonicalJSON,
  TarotCardJSON,
  TarotNumerologyCardJSON,
  TrueSolarTimeJSON,
  ZiweiCanonicalJSON,
  ZiweiFlyingStarCanonicalJSON,
  ZiweiFlyingStarResultJSON,
  ZiweiHoroscopeCanonicalJSON,
  ZiweiPalaceJSON,
  ZiweiStarJSON,
} from './json-types.js';
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
