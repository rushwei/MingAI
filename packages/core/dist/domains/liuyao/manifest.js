import { calculateLiuyaoData } from '../../liuyao-core.js';
import { defineToolContract } from '../../tool-contract.js';
import { renderLiuyaoAISafeJSON, renderLiuyaoCanonicalJSON, } from './json.js';
import { liuyaoOutputSchema } from './output-schema.js';
import { liuyaoDefinition } from './schema.js';
import { renderLiuyaoCanonicalText, renderLiuyaoLevelText } from './text.js';
export const liuyaoManifest = defineToolContract({
    definition: liuyaoDefinition,
    execute: calculateLiuyaoData,
    renderText: (result, options) => renderLiuyaoLevelText(result, options),
    renderJSON: (result, options) => renderLiuyaoAISafeJSON(result, options),
    canonicalOutputSchema: liuyaoOutputSchema,
    debugRenderText: (result) => renderLiuyaoCanonicalText(result),
    debugRenderJSON: (result) => renderLiuyaoCanonicalJSON(result),
});
