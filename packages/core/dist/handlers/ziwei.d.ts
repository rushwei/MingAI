/**
 * 紫微斗数排盘处理器
 */
import type { ZiweiInput, ZiweiOutput, DecadalInfo } from '../types.js';
import { createAstrolabeWithTrueSolar } from './ziwei-shared.js';
export { createAstrolabeWithTrueSolar } from './ziwei-shared.js';
export { calculateZiweiHoroscopeData, calculateZiweiHoroscopeDataWithAstrolabe } from './ziwei-horoscope.js';
export declare function calculateZiweiDecadalListWithAstrolabe(astrolabe: ReturnType<typeof createAstrolabeWithTrueSolar>['astrolabe']): DecadalInfo[];
export declare function calculateZiweiDataWithAstrolabe(input: ZiweiInput): {
    output: ZiweiOutput;
    astrolabe: ReturnType<typeof createAstrolabeWithTrueSolar>['astrolabe'];
};
export declare function calculateZiweiData(input: ZiweiInput): ZiweiOutput;
export declare function handleZiweiCalculate(input: ZiweiInput): Promise<ZiweiOutput>;
//# sourceMappingURL=ziwei.d.ts.map