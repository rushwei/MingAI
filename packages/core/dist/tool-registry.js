import { handleBaziCalculate, handleBaziPillarsResolve, handleZiweiCalculate, handleZiweiHoroscope, handleZiweiFlyingStar, handleLiuyaoAnalyze, handleTarotDraw, handleDailyFortune, handleDayunCalculate, handleQimenCalculate, handleDaliurenCalculate, } from './handlers/index.js';
import { renderBaziCanonicalJSON, renderBaziPillarsResolveCanonicalJSON, renderDaliurenCanonicalJSON, renderDayunCanonicalJSON, renderFortuneCanonicalJSON, renderLiuyaoAISafeJSON, renderLiuyaoCanonicalJSON, renderQimenCanonicalJSON, renderTarotCanonicalJSON, renderZiweiCanonicalJSON, renderZiweiFlyingStarCanonicalJSON, renderZiweiHoroscopeCanonicalJSON, } from './json.js';
import { renderBaziCanonicalText, renderBaziPillarsResolveCanonicalText, renderDaliurenCanonicalText, renderDayunCanonicalText, renderFortuneCanonicalText, renderLiuyaoCanonicalText, renderLiuyaoLevelText, renderQimenCanonicalText, renderTarotCanonicalText, renderZiweiCanonicalText, renderZiweiFlyingStarCanonicalText, renderZiweiHoroscopeCanonicalText, } from './text.js';
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
function createRegistryEntry(definition, handler, markdownFormatter, jsonFormatter, debugMarkdownFormatter, debugJsonFormatter) {
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
function adaptToolHandler(handler) {
    return (args) => handler(args);
}
export const toolRegistry = [
    createRegistryEntry(requireDefinition('bazi_calculate'), adaptToolHandler(handleBaziCalculate), (result, options) => renderBaziCanonicalText(result, { detailLevel: options?.detailLevel }), (result, options) => renderBaziCanonicalJSON(result, { detailLevel: options?.detailLevel })),
    createRegistryEntry(requireDefinition('bazi_pillars_resolve'), adaptToolHandler(handleBaziPillarsResolve), (result) => renderBaziPillarsResolveCanonicalText(result), (result) => renderBaziPillarsResolveCanonicalJSON(result)),
    createRegistryEntry(requireDefinition('ziwei_calculate'), adaptToolHandler(handleZiweiCalculate), (result, options) => renderZiweiCanonicalText(result, { detailLevel: options?.detailLevel }), (result, options) => renderZiweiCanonicalJSON(result, { detailLevel: options?.detailLevel })),
    createRegistryEntry(requireDefinition('ziwei_horoscope'), adaptToolHandler(handleZiweiHoroscope), (result) => renderZiweiHoroscopeCanonicalText(result), (result) => renderZiweiHoroscopeCanonicalJSON(result)),
    createRegistryEntry(requireDefinition('ziwei_flying_star'), adaptToolHandler(handleZiweiFlyingStar), (result) => renderZiweiFlyingStarCanonicalText(result), (result) => renderZiweiFlyingStarCanonicalJSON(result)),
    createRegistryEntry(requireDefinition('liuyao'), adaptToolHandler(handleLiuyaoAnalyze), (result, options) => renderLiuyaoLevelText(result, options), (result, options) => renderLiuyaoAISafeJSON(result, options), (result) => renderLiuyaoCanonicalText(result), (result) => renderLiuyaoCanonicalJSON(result)),
    createRegistryEntry(requireDefinition('tarot'), adaptToolHandler(handleTarotDraw), (result) => renderTarotCanonicalText(result), (result) => renderTarotCanonicalJSON(result)),
    createRegistryEntry(requireDefinition('almanac'), adaptToolHandler(handleDailyFortune), (result) => renderFortuneCanonicalText(result), (result) => renderFortuneCanonicalJSON(result)),
    createRegistryEntry(requireDefinition('bazi_dayun'), adaptToolHandler(handleDayunCalculate), (result, options) => renderDayunCanonicalText(result, { detailLevel: options?.detailLevel }), (result, options) => renderDayunCanonicalJSON(result, { detailLevel: options?.detailLevel })),
    createRegistryEntry(requireDefinition('qimen_calculate'), adaptToolHandler(handleQimenCalculate), (result, options) => renderQimenCanonicalText(result, { detailLevel: options?.detailLevel }), (result, options) => renderQimenCanonicalJSON(result, { detailLevel: options?.detailLevel })),
    createRegistryEntry(requireDefinition('daliuren'), adaptToolHandler(handleDaliurenCalculate), (result, options) => renderDaliurenCanonicalText(result, { detailLevel: options?.detailLevel }), (result, options) => renderDaliurenCanonicalJSON(result, { detailLevel: options?.detailLevel })),
];
export const toolRegistryMap = new Map(toolRegistry.map((entry) => [entry.definition.name, entry]));
export function getToolRegistryEntry(name) {
    return toolRegistryMap.get(name);
}
