/**
 * 共享工具函数和常量
 */

// 天干五行对应表
export const STEM_ELEMENTS: Record<string, string> = {
  '甲': '木', '乙': '木',
  '丙': '火', '丁': '火',
  '戊': '土', '己': '土',
  '庚': '金', '辛': '金',
  '壬': '水', '癸': '水',
};

// 五行顺序
export const WU_XING_ORDER = ['木', '火', '土', '金', '水'];

// 获取天干阴阳
export function getStemYinYang(stem: string): 'yang' | 'yin' {
  const yangStems = ['甲', '丙', '戊', '庚', '壬'];
  return yangStems.includes(stem) ? 'yang' : 'yin';
}

// 获取五行生克关系（内部函数，被 calculateTenGod 使用）
function getElementRelation(from: string, to: string): string {
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

  const dayElement = STEM_ELEMENTS[dayStem];
  const targetElement = STEM_ELEMENTS[targetStem];
  const dayYY = getStemYinYang(dayStem);
  const targetYY = getStemYinYang(targetStem);
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
