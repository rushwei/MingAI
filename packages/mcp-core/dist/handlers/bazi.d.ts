/**
 * 八字计算处理器
 */
import type { BaziInput, BaziOutput, HiddenStemInfo } from '../types.js';
export declare function getNaYin(stem: string, branch: string): string;
/** 从纳音字符串提取五行（最后一个字：金/木/水/火/土） */
export declare function getNaYinElement(nayin: string): string;
export declare function getDiShi(dayStem: string, branch: string): string;
export declare function buildHiddenStems(branch: string, dayStem: string): HiddenStemInfo[];
export declare function handleBaziCalculate(input: BaziInput): Promise<BaziOutput>;
//# sourceMappingURL=bazi.d.ts.map