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
import {
  renderBaziCanonicalJSON,
  renderBaziPillarsResolveCanonicalJSON,
  renderDaliurenCanonicalJSON,
  renderDayunCanonicalJSON,
  renderFortuneCanonicalJSON,
  renderLiuyaoAISafeJSON,
  renderLiuyaoCanonicalJSON,
  renderQimenCanonicalJSON,
  renderTarotCanonicalJSON,
  renderZiweiCanonicalJSON,
  renderZiweiFlyingStarCanonicalJSON,
  renderZiweiHoroscopeCanonicalJSON,
} from './json.js';
import {
  renderBaziCanonicalText,
  renderBaziPillarsResolveCanonicalText,
  renderDaliurenCanonicalText,
  renderDayunCanonicalText,
  renderFortuneCanonicalText,
  renderLiuyaoAISafeText,
  renderLiuyaoCanonicalText,
  renderLiuyaoLevelText,
  renderQimenCanonicalText,
  renderTarotCanonicalText,
  renderZiweiCanonicalText,
  renderZiweiFlyingStarCanonicalText,
  renderZiweiHoroscopeCanonicalText,
} from './text.js';
import { canonicalOutputSchemas } from './canonical-output-schema.js';
import { toolDefinitions, type ToolDefinition } from './tool-schema.js';

type ToolHandler = (args: unknown) => unknown | Promise<unknown>;
type RenderOptions = { detailLevel?: 'default' | 'more' | 'full' | 'safe' | 'facts' | 'debug' };
type MarkdownFormatter = (result: unknown, options?: RenderOptions) => string;
type JsonFormatter = (result: unknown, options?: RenderOptions) => unknown;

export interface ToolRegistryEntry {
  definition: ToolDefinition;
  handler: ToolHandler;
  markdownFormatter?: MarkdownFormatter;
  jsonFormatter?: JsonFormatter;
  debugMarkdownFormatter?: MarkdownFormatter;
  debugJsonFormatter?: JsonFormatter;
}

const definitionByName = new Map(toolDefinitions.map((definition) => [definition.name, definition] as const));

function requireDefinition(name: string): ToolDefinition {
  const definition = definitionByName.get(name);
  if (!definition) {
    throw new Error(`缺少工具定义: ${name}`);
  }
  return definition;
}

function createRegistryEntry(
  definition: ToolDefinition,
  handler: ToolHandler,
  markdownFormatter?: MarkdownFormatter,
  jsonFormatter?: JsonFormatter,
  debugMarkdownFormatter?: MarkdownFormatter,
  debugJsonFormatter?: JsonFormatter,
): ToolRegistryEntry {
  const canonicalOutputSchema = canonicalOutputSchemas[definition.name];
  return {
    definition: canonicalOutputSchema
      ? { ...definition, outputSchema: canonicalOutputSchema }
      : definition,
    handler,
    markdownFormatter,
    jsonFormatter,
    debugMarkdownFormatter,
    debugJsonFormatter,
  };
}

function adaptToolHandler<TInput, TOutput>(
  handler: (input: TInput) => TOutput | Promise<TOutput>,
): ToolHandler {
  return (args) => handler(args as TInput);
}

