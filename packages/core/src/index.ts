/**
 * Core 主入口
 */

import { getToolRegistryEntry } from './tool-registry.js';
import { tools } from './tools.js';

export type {
  BaziCanonicalJSON,
  BaziPillarJSON,
  BaziPillarsResolveCanonicalJSON,
  DaliurenCanonicalJSON,
  DayunCanonicalJSON,
  DayunItemJSON,
  DerivedHexagramJSON,
  FortuneCanonicalJSON,
  LiuyaoAISafeJSON,
  LiuyaoAISafeLineJSON,
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
  ZiweiStarJSON
} from './json-types.js';
export {
  renderBaziCanonicalJSON,
  renderBaziPillarsResolveCanonicalJSON,
  renderDaliurenCanonicalJSON,
  renderDayunCanonicalJSON,
  renderFortuneCanonicalJSON,
  renderLiuyaoAISafeJSON,
  renderLiuyaoCanonicalJSON,
  renderQimenCanonicalJSON,
  renderTarotCanonicalJSON,
  renderZiweiCanonicalJSON, renderZiweiFlyingStarCanonicalJSON, renderZiweiHoroscopeCanonicalJSON
} from './json.js';
export { calculateBaziPillarsResolve } from './bazi-pillars-resolve-core.js';
export { calculateBaziData } from './bazi-core.js';
export { calculateDailyFortune } from './fortune-core.js';
export { calculateDaliurenData } from './daliuren-core.js';
export { calculateDayunData } from './dayun-core.js';
export { calculateLiuyaoData } from './liuyao-core.js';
export { calculateQimenData } from './qimen-core.js';
export { calculateTarotData } from './tarot-core.js';
export {
  renderBaziCanonicalText,
  renderBaziPillarsResolveCanonicalText, renderDaliurenCanonicalText, renderDayunCanonicalText,
  renderFortuneCanonicalText,
  renderLiuyaoAISafeText, renderLiuyaoCanonicalText, renderLiuyaoLevelText,
  renderQimenCanonicalText,
  renderTarotCanonicalText, renderZiweiCanonicalText, renderZiweiFlyingStarCanonicalText, renderZiweiHoroscopeCanonicalText
} from './text.js';
export type { ZiweiCanonicalTextOptions } from './text.js';
export {
  calculateZiweiData,
  calculateZiweiDataWithAstrolabe,
  calculateZiweiHoroscopeData,
  calculateZiweiHoroscopeDataWithAstrolabe,
  createAstrolabeWithTrueSolar,
} from './ziwei-core.js';
export { calculateZiweiFlyingStar } from './ziwei-flying-star-core.js';
export type { RenderOptions } from './tool-contract.js';
export { renderToolResult } from './tool-output.js';
export { toolRegistry } from './tool-registry.js';
export { tools } from './tools.js';
export type { ToolAnnotation, ToolDefinition, ToolInput } from './tools.js';

export * from './types.js';

/**
 * 统一工具调用分发（消除 mcp-server / mcp 重复 switch）
 */
export async function handleToolCall(name: string, args: unknown): Promise<unknown> {
  const entry = getToolRegistryEntry(name);
  if (!entry) {
    const availableTools = tools.map((t) => t.name).join(', ');
    throw new Error(`未知工具: ${name}。可用的工具: ${availableTools}`);
  }

  return entry.execute(args);
}
