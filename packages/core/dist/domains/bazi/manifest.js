import { calculateBaziData } from '../../bazi-core.js';
import { defineCanonicalToolContract, mergePlaceResolutionInfo, } from '../../tool-contract.js';
import { renderBaziCanonicalJSON } from './json.js';
import { baziCalculateOutputSchema } from './output-schema.js';
import { baziCalculateDefinition } from './schema.js';
import { renderBaziCanonicalText } from './text.js';
export const baziManifest = defineCanonicalToolContract({
    definition: baziCalculateDefinition,
    execute: calculateBaziData,
    renderText: renderBaziCanonicalText,
    renderJSON: renderBaziCanonicalJSON,
    canonicalOutputSchema: baziCalculateOutputSchema,
    mergeRuntimeExtras: mergePlaceResolutionInfo,
});
