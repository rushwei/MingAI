/**
 * MCP Core 类型定义
 */

// ===== 八字相关类型 =====

export type Gender = 'male' | 'female';
export type CalendarType = 'solar' | 'lunar';

export interface BaziInput {
  gender: Gender;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: number;
  birthMinute?: number;
  calendarType?: CalendarType;
  isLeapMonth?: boolean;
  birthPlace?: string;
}

export interface BaziOutput {
  gender: Gender;
  birthPlace?: string;
  dayMaster: string;
  fourPillars: {
    year: PillarInfo;
    month: PillarInfo;
    day: PillarInfo;
    hour: PillarInfo;
  };
  daYun: {
    startAgeDetail: string;
    list: Array<{
      startYear: number;
      ganZhi: string;
    }>;
  };
  shenSha?: ShenShaInfo;
}

export interface ShenShaInfo {
  tianYiGuiRen?: string[];    // 天乙贵人
  wenChangGuiRen?: string[];  // 文昌贵人
  yiMa?: string[];            // 驿马
  taoHua?: string[];          // 桃花
  huaGai?: string[];          // 华盖
  jiangXing?: string[];       // 将星
  yangRen?: string[];         // 羊刃
  luShen?: string[];          // 禄神
  tianDeGuiRen?: string;      // 天德贵人
  yueDeGuiRen?: string;       // 月德贵人
  kuiGang?: boolean;          // 魁罡
  jinYu?: boolean;            // 金舆
  tianLuodiWang?: string[];   // 天罗地网
}

export interface PillarInfo {
  stem: string;
  branch: string;
  tenGod?: string;
  hiddenStems: string[];
  naYin?: string;
  diShi?: string;
}

// ===== 紫微相关类型 =====

export interface ZiweiInput {
  gender: Gender;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: number;
  birthMinute?: number;
  calendarType?: CalendarType;
  isLeapMonth?: boolean;
}

export interface ZiweiOutput {
  solarDate: string;
  lunarDate: string;
  fourPillars: {
    year: string;
    month: string;
    day: string;
    hour: string;
  };
  soul: string;
  body: string;
  fiveElement: string;
  zodiac: string;
  sign: string;
  palaces: PalaceInfo[];
  decadalList: DecadalInfo[];
}

export interface PalaceInfo {
  name: string;
  heavenlyStem: string;
  earthlyBranch: string;
  isBodyPalace: boolean;
  majorStars: StarInfo[];
  minorStars: StarInfo[];
  adjStars?: StarInfo[];
}

export interface StarInfo {
  name: string;
  brightness?: string;
  mutagen?: string;
}

export interface DecadalInfo {
  startAge: number;
  endAge: number;
  heavenlyStem: string;
  palace: {
    earthlyBranch: string;
    name: string;
  };
}

// ===== 六爻相关类型 =====

export interface LiuyaoInput {
  question: string;
  method?: 'auto' | 'select';
  hexagramName?: string;
  changedHexagramName?: string;
  date?: string;
}

export interface LiuyaoOutput {
  question: string;
  // 本卦信息
  hexagramName: string;
  hexagramGong: string;
  hexagramElement: string;
  hexagramBrief?: string;
  guaCi?: string;
  xiangCi?: string;
  // 变卦信息
  changedHexagramName?: string;
  changedHexagramGong?: string;
  changedHexagramElement?: string;
  changedLines: number[];
  changedYaoCi?: string[];
  // 时间信息
  ganZhiTime: GanZhiTime;
  kongWang?: KongWangInfo;
  // 爻信息
  fullYaos?: FullYaoInfo[];
  changedYaos?: ChangedYaoInfo[];
  // 用神系统
  yongShen: YongShenInfo;
  fuShen?: FuShenInfo[];
  shenSystem?: ShenSystemInfo;
  // 分析结果
  liuChongGuaInfo?: LiuChongGuaInfo;
  sanHeAnalysis?: SanHeAnalysisInfo;
  warnings?: string[];
  timeRecommendations?: TimeRecommendation[];
  summary?: SummaryInfo;
}

// 变爻简化信息
export interface ChangedYaoInfo {
  position: number;
  type: number;
  liuQin: string;
  naJia: string;
  wuXing: string;
}

export interface GanZhiTime {
  year: { gan: string; zhi: string };
  month: { gan: string; zhi: string };
  day: { gan: string; zhi: string };
  hour: { gan: string; zhi: string };
}

