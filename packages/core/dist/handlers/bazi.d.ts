/**
 * 八字计算处理器
 */
import type { BaziFiveElementsStats, BaziLiuRiInfo, BaziLiuYueInfo, BaziInput, BaziOutput, BaziShenShaOutput, HiddenStemInfo } from '../types.js';
import { getDiShi as getDiShiCore } from '../utils.js';
type PillarShenShaByPosition = {
    year: string[];
    month: string[];
    day: string[];
    hour: string[];
};
type FortuneRuntimeContext = {
    dayStem: string;
    dayBranch: string;
    yearBranch: string;
};
export declare function getNaYin(stem: string, branch: string): string;
export declare const getDiShi: typeof getDiShiCore;
/** 从纳音字符串提取五行（最后一个字：金/木/水/火/土） */
export declare function getNaYinElement(nayin: string): string;
export declare function calculateBaziFiveElementsStats(fourPillars: BaziOutput['fourPillars']): BaziFiveElementsStats;
export declare function buildHiddenStems(branch: string, dayStem: string): HiddenStemInfo[];
export declare function calculateBaziPillarShenSha(params: {
    yearStem: string;
    yearBranch: string;
    monthStem: string;
    monthBranch: string;
    dayStem: string;
    dayBranch: string;
    hourStem: string;
    hourBranch: string;
    kongWang: {
        xun: string;
        kongZhi: [string, string];
    };
    yearNaYinElement?: string;
}): PillarShenShaByPosition;
export declare function calculateBaziFortuneShenSha(params: {
    targetBranch: string;
    dayStem: string;
    dayBranch: string;
    yearBranch: string;
}): string[];
export declare function calculateBaziLiuYueData(year: number, context?: FortuneRuntimeContext): BaziLiuYueInfo[];
export declare function calculateBaziLiuRiData(startDate: string, endDate: string, context?: FortuneRuntimeContext): BaziLiuRiInfo[];
export declare function calculateBaziData(input: BaziInput): BaziOutput;
export declare function calculateBaziShenShaData(input: BaziInput): BaziShenShaOutput;
export declare function handleBaziCalculate(input: BaziInput): Promise<BaziOutput>;
export {};
//# sourceMappingURL=bazi.d.ts.map