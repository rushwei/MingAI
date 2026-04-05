import { calculateBaziPillarsResolve } from '../../bazi-pillars-resolve-core.js';
import { defineCanonicalToolContract } from '../../tool-contract.js';
import { renderBaziPillarsResolveCanonicalJSON } from './json.js';
import { baziPillarsResolveOutputSchema } from './output-schema.js';
import { baziPillarsResolveDefinition } from './schema.js';
import { renderBaziPillarsResolveCanonicalText } from './text.js';
export const baziPillarsResolveManifest = defineCanonicalToolContract({
    definition: baziPillarsResolveDefinition,
    execute: calculateBaziPillarsResolve,
    renderText: renderBaziPillarsResolveCanonicalText,
    renderJSON: renderBaziPillarsResolveCanonicalJSON,
    canonicalOutputSchema: baziPillarsResolveOutputSchema,
});
