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
  formatBaziAsMarkdown,
  formatBaziPillarsResolveAsMarkdown,
  formatZiweiAsMarkdown,
  formatZiweiHoroscopeAsMarkdown,
  formatZiweiFlyingStarAsMarkdown,
  formatLiuyaoAsMarkdown,
  formatTarotAsMarkdown,
  formatDailyFortuneAsMarkdown,
  formatDayunAsMarkdown,
  formatQimenAsMarkdown,
  formatDaliurenAsMarkdown,
} from './formatters.js';
import { toolDefinitions, type ToolDefinition } from './tool-schema.js';

type ToolHandler = (args: unknown) => unknown | Promise<unknown>;
type MarkdownFormatter = (result: unknown) => string;

export interface ToolRegistryEntry {
  definition: ToolDefinition;
  handler: ToolHandler;
  markdownFormatter?: MarkdownFormatter;
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
): ToolRegistryEntry {
  return { definition, handler, markdownFormatter };
}

function adaptToolHandler<TInput, TOutput>(
  handler: (input: TInput) => TOutput | Promise<TOutput>,
): ToolHandler {
  return (args) => handler(args as TInput);
}

export const toolRegistry: ToolRegistryEntry[] = [
  createRegistryEntry(requireDefinition('bazi_calculate'), adaptToolHandler(handleBaziCalculate), (result) => formatBaziAsMarkdown(result as Parameters<typeof formatBaziAsMarkdown>[0])),
  createRegistryEntry(requireDefinition('bazi_pillars_resolve'), adaptToolHandler(handleBaziPillarsResolve), (result) => formatBaziPillarsResolveAsMarkdown(result as Parameters<typeof formatBaziPillarsResolveAsMarkdown>[0])),
  createRegistryEntry(requireDefinition('ziwei_calculate'), adaptToolHandler(handleZiweiCalculate), (result) => formatZiweiAsMarkdown(result as Parameters<typeof formatZiweiAsMarkdown>[0])),
  createRegistryEntry(requireDefinition('ziwei_horoscope'), adaptToolHandler(handleZiweiHoroscope), (result) => formatZiweiHoroscopeAsMarkdown(result as Parameters<typeof formatZiweiHoroscopeAsMarkdown>[0])),
  createRegistryEntry(requireDefinition('ziwei_flying_star'), adaptToolHandler(handleZiweiFlyingStar), (result) => formatZiweiFlyingStarAsMarkdown(result as Parameters<typeof formatZiweiFlyingStarAsMarkdown>[0])),
  createRegistryEntry(requireDefinition('liuyao'), adaptToolHandler(handleLiuyaoAnalyze), (result) => formatLiuyaoAsMarkdown(result as Parameters<typeof formatLiuyaoAsMarkdown>[0])),
  createRegistryEntry(requireDefinition('tarot'), adaptToolHandler(handleTarotDraw), (result) => formatTarotAsMarkdown(result as Parameters<typeof formatTarotAsMarkdown>[0])),
  createRegistryEntry(requireDefinition('almanac'), adaptToolHandler(handleDailyFortune), (result) => formatDailyFortuneAsMarkdown(result as Parameters<typeof formatDailyFortuneAsMarkdown>[0])),
  createRegistryEntry(requireDefinition('bazi_dayun'), adaptToolHandler(handleDayunCalculate), (result) => formatDayunAsMarkdown(result as Parameters<typeof formatDayunAsMarkdown>[0])),
  createRegistryEntry(requireDefinition('qimen_calculate'), adaptToolHandler(handleQimenCalculate), (result) => formatQimenAsMarkdown(result as Parameters<typeof formatQimenAsMarkdown>[0])),
  createRegistryEntry(requireDefinition('daliuren'), adaptToolHandler(handleDaliurenCalculate), (result) => formatDaliurenAsMarkdown(result as Parameters<typeof formatDaliurenAsMarkdown>[0])),
];

export const toolRegistryMap = new Map(toolRegistry.map((entry) => [entry.definition.name, entry] as const));

export function getToolRegistryEntry(name: string): ToolRegistryEntry | undefined {
  return toolRegistryMap.get(name);
}
