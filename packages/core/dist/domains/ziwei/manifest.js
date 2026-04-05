import { calculateZiweiData } from '../../ziwei-core.js';
import { defineCanonicalToolContract, mergePlaceResolutionInfo, } from '../../tool-contract.js';
import { renderZiweiCanonicalJSON } from './json.js';
import { ziweiCalculateOutputSchema } from './output-schema.js';
import { ziweiCalculateDefinition } from './schema.js';
import { renderZiweiCanonicalText } from './text.js';
export const ziweiManifest = defineCanonicalToolContract({
    definition: ziweiCalculateDefinition,
    execute: calculateZiweiData,
    renderText: renderZiweiCanonicalText,
    renderJSON: renderZiweiCanonicalJSON,
    canonicalOutputSchema: ziweiCalculateOutputSchema,
    mergeRuntimeExtras: mergePlaceResolutionInfo,
});
