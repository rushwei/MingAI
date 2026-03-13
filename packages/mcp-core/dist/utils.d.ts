/**
 * 共享工具函数和常量
 */
import type { TianGan as TianGanType, DiZhi as DiZhiType } from './types.js';
export declare const STEM_ELEMENTS: Record<string, string>;
export declare const WU_XING_ORDER: string[];
export declare const TIAN_GAN: readonly ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
export type TianGan = TianGanType;
export declare const DI_ZHI: readonly ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];
export type DiZhi = DiZhiType;
export declare function getStemYinYang(stem: string): 'yang' | 'yin';
export declare function getElementRelation(from: string, to: string): string;
export declare function calculateTenGod(dayStem: string, targetStem: string): string;
export declare function getKongWang(dayGan: string, dayZhi: string): {
    xun: string;
    kongZhi: [string, string];
};
//# sourceMappingURL=utils.d.ts.map