import type { ToolOutputSchema } from './contract.js';

export type OutputSchema = ToolOutputSchema;

export const str = (description?: string) => ({ type: 'string', ...(description ? { description } : {}) });
export const num = (description?: string) => ({ type: 'number', ...(description ? { description } : {}) });
export const bool = (description?: string) => ({ type: 'boolean', ...(description ? { description } : {}) });
export const arr = (items: Record<string, unknown>, description?: string) => ({
  type: 'array',
  items,
  ...(description ? { description } : {}),
});
export const obj = (properties: Record<string, unknown>, description?: string): OutputSchema => ({
  type: 'object',
  properties,
  ...(description ? { description } : {}),
});

export const trueSolarTimeSchema = obj({
  clockTime: str('钟表时间'),
  trueSolarTime: str('真太阳时'),
  longitude: num('经度'),
  correctionMinutes: num('校正分钟数'),
}, '真太阳时信息');

export const hiddenStemSchema = obj({
  stem: str('藏干天干'),
  tenGod: str('藏干十神'),
  qiType: str('气性'),
});

export const branchRelationSchema = obj({
  type: str('关系类型'),
  branches: arr(str(), '涉及地支'),
  description: str('关系描述'),
});

export const liunianItemSchema = obj({
  year: num('流年年份'),
  age: num('年龄'),
  ganZhi: str('干支'),
  gan: str('天干'),
  zhi: str('地支'),
  tenGod: str('天干十神'),
  nayin: str('纳音'),
  hiddenStems: arr(hiddenStemSchema, '藏干'),
  diShi: str('地势'),
  shenSha: arr(str(), '神煞'),
  branchRelations: arr(branchRelationSchema, '地支关系'),
  taiSui: arr(str(), '太岁关系'),
});

export const dayunItemSchema = obj({
  startYear: num('起始年份'),
  startAge: num('起运年龄'),
  ganZhi: str('干支'),
  stem: str('天干'),
  branch: str('地支'),
  tenGod: str('十神'),
  branchTenGod: str('地支主气十神'),
  hiddenStems: arr(hiddenStemSchema, '藏干'),
  diShi: str('地势'),
  naYin: str('纳音'),
  shenSha: arr(str(), '神煞'),
  branchRelations: arr(branchRelationSchema, '原局关系'),
  liunianList: arr(liunianItemSchema, '流年列表'),
});
