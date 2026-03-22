import { handleBaziCalculate, handleBaziPillarsResolve, handleZiweiCalculate, handleZiweiHoroscope, handleZiweiFlyingStar, handleLiuyaoAnalyze, handleTarotDraw, handleDailyFortune, handleDayunCalculate, handleQimenCalculate, handleDaliurenCalculate, } from './handlers/index.js';
import { renderBaziCanonicalJSON, renderBaziPillarsResolveCanonicalJSON, renderDaliurenCanonicalJSON, renderDayunCanonicalJSON, renderFortuneCanonicalJSON, renderLiuyaoCanonicalJSON, renderQimenCanonicalJSON, renderTarotCanonicalJSON, renderZiweiCanonicalJSON, renderZiweiFlyingStarCanonicalJSON, renderZiweiHoroscopeCanonicalJSON, } from './json.js';
import { renderBaziCanonicalText, renderBaziPillarsResolveCanonicalText, renderDaliurenCanonicalText, renderDayunCanonicalText, renderFortuneCanonicalText, renderLiuyaoCanonicalText, renderQimenCanonicalText, renderTarotCanonicalText, renderZiweiCanonicalText, renderZiweiFlyingStarCanonicalText, renderZiweiHoroscopeCanonicalText, } from './text.js';
import { canonicalOutputSchemas } from './canonical-output-schema.js';
import { toolDefinitions } from './tool-schema.js';
const definitionByName = new Map(toolDefinitions.map((definition) => [definition.name, definition]));
function requireDefinition(name) {
    const definition = definitionByName.get(name);
    if (!definition) {
        throw new Error(`缺少工具定义: ${name}`);
    }
    return definition;
}
function createRegistryEntry(definition, handler, markdownFormatter, jsonFormatter) {
    const canonicalOutputSchema = canonicalOutputSchemas[definition.name];
    return {
        definition: canonicalOutputSchema
            ? { ...definition, outputSchema: canonicalOutputSchema }
            : definition,
        handler,
        markdownFormatter,
        jsonFormatter,
    };
}
function adaptToolHandler(handler) {
    return (args) => handler(args);
}
export const toolRegistry = [
    createRegistryEntry(requireDefinition('bazi_calculate'), adaptToolHandler(handleBaziCalculate), (result) => renderBaziCanonicalText(result), (result) => renderBaziCanonicalJSON(result)),
    createRegistryEntry(requireDefinition('bazi_pillars_resolve'), adaptToolHandler(handleBaziPillarsResolve), (result) => renderBaziPillarsResolveCanonicalText(result), (result) => renderBaziPillarsResolveCanonicalJSON(result)),
    createRegistryEntry(requireDefinition('ziwei_calculate'), adaptToolHandler(handleZiweiCalculate), (result) => renderZiweiCanonicalText(result), (result) => renderZiweiCanonicalJSON(result)),
    createRegistryEntry(requireDefinition('ziwei_horoscope'), adaptToolHandler(handleZiweiHoroscope), (result) => renderZiweiHoroscopeCanonicalText(result), (result) => renderZiweiHoroscopeCanonicalJSON(result)),
    createRegistryEntry(requireDefinition('ziwei_flying_star'), adaptToolHandler(handleZiweiFlyingStar), (result) => renderZiweiFlyingStarCanonicalText(result), (result) => renderZiweiFlyingStarCanonicalJSON(result)),
    createRegistryEntry(requireDefinition('liuyao'), adaptToolHandler(handleLiuyaoAnalyze), (result) => renderLiuyaoCanonicalText(result), (result) => renderLiuyaoCanonicalJSON(result)),
    createRegistryEntry(requireDefinition('tarot'), adaptToolHandler(handleTarotDraw), (result) => renderTarotCanonicalText(result), (result) => renderTarotCanonicalJSON(result)),
    createRegistryEntry(requireDefinition('almanac'), adaptToolHandler(handleDailyFortune), (result) => renderFortuneCanonicalText(result), (result) => renderFortuneCanonicalJSON(result)),
    createRegistryEntry(requireDefinition('bazi_dayun'), adaptToolHandler(handleDayunCalculate), (result) => renderDayunCanonicalText(result), (result) => renderDayunCanonicalJSON(result)),
    createRegistryEntry(requireDefinition('qimen_calculate'), adaptToolHandler(handleQimenCalculate), (result) => renderQimenCanonicalText(result), (result) => renderQimenCanonicalJSON(result)),
    createRegistryEntry(requireDefinition('daliuren'), adaptToolHandler(handleDaliurenCalculate), (result) => renderDaliurenCanonicalText(result), (result) => renderDaliurenCanonicalJSON(result)),
];
export const toolRegistryMap = new Map(toolRegistry.map((entry) => [entry.definition.name, entry]));
export function getToolRegistryEntry(name) {
    return toolRegistryMap.get(name);
}