export interface YongShenInfo {
  type: string;
  liuQin: string;
  element: string;
  position: number;
  strengthScore: number;
  isStrong: boolean;
  strengthLabel: string;
  kongWangState?: string;
  factors?: string[];
}

export interface KongWangInfo {
  xun: string;
  kongZhi: [string, string];
}

export interface FullYaoInfo {
  position: number;
  type: number;
  change: string;
  liuQin: string;
  liuShen: string;
  naJia: string;
  wuXing: string;
  isShiYao: boolean;
  isYingYao: boolean;
  // 旺衰状态
  wangShuai: string;
  wangShuaiLabel: string;
  kongWangState?: string;
  kongWangLabel?: string;
  // 强度评分
  strengthScore?: number;
  isStrong?: boolean;
  strengthFactors?: string[];
  // 十二长生
  changSheng?: string;
  // 变爻分析
  changeAnalysis?: {
    huaType: string;
    huaLabel: string;
    isGood: boolean;
  };
}

export interface FuShenInfo {
  liuQin: string;
  wuXing: string;
  naJia: string;
  feiShenPosition: number;
  isAvailable: boolean;
  availabilityReason: string;
}

export interface ShenSystemInfo {
  yuanShen?: { liuQin: string; wuXing: string; positions: number[] };
  jiShen?: { liuQin: string; wuXing: string; positions: number[] };
  chouShen?: { liuQin: string; wuXing: string; positions: number[] };
}

export interface LiuChongGuaInfo {
  isLiuChongGua: boolean;
  description?: string;
}

export interface SanHeAnalysisInfo {
  hasFullSanHe: boolean;
  fullSanHe?: { name: string; result: string; positions: number[] };
  hasBanHe: boolean;
  banHe?: Array<{ branches: string[]; result: string; type: string; positions: number[] }>;
}

export interface TimeRecommendation {
  type: 'favorable' | 'unfavorable' | 'critical';
  timeframe: string;
  earthlyBranch?: string;
  description: string;
}

export interface SummaryInfo {
  overallTrend: 'favorable' | 'neutral' | 'unfavorable';
  keyFactors: string[];
}

// ===== 塔罗相关类型 =====

export interface TarotInput {
  spreadType?: string;
  question?: string;
  allowReversed?: boolean;
}

export interface TarotOutput {
  spreadId: string;
  spreadName: string;
  question?: string;
  cards: TarotCardResult[];
}

export interface TarotCardResult {
  position: string;
  card: {
    name: string;
    nameChinese: string;
    keywords: string[];
  };
  orientation: 'upright' | 'reversed';
  meaning: string;
}

// ===== 运势相关类型 =====

export interface FortuneInput {
  dayMaster?: string;
  birthYear?: number;
  birthMonth?: number;
  birthDay?: number;
  birthHour?: number;
  date?: string;
}

export interface FortuneOutput {
  date: string;
  dayInfo: {
    stem: string;
    branch: string;
    ganZhi: string;
  };
  tenGod?: string;
  scores: {
    overall: number;
    career: number;
    love: number;
    wealth: number;
    health: number;
    social: number;
  };
  advice: string[];
  luckyColor?: string;
  luckyDirection?: string;
  almanac: AlmanacInfo;
}

export interface AlmanacInfo {
  lunarDate: string;
  lunarMonth: string;
  lunarDay: string;
  zodiac: string;
  solarTerm?: string;
  suitable: string[];
  avoid: string[];
  chongSha: string;
  pengZuBaiJi: string[];
  jishen: string[];
  xiongsha: string[];
}

// ===== 流年流月流日相关类型 =====

export interface LiunianInput {
  gender: Gender;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: number;
  birthMinute?: number;
  calendarType?: CalendarType;
  isLeapMonth?: boolean;
  targetYear?: number;
  targetMonth?: number;
}

export interface LiunianOutput {
  // 大运信息
  currentDaYun: {
    startYear: number;
    endYear: number;
    ganZhi: string;
    tenGod: string;
  };
  // 流年信息
  liunian: {
    year: number;
    ganZhi: string;
    tenGod: string;
  };
  // 流月信息（如果提供了targetMonth）
  liuyue?: {
    month: number;
    ganZhi: string;
    tenGod: string;
  };
  // 综合分析
  analysis: {
    trend: 'favorable' | 'neutral' | 'unfavorable';
    keyFactors: string[];
  };
}
