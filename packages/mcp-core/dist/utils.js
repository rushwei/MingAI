/**
 * 共享工具函数和常量
 *
 * 基础干支常量已迁移至 ./constants/ganzhi.ts，此处 re-export 保持向后兼容。
 */
import { TIAN_GAN, DI_ZHI, GAN_WUXING, getStemYinYang, } from './constants/ganzhi.js';
export { TIAN_GAN, DI_ZHI, GAN_WUXING, STEM_ELEMENTS, ZHI_WUXING, YI_MA_MAP, getStemYinYang, } from './constants/ganzhi.js';
// 五行顺序
export const WU_XING_ORDER = ['木', '火', '土', '金', '水'];
// 获取五行生克关系
export function getElementRelation(from, to) {
    const fromIdx = WU_XING_ORDER.indexOf(from);
    const toIdx = WU_XING_ORDER.indexOf(to);
    if (from === to)
        return 'same';
    if ((fromIdx + 1) % 5 === toIdx)
        return 'produce';
    if ((toIdx + 1) % 5 === fromIdx)
        return 'produced';
    if ((fromIdx + 2) % 5 === toIdx)
        return 'control';
    return 'controlled';
}
// 计算十神
export function calculateTenGod(dayStem, targetStem) {
    if (dayStem === targetStem)
        return '比肩';
    const dayElement = GAN_WUXING[dayStem];
    const targetElement = GAN_WUXING[targetStem];
    const dayYY = getStemYinYang(dayStem);
    const targetYY = getStemYinYang(targetStem);
    const sameYY = dayYY === targetYY;
    const relation = getElementRelation(dayElement, targetElement);
    const tenGodMap = {
        'same': ['比肩', '劫财'],
        'produce': ['食神', '伤官'],
        'control': ['偏财', '正财'],
        'controlled': ['七杀', '正官'],
        'produced': ['偏印', '正印'],
    };
    return tenGodMap[relation][sameYY ? 0 : 1];
}
// 旬空表（从 shensha-data 导入）
import { XUN_KONG_TABLE } from './data/shensha-data.js';
// 计算空亡
export function getKongWang(dayGan, dayZhi) {
    const ganIdx = TIAN_GAN.indexOf(dayGan);
    const zhiIdx = DI_ZHI.indexOf(dayZhi);
    if (ganIdx < 0 || zhiIdx < 0) {
        return { xun: '甲子旬', kongZhi: XUN_KONG_TABLE['甲子旬'] };
    }
    const xunStart = (zhiIdx - ganIdx + 12) % 12;
    const xunNames = ['甲子旬', '甲戌旬', '甲申旬', '甲午旬', '甲辰旬', '甲寅旬'];
    const xunStartZhi = ['子', '戌', '申', '午', '辰', '寅'];
    const startZhi = DI_ZHI[xunStart];
    const xunIdx = xunStartZhi.indexOf(startZhi);
    const xun = xunNames[xunIdx] || '甲子旬';
    return {
        xun,
        kongZhi: XUN_KONG_TABLE[xun],
    };
}
