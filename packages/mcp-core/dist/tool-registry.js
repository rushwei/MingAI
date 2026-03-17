import { handleBaziCalculate, handleBaziPillarsResolve, handleZiweiCalculate, handleZiweiHoroscope, handleZiweiFlyingStar, handleLiuyaoAnalyze, handleTarotDraw, handleDailyFortune, handleDayunCalculate, handleQimenCalculate, handleDaliurenCalculate, } from './handlers/index.js';
import { formatBaziAsMarkdown, formatBaziPillarsResolveAsMarkdown, formatZiweiAsMarkdown, formatZiweiHoroscopeAsMarkdown, formatZiweiFlyingStarAsMarkdown, formatLiuyaoAsMarkdown, formatTarotAsMarkdown, formatDailyFortuneAsMarkdown, formatDayunAsMarkdown, formatQimenAsMarkdown, formatDaliurenAsMarkdown, } from './formatters.js';
import { toolDefinitions } from './tool-schema.js';
const definitionByName = new Map(toolDefinitions.map((definition) => [definition.name, definition]));
function requireDefinition(name) {
    const definition = definitionByName.get(name);
    if (!definition) {
        throw new Error(`缺少工具定义: ${name}`);
    }
    return definition;
}
function createRegistryEntry(definition, handler, markdownFormatter) {
    return { definition, handler, markdownFormatter };
}
function adaptToolHandler(handler) {
    return (args) => handler(args);
}
export const toolRegistry = [
    createRegistryEntry(requireDefinition('bazi_calculate'), adaptToolHandler(handleBaziCalculate), (result) => formatBaziAsMarkdown(result)),
    createRegistryEntry(requireDefinition('bazi_pillars_resolve'), adaptToolHandler(handleBaziPillarsResolve), (result) => formatBaziPillarsResolveAsMarkdown(result)),
    createRegistryEntry(requireDefinition('ziwei_calculate'), adaptToolHandler(handleZiweiCalculate), (result) => formatZiweiAsMarkdown(result)),
    createRegistryEntry(requireDefinition('ziwei_horoscope'), adaptToolHandler(handleZiweiHoroscope), (result) => formatZiweiHoroscopeAsMarkdown(result)),
    createRegistryEntry(requireDefinition('ziwei_flying_star'), adaptToolHandler(handleZiweiFlyingStar), (result) => formatZiweiFlyingStarAsMarkdown(result)),
    createRegistryEntry(requireDefinition('liuyao'), adaptToolHandler(handleLiuyaoAnalyze), (result) => formatLiuyaoAsMarkdown(result)),
    createRegistryEntry(requireDefinition('tarot'), adaptToolHandler(handleTarotDraw), (result) => formatTarotAsMarkdown(result)),
    createRegistryEntry(requireDefinition('almanac'), adaptToolHandler(handleDailyFortune), (result) => formatDailyFortuneAsMarkdown(result)),
    createRegistryEntry(requireDefinition('bazi_dayun'), adaptToolHandler(handleDayunCalculate), (result) => formatDayunAsMarkdown(result)),
    createRegistryEntry(requireDefinition('qimen_calculate'), adaptToolHandler(handleQimenCalculate), (result) => formatQimenAsMarkdown(result)),
    createRegistryEntry(requireDefinition('daliuren'), adaptToolHandler(handleDaliurenCalculate), (result) => formatDaliurenAsMarkdown(result)),
];
export const toolRegistryMap = new Map(toolRegistry.map((entry) => [entry.definition.name, entry]));
export function getToolRegistryEntry(name) {
    return toolRegistryMap.get(name);
}
