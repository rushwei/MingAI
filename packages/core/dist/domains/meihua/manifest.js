import { calculateMeihua } from '../../meihua-core.js';
import { defineCanonicalToolContract } from '../../tool-contract.js';
import { renderMeihuaCanonicalJSON } from './json.js';
import { meihuaOutputSchema } from './output-schema.js';
import { meihuaDefinition } from './schema.js';
import { renderMeihuaCanonicalText } from './text.js';
export const meihuaManifest = defineCanonicalToolContract({
    definition: meihuaDefinition,
    execute: calculateMeihua,
    renderText: renderMeihuaCanonicalText,
    renderJSON: renderMeihuaCanonicalJSON,
    canonicalOutputSchema: meihuaOutputSchema,
});
