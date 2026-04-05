import { calculateDayunData } from '../../dayun-core.js';
import { defineCanonicalToolContract, mergePlaceResolutionInfo, } from '../../tool-contract.js';
import { renderDayunCanonicalJSON } from './json.js';
import { baziDayunOutputSchema } from './output-schema.js';
import { baziDayunDefinition } from './schema.js';
import { renderDayunCanonicalText } from './text.js';
export const baziDayunManifest = defineCanonicalToolContract({
    definition: baziDayunDefinition,
    execute: calculateDayunData,
    renderText: renderDayunCanonicalText,
    renderJSON: renderDayunCanonicalJSON,
    canonicalOutputSchema: baziDayunOutputSchema,
    mergeRuntimeExtras: mergePlaceResolutionInfo,
});
