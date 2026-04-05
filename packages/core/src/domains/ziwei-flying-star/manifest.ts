import { calculateZiweiFlyingStar } from '../../ziwei-flying-star-core.js';
import { defineCanonicalToolContract } from '../../tool-contract.js';
import { renderZiweiFlyingStarCanonicalJSON } from './json.js';
import { ziweiFlyingStarOutputSchema } from './output-schema.js';
import { ziweiFlyingStarDefinition } from './schema.js';
import { renderZiweiFlyingStarCanonicalText } from './text.js';
import type { ZiweiFlyingStarInput, ZiweiFlyingStarOutput } from './types.js';

export const ziweiFlyingStarManifest = defineCanonicalToolContract<ZiweiFlyingStarInput, ZiweiFlyingStarOutput>({
  definition: ziweiFlyingStarDefinition,
  execute: calculateZiweiFlyingStar,
  renderText: renderZiweiFlyingStarCanonicalText,
  renderJSON: renderZiweiFlyingStarCanonicalJSON,
  canonicalOutputSchema: ziweiFlyingStarOutputSchema,
});
