import { baziDayunOutputSchema } from './domains/bazi-dayun/output-schema.js';
import { baziPillarsResolveOutputSchema } from './domains/bazi-pillars-resolve/output-schema.js';
import { baziCalculateOutputSchema } from './domains/bazi/output-schema.js';
import { daliurenOutputSchema } from './domains/daliuren/output-schema.js';
import { almanacOutputSchema } from './domains/fortune/output-schema.js';
import { liuyaoOutputSchema } from './domains/liuyao/output-schema.js';
import { meihuaOutputSchema } from './domains/meihua/output-schema.js';
import { qimenCalculateOutputSchema } from './domains/qimen/output-schema.js';
import { tarotOutputSchema } from './domains/tarot/output-schema.js';
import { ziweiFlyingStarOutputSchema } from './domains/ziwei-flying-star/output-schema.js';
import { ziweiHoroscopeOutputSchema } from './domains/ziwei-horoscope/output-schema.js';
import { ziweiCalculateOutputSchema } from './domains/ziwei/output-schema.js';
import type { ToolDefinition } from './tool-schema.js';

type OutputSchema = NonNullable<ToolDefinition['outputSchema']>;

export const canonicalOutputSchemas: Record<string, OutputSchema> = {
  bazi_calculate: baziCalculateOutputSchema,
  bazi_pillars_resolve: baziPillarsResolveOutputSchema,
  ziwei_calculate: ziweiCalculateOutputSchema,
  ziwei_horoscope: ziweiHoroscopeOutputSchema,
  ziwei_flying_star: ziweiFlyingStarOutputSchema,
  liuyao: liuyaoOutputSchema,
  meihua: meihuaOutputSchema,
  tarot: tarotOutputSchema,
  almanac: almanacOutputSchema,
  bazi_dayun: baziDayunOutputSchema,
  qimen_calculate: qimenCalculateOutputSchema,
  daliuren: daliurenOutputSchema,
};
