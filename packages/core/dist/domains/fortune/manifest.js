import { calculateDailyFortune } from '../../fortune-core.js';
import { defineCanonicalToolContract } from '../../tool-contract.js';
import { renderFortuneCanonicalJSON } from './json.js';
import { almanacOutputSchema } from './output-schema.js';
import { almanacDefinition } from './schema.js';
import { renderFortuneCanonicalText } from './text.js';
export const almanacManifest = defineCanonicalToolContract({
    definition: almanacDefinition,
    execute: calculateDailyFortune,
    renderText: renderFortuneCanonicalText,
    renderJSON: renderFortuneCanonicalJSON,
    canonicalOutputSchema: almanacOutputSchema,
});
