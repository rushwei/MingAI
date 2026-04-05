import { calculateBaziPillarsResolve } from '../../bazi-pillars-resolve-core.js';
import { defineCanonicalToolContract } from '../../tool-contract.js';
import { renderBaziPillarsResolveCanonicalJSON } from './json.js';
import { baziPillarsResolveOutputSchema } from './output-schema.js';
import { baziPillarsResolveDefinition } from './schema.js';
import { renderBaziPillarsResolveCanonicalText } from './text.js';
import type { BaziPillarsResolveInput, BaziPillarsResolveOutput } from './types.js';

export const baziPillarsResolveManifest = defineCanonicalToolContract<BaziPillarsResolveInput, BaziPillarsResolveOutput>({
  definition: baziPillarsResolveDefinition,
  execute: calculateBaziPillarsResolve,
  renderText: renderBaziPillarsResolveCanonicalText,
  renderJSON: renderBaziPillarsResolveCanonicalJSON,
  canonicalOutputSchema: baziPillarsResolveOutputSchema,
});
