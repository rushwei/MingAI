/**
 * 紫微斗数运限处理器
 */
import type { ZiweiHoroscopeInput, ZiweiHoroscopeOutput } from '../types.js';
import { createAstrolabeWithTrueSolar } from './ziwei-shared.js';
type Astrolabe = ReturnType<typeof createAstrolabeWithTrueSolar>['astrolabe'];
export declare function calculateZiweiHoroscopeDataWithAstrolabe(astrolabe: Astrolabe, options?: {
    targetDate?: string | Date;
    targetTimeIndex?: number;
}): ZiweiHoroscopeOutput;
export declare function calculateZiweiHoroscopeData(input: ZiweiHoroscopeInput): ZiweiHoroscopeOutput;
export declare function handleZiweiHoroscope(input: ZiweiHoroscopeInput): Promise<ZiweiHoroscopeOutput>;
export {};
//# sourceMappingURL=ziwei-horoscope.d.ts.map