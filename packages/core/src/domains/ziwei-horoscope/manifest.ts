import { calculateZiweiHoroscopeData } from '../../ziwei-horoscope-core.js';
import { defineCanonicalToolContract } from '../../tool-contract.js';
import { renderZiweiHoroscopeCanonicalJSON } from './json.js';
import { ziweiHoroscopeOutputSchema } from './output-schema.js';
import { ziweiHoroscopeDefinition } from './schema.js';
import { renderZiweiHoroscopeCanonicalText } from './text.js';
import type { ZiweiHoroscopeInput, ZiweiHoroscopeOutput } from './types.js';

export const ziweiHoroscopeManifest = defineCanonicalToolContract<ZiweiHoroscopeInput, ZiweiHoroscopeOutput>({
  definition: ziweiHoroscopeDefinition,
  execute: calculateZiweiHoroscopeData,
  renderText: renderZiweiHoroscopeCanonicalText,
  renderJSON: renderZiweiHoroscopeCanonicalJSON,
  canonicalOutputSchema: ziweiHoroscopeOutputSchema,
});
