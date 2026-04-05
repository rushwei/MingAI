/**
 * 紫微斗数排盘核心引擎
 */
import type { DecadalInfo, ZiweiInput, ZiweiOutput } from './types.js';
import { createAstrolabeWithTrueSolar } from './ziwei-shared.js';
export { calculateZiweiHoroscopeData, calculateZiweiHoroscopeDataWithAstrolabe } from './ziwei-horoscope-core.js';
export { createAstrolabeWithTrueSolar } from './ziwei-shared.js';
export type { ZiweiInput, ZiweiOutput } from './types.js';
export declare function calculateZiweiDecadalListWithAstrolabe(astrolabe: ReturnType<typeof createAstrolabeWithTrueSolar>['astrolabe']): DecadalInfo[];
export declare function calculateZiweiDataWithAstrolabe(input: ZiweiInput): {
    output: ZiweiOutput;
    astrolabe: ReturnType<typeof createAstrolabeWithTrueSolar>['astrolabe'];
};
export declare function calculateZiweiData(input: ZiweiInput): ZiweiOutput;
//# sourceMappingURL=ziwei-core.d.ts.map