import { calculateQimenData } from '../../qimen-core.js';
import { defineCanonicalToolContract } from '../../tool-contract.js';
import { renderQimenCanonicalJSON } from './json.js';
import { qimenCalculateOutputSchema } from './output-schema.js';
import { qimenCalculateDefinition } from './schema.js';
import { renderQimenCanonicalText } from './text.js';
import type { QimenInput, QimenOutput } from './types.js';

export const qimenManifest = defineCanonicalToolContract<QimenInput, QimenOutput>({
  definition: qimenCalculateDefinition,
  execute: calculateQimenData,
  renderText: renderQimenCanonicalText,
  renderJSON: renderQimenCanonicalJSON,
  canonicalOutputSchema: qimenCalculateOutputSchema,
});
