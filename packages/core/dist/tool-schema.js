import { baziDayunDefinition } from './domains/bazi-dayun/schema.js';
import { baziPillarsResolveDefinition } from './domains/bazi-pillars-resolve/schema.js';
import { baziCalculateDefinition } from './domains/bazi/schema.js';
import { daliurenDefinition } from './domains/daliuren/schema.js';
import { almanacDefinition } from './domains/fortune/schema.js';
import { liuyaoDefinition } from './domains/liuyao/schema.js';
import { qimenCalculateDefinition } from './domains/qimen/schema.js';
import { tarotDefinition } from './domains/tarot/schema.js';
import { ziweiFlyingStarDefinition } from './domains/ziwei-flying-star/schema.js';
import { ziweiHoroscopeDefinition } from './domains/ziwei-horoscope/schema.js';
import { ziweiCalculateDefinition } from './domains/ziwei/schema.js';
export const toolDefinitions = [
    baziCalculateDefinition,
    baziPillarsResolveDefinition,
    ziweiCalculateDefinition,
    ziweiHoroscopeDefinition,
    ziweiFlyingStarDefinition,
    liuyaoDefinition,
    tarotDefinition,
    almanacDefinition,
    baziDayunDefinition,
    qimenCalculateDefinition,
    daliurenDefinition,
];
