/**
 * 八字计算处理器
 */
import type { BaziInput, BaziOutput, HiddenStemInfo } from '../types.js';
export declare function getNaYin(stem: string, branch: string): string;
export declare function getDiShi(dayStem: string, branch: string): string;
export declare function buildHiddenStems(branch: string, dayStem: string): HiddenStemInfo[];
export declare function handleBaziCalculate(input: BaziInput): Promise<BaziOutput>;
//# sourceMappingURL=bazi.d.ts.map