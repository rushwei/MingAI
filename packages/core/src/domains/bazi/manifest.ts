import { calculateBaziData } from '../../bazi-core.js';
import {
  defineCanonicalToolContract,
  mergePlaceResolutionInfo,
} from '../../tool-contract.js';
import { renderBaziCanonicalJSON } from './json.js';
import { baziCalculateOutputSchema } from './output-schema.js';
import { baziCalculateDefinition } from './schema.js';
import { renderBaziCanonicalText } from './text.js';
import type { BaziInput, BaziOutput } from './types.js';

export const baziManifest = defineCanonicalToolContract<BaziInput, BaziOutput>({
  definition: baziCalculateDefinition,
  execute: calculateBaziData,
  renderText: renderBaziCanonicalText,
  renderJSON: renderBaziCanonicalJSON,
  canonicalOutputSchema: baziCalculateOutputSchema,
  mergeRuntimeExtras: mergePlaceResolutionInfo,
});