export const toolRegistry: ToolRegistryEntry[] = [
  createRegistryEntry(requireDefinition('bazi_calculate'), adaptToolHandler(handleBaziCalculate), (result, options) => renderBaziCanonicalText(result as Parameters<typeof renderBaziCanonicalText>[0], { detailLevel: options?.detailLevel }), (result, options) => renderBaziCanonicalJSON(result as Parameters<typeof renderBaziCanonicalJSON>[0], { detailLevel: options?.detailLevel })),
  createRegistryEntry(requireDefinition('bazi_pillars_resolve'), adaptToolHandler(handleBaziPillarsResolve), (result) => renderBaziPillarsResolveCanonicalText(result as Parameters<typeof renderBaziPillarsResolveCanonicalText>[0]), (result) => renderBaziPillarsResolveCanonicalJSON(result as Parameters<typeof renderBaziPillarsResolveCanonicalJSON>[0])),
  createRegistryEntry(requireDefinition('ziwei_calculate'), adaptToolHandler(handleZiweiCalculate), (result, options) => renderZiweiCanonicalText(result as Parameters<typeof renderZiweiCanonicalText>[0], { detailLevel: options?.detailLevel }), (result, options) => renderZiweiCanonicalJSON(result as Parameters<typeof renderZiweiCanonicalJSON>[0], { detailLevel: options?.detailLevel })),
  createRegistryEntry(requireDefinition('ziwei_horoscope'), adaptToolHandler(handleZiweiHoroscope), (result, options) => renderZiweiHoroscopeCanonicalText(result as Parameters<typeof renderZiweiHoroscopeCanonicalText>[0], { detailLevel: options?.detailLevel }), (result, options) => renderZiweiHoroscopeCanonicalJSON(result as Parameters<typeof renderZiweiHoroscopeCanonicalJSON>[0], { detailLevel: options?.detailLevel })),
  createRegistryEntry(requireDefinition('ziwei_flying_star'), adaptToolHandler(handleZiweiFlyingStar), (result) => renderZiweiFlyingStarCanonicalText(result as Parameters<typeof renderZiweiFlyingStarCanonicalText>[0]), (result) => renderZiweiFlyingStarCanonicalJSON(result as Parameters<typeof renderZiweiFlyingStarCanonicalJSON>[0])),
  createRegistryEntry(
    requireDefinition('liuyao'),
    adaptToolHandler(handleLiuyaoAnalyze),
    (result, options) => renderLiuyaoLevelText(
      result as Parameters<typeof renderLiuyaoLevelText>[0],
      options,
    ),
    (result, options) => renderLiuyaoAISafeJSON(
      result as Parameters<typeof renderLiuyaoAISafeJSON>[0],
      options,
    ),
    (result) => renderLiuyaoCanonicalText(result as Parameters<typeof renderLiuyaoCanonicalText>[0]),
    (result) => renderLiuyaoCanonicalJSON(result as Parameters<typeof renderLiuyaoCanonicalJSON>[0]),
  ),
  createRegistryEntry(requireDefinition('tarot'), adaptToolHandler(handleTarotDraw), (result, options) => renderTarotCanonicalText(result as Parameters<typeof renderTarotCanonicalText>[0], { detailLevel: options?.detailLevel }), (result, options) => renderTarotCanonicalJSON(result as Parameters<typeof renderTarotCanonicalJSON>[0], { detailLevel: options?.detailLevel })),
  createRegistryEntry(requireDefinition('almanac'), adaptToolHandler(handleDailyFortune), (result) => renderFortuneCanonicalText(result as Parameters<typeof renderFortuneCanonicalText>[0]), (result) => renderFortuneCanonicalJSON(result as Parameters<typeof renderFortuneCanonicalJSON>[0])),
  createRegistryEntry(requireDefinition('bazi_dayun'), adaptToolHandler(handleDayunCalculate), (result, options) => renderDayunCanonicalText(result as Parameters<typeof renderDayunCanonicalText>[0], { detailLevel: options?.detailLevel }), (result, options) => renderDayunCanonicalJSON(result as Parameters<typeof renderDayunCanonicalJSON>[0], { detailLevel: options?.detailLevel })),
  createRegistryEntry(requireDefinition('qimen_calculate'), adaptToolHandler(handleQimenCalculate), (result, options) => renderQimenCanonicalText(result as Parameters<typeof renderQimenCanonicalText>[0], { detailLevel: options?.detailLevel }), (result, options) => renderQimenCanonicalJSON(result as Parameters<typeof renderQimenCanonicalJSON>[0], { detailLevel: options?.detailLevel })),
  createRegistryEntry(requireDefinition('daliuren'), adaptToolHandler(handleDaliurenCalculate), (result, options) => renderDaliurenCanonicalText(result as Parameters<typeof renderDaliurenCanonicalText>[0], { detailLevel: options?.detailLevel }), (result, options) => renderDaliurenCanonicalJSON(result as Parameters<typeof renderDaliurenCanonicalJSON>[0], { detailLevel: options?.detailLevel })),
];

export const toolRegistryMap = new Map(toolRegistry.map((entry) => [entry.definition.name, entry] as const));

export function getToolRegistryEntry(name: string): ToolRegistryEntry | undefined {
  return toolRegistryMap.get(name);
}
