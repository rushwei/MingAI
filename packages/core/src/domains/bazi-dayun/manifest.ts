import { calculateDayunData } from '../../dayun-core.js';
import {
  defineCanonicalToolContract,
  mergePlaceResolutionInfo,
} from '../../tool-contract.js';
import { renderDayunCanonicalJSON } from './json.js';
import { baziDayunOutputSchema } from './output-schema.js';
import { baziDayunDefinition } from './schema.js';
import { renderDayunCanonicalText } from './text.js';
import type { DayunInput, DayunOutput } from './types.js';

export const baziDayunManifest = defineCanonicalToolContract<DayunInput, DayunOutput>({
  definition: baziDayunDefinition,
  execute: calculateDayunData,
  renderText: renderDayunCanonicalText,
  renderJSON: renderDayunCanonicalJSON,
  canonicalOutputSchema: baziDayunOutputSchema,
  mergeRuntimeExtras: mergePlaceResolutionInfo,
});
