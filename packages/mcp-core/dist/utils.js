/**
 * 共享工具函数和常量
 */
// 天干五行对应表
export const STEM_ELEMENTS = {
    '甲': '木', '乙': '木',
    '丙': '火', '丁': '火',
    '戊': '土', '己': '土',
    '庚': '金', '辛': '金',
    '壬': '水', '癸': '水',
};
// 五行顺序
export const WU_XING_ORDER = ['木', '火', '土', '金', '水'];
// 天干列表
export const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
// 地支列表
export const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
// 获取天干阴阳
export function getStemYinYang(stem) {
    const yangStems = ['甲', '丙', '戊', '庚', '壬'];
    return yangStems.includes(stem) ? 'yang' : 'yin';
}
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
    const dayElement = STEM_ELEMENTS[dayStem];
    const targetElement = STEM_ELEMENTS[targetStem];
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
