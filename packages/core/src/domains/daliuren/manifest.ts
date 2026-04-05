import { calculateDaliurenData } from '../../daliuren-core.js';
import { defineCanonicalToolContract } from '../../tool-contract.js';
import { renderDaliurenCanonicalJSON } from './json.js';
import { daliurenOutputSchema } from './output-schema.js';
import { daliurenDefinition } from './schema.js';
import { renderDaliurenCanonicalText } from './text.js';
import type { DaliurenInput, DaliurenOutput } from './types.js';

export const daliurenManifest = defineCanonicalToolContract<DaliurenInput, DaliurenOutput>({
  definition: daliurenDefinition,
  execute: calculateDaliurenData,
  renderText: renderDaliurenCanonicalText,
  renderJSON: renderDaliurenCanonicalJSON,
  canonicalOutputSchema: daliurenOutputSchema,
});
