import { handleBaziCalculate, handleBaziPillarsResolve, handleZiweiCalculate, handleZiweiHoroscope, handleZiweiFlyingStar, handleLiuyaoAnalyze, handleTarotDraw, handleDailyFortune, handleDayunCalculate, handleQimenCalculate, handleDaliurenCalculate, } from './handlers/index.js';
import { toolDefinitions } from './tool-schema.js';
const definitionByName = new Map(toolDefinitions.map((definition) => [definition.name, definition]));
function requireDefinition(name) {
    const definition = definitionByName.get(name);
    if (!definition) {
        throw new Error(`缺少工具定义: ${name}`);
    }
    return definition;
}
function createRegistryEntry(definition, handler, formatterKey) {
    return { definition, handler, formatterKey };
}
function adaptToolHandler(handler) {
    return (args) => handler(args);
}
export const toolRegistry = [
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
export const toolRegistryMap = new Map(toolRegistry.map((entry) => [entry.definition.name, entry]));
export function getToolRegistryEntry(name) {
    return toolRegistryMap.get(name);
}
