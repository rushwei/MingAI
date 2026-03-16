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
import { toolDefinitions, type ToolDefinition } from './tool-schema.js';

export type ToolFormatterKey =
  | 'bazi'
  | 'baziPillarsResolve'
  | 'ziwei'
  | 'ziweiHoroscope'
  | 'ziweiFlyingStar'
  | 'liuyao'
  | 'tarot'
  | 'almanac'
  | 'baziDayun'
  | 'qimen';

type ToolHandler = (args: unknown) => unknown | Promise<unknown>;

export interface ToolRegistryEntry {
  definition: ToolDefinition;
  handler: ToolHandler;
  formatterKey?: ToolFormatterKey;
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
  formatterKey?: ToolFormatterKey,
): ToolRegistryEntry {
  return { definition, handler, formatterKey };
}

function adaptToolHandler<TInput, TOutput>(
  handler: (input: TInput) => TOutput | Promise<TOutput>,
): ToolHandler {
  return (args) => handler(args as TInput);
}

export const toolRegistry: ToolRegistryEntry[] = [
  createRegistryEntry(requireDefinition('bazi_calculate'), adaptToolHandler(handleBaziCalculate), 'bazi'),
  createRegistryEntry(requireDefinition('bazi_pillars_resolve'), adaptToolHandler(handleBaziPillarsResolve), 'baziPillarsResolve'),
  createRegistryEntry(requireDefinition('ziwei_calculate'), adaptToolHandler(handleZiweiCalculate), 'ziwei'),
  createRegistryEntry(requireDefinition('ziwei_horoscope'), adaptToolHandler(handleZiweiHoroscope), 'ziweiHoroscope'),
  createRegistryEntry(requireDefinition('ziwei_flying_star'), adaptToolHandler(handleZiweiFlyingStar), 'ziweiFlyingStar'),
  createRegistryEntry(requireDefinition('liuyao'), adaptToolHandler(handleLiuyaoAnalyze), 'liuyao'),
  createRegistryEntry(requireDefinition('tarot'), adaptToolHandler(handleTarotDraw), 'tarot'),
  createRegistryEntry(requireDefinition('almanac'), adaptToolHandler(handleDailyFortune), 'almanac'),
  createRegistryEntry(requireDefinition('bazi_dayun'), adaptToolHandler(handleDayunCalculate), 'baziDayun'),
  createRegistryEntry(requireDefinition('qimen_calculate'), adaptToolHandler(handleQimenCalculate), 'qimen'),
  createRegistryEntry(requireDefinition('daliuren'), adaptToolHandler(handleDaliurenCalculate)),
];

export const toolRegistryMap = new Map(toolRegistry.map((entry) => [entry.definition.name, entry] as const));

export function getToolRegistryEntry(name: string): ToolRegistryEntry | undefined {
  return toolRegistryMap.get(name);
}
