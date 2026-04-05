import { calculateZiweiData } from '../../ziwei-core.js';
import {
  defineCanonicalToolContract,
  mergePlaceResolutionInfo,
} from '../../tool-contract.js';
import { renderZiweiCanonicalJSON } from './json.js';
import { ziweiCalculateOutputSchema } from './output-schema.js';
import { ziweiCalculateDefinition } from './schema.js';
import { renderZiweiCanonicalText } from './text.js';
import type { ZiweiInput, ZiweiOutput } from './types.js';

export const ziweiManifest = defineCanonicalToolContract<ZiweiInput, ZiweiOutput>({
  definition: ziweiCalculateDefinition,
  execute: calculateZiweiData,
  renderText: renderZiweiCanonicalText,
  renderJSON: renderZiweiCanonicalJSON,
  canonicalOutputSchema: ziweiCalculateOutputSchema,
  mergeRuntimeExtras: mergePlaceResolutionInfo,
});
