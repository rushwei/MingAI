import { calculateDaliurenData } from '../../daliuren-core.js';
import { defineCanonicalToolContract } from '../../tool-contract.js';
import { renderDaliurenCanonicalJSON } from './json.js';
import { daliurenOutputSchema } from './output-schema.js';
import { daliurenDefinition } from './schema.js';
import { renderDaliurenCanonicalText } from './text.js';
export const daliurenManifest = defineCanonicalToolContract({
    definition: daliurenDefinition,
    execute: calculateDaliurenData,
    renderText: renderDaliurenCanonicalText,
    renderJSON: renderDaliurenCanonicalJSON,
    canonicalOutputSchema: daliurenOutputSchema,
});
