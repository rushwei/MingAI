/**
 * 共享工具函数和常量
 *
 * 基础干支常量已迁移至 ./constants/ganzhi.ts，此处 re-export 保持向后兼容。
 */

import {
  TIAN_GAN as _TIAN_GAN,
  DI_ZHI as _DI_ZHI,
  STEM_ELEMENTS as _STEM_ELEMENTS,
  getStemYinYang as _getStemYinYang,
} from './constants/ganzhi.js';

export {
  TIAN_GAN,
  DI_ZHI,
  GAN_WUXING,
  STEM_ELEMENTS,
  ZHI_WUXING,
  YI_MA_MAP,
  getStemYinYang,
} from './constants/ganzhi.js';
export type { TianGan, DiZhi } from './constants/ganzhi.js';

// 五行顺序
export const WU_XING_ORDER = ['木', '火', '土', '金', '水'];

// 获取五行生克关系
export function getElementRelation(from: string, to: string): string {
  const fromIdx = WU_XING_ORDER.indexOf(from);
  const toIdx = WU_XING_ORDER.indexOf(to);

  if (from === to) return 'same';
  if ((fromIdx + 1) % 5 === toIdx) return 'produce';
  if ((toIdx + 1) % 5 === fromIdx) return 'produced';
  if ((fromIdx + 2) % 5 === toIdx) return 'control';
  return 'controlled';
}

// 计算十神
export function calculateTenGod(dayStem: string, targetStem: string): string {
  if (dayStem === targetStem) return '比肩';

  const dayElement = _STEM_ELEMENTS[dayStem];
  const targetElement = _STEM_ELEMENTS[targetStem];
  const dayYY = _getStemYinYang(dayStem);
  const targetYY = _getStemYinYang(targetStem);
  const sameYY = dayYY === targetYY;

  const relation = getElementRelation(dayElement, targetElement);

  const tenGodMap: Record<string, [string, string]> = {
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
export function getKongWang(dayGan: string, dayZhi: string): { xun: string; kongZhi: [string, string] } {
  const ganIdx = _TIAN_GAN.indexOf(dayGan as typeof _TIAN_GAN[number]);
  const zhiIdx = _DI_ZHI.indexOf(dayZhi as typeof _DI_ZHI[number]);
  if (ganIdx < 0 || zhiIdx < 0) {
    return { xun: '甲子旬', kongZhi: XUN_KONG_TABLE['甲子旬'] };
  }

  const xunStart = (zhiIdx - ganIdx + 12) % 12;
  const xunNames = ['甲子旬', '甲戌旬', '甲申旬', '甲午旬', '甲辰旬', '甲寅旬'];
  const xunStartZhi = ['子', '戌', '申', '午', '辰', '寅'];
  const startZhi = _DI_ZHI[xunStart];
  const xunIdx = xunStartZhi.indexOf(startZhi);
  const xun = xunNames[xunIdx] || '甲子旬';

  return {
    xun,
    kongZhi: XUN_KONG_TABLE[xun],
  };
}
