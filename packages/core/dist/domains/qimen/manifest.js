import { calculateQimenData } from '../../qimen-core.js';
import { defineCanonicalToolContract } from '../../tool-contract.js';
import { renderQimenCanonicalJSON } from './json.js';
import { qimenCalculateOutputSchema } from './output-schema.js';
import { qimenCalculateDefinition } from './schema.js';
import { renderQimenCanonicalText } from './text.js';
export const qimenManifest = defineCanonicalToolContract({
    definition: qimenCalculateDefinition,
    execute: calculateQimenData,
    renderText: renderQimenCanonicalText,
    renderJSON: renderQimenCanonicalJSON,
    canonicalOutputSchema: qimenCalculateOutputSchema,
});
