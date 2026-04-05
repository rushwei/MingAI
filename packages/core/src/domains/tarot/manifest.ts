import { calculateTarotData } from '../../tarot-core.js';
import { defineCanonicalToolContract } from '../../tool-contract.js';
import { renderTarotCanonicalJSON } from './json.js';
import { tarotOutputSchema } from './output-schema.js';
import { tarotDefinition } from './schema.js';
import { renderTarotCanonicalText } from './text.js';
import type { TarotInput, TarotOutput } from './types.js';

export const tarotManifest = defineCanonicalToolContract<TarotInput, TarotOutput>({
  definition: tarotDefinition,
  execute: calculateTarotData,
  renderText: renderTarotCanonicalText,
  renderJSON: renderTarotCanonicalJSON,
  canonicalOutputSchema: tarotOutputSchema,
});
