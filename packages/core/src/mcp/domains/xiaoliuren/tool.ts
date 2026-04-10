import { defineToolContract } from '../../contract.js';
import { xiaoliurenDefinition } from './definition.js';
import { xiaoliurenOutputSchema } from './output-schema.js';
import { calculateXiaoliurenData } from '../../../domains/xiaoliuren/calculate.js';
import { toXiaoliurenJson } from '../../../domains/xiaoliuren/json.js';
import { toXiaoliurenText } from '../../../domains/xiaoliuren/text.js';
import type { XiaoliurenInput, XiaoliurenOutput } from '../../../domains/xiaoliuren/types.js';

export const xiaoliurenManifest = defineToolContract<XiaoliurenInput, XiaoliurenOutput>({
  definition: xiaoliurenDefinition,
  execute: calculateXiaoliurenData,
  renderText: (output) => toXiaoliurenText(output),
  renderJSON: (output) => toXiaoliurenJson(output),
  outputSchema: xiaoliurenOutputSchema,
});
