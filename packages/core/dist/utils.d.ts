/**
 * 共享工具函数和常量
 *
 * 基础干支常量已迁移至 ./constants/ganzhi.ts，此处 re-export 保持向后兼容。
 */
export { TIAN_GAN, DI_ZHI, GAN_WUXING, STEM_ELEMENTS, ZHI_WUXING, YI_MA_MAP, getStemYinYang, } from './constants/ganzhi.js';
export type { TianGan, DiZhi } from './constants/ganzhi.js';
export declare const WU_XING_ORDER: string[];
export declare function getElementRelation(from: string, to: string): string;
export declare function calculateTenGod(dayStem: string, targetStem: string): string;
export declare function getKongWang(dayGan: string, dayZhi: string): {
    xun: string;
    kongZhi: [string, string];
};
export declare function getDiShi(dayStem: string, branch: string): string;
//# sourceMappingURL=utils.d.ts.map