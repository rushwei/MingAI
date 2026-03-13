/**
 * MCP Core 类型定义
 */

// ===== 公共类型 =====

export type Gender = 'male' | 'female';
export type CalendarType = 'solar' | 'lunar';
export type ResponseFormat = 'json' | 'markdown';

// ===== 公共出生时间类型 =====
export interface BirthTimeInput {
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: number;
  birthMinute?: number;
  calendarType?: CalendarType;
  isLeapMonth?: boolean;
}

// ===== 八字相关类型 =====

export interface BaziInput extends BirthTimeInput {
  gender: Gender;
  birthPlace?: string;
}

export interface HiddenStemInfo {
  stem: string;
  qiType: '本气' | '中气' | '余气';
  tenGod: string;
}

export interface GlobalKongWangInfo {
  xun: string;
  kongZhi: [string, string];
}

export interface PillarKongWangInfo {
  isKong: boolean;
}

export type PillarPosition = '年支' | '月支' | '日支' | '时支';

export interface PillarRelation {
  type: '合' | '冲' | '刑' | '害';
  pillars: PillarPosition[];
  description: string;
}

export interface BaziOutput {
  gender: Gender;
  birthPlace?: string;
  dayMaster: string;
  kongWang: GlobalKongWangInfo;
  fourPillars: {
    year: PillarInfo;
    month: PillarInfo;
    day: PillarInfo;
    hour: PillarInfo;
  };
  relations: PillarRelation[];
}

export interface PillarInfo {
  stem: string;
  branch: string;
  tenGod?: string;
  hiddenStems: HiddenStemInfo[];
  naYin?: string;
  diShi?: string;
  shenSha: string[];
  kongWang: PillarKongWangInfo;
}

export interface BaziPillarsResolveInput {
  yearPillar: string;
  monthPillar: string;
  dayPillar: string;
  hourPillar: string;
}

export interface BaziPillarsResolveCandidate {
  candidateId: string;
  isLeapMonth: boolean;
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: number;
  birthMinute: number;
  solarText: string;
  lunarText: string;
  nextCall: {
    tool: 'bazi_calculate';
    arguments: {
      birthYear: number;
      birthMonth: number;
      birthDay: number;
      birthHour: number;
      birthMinute: number;
      calendarType: 'lunar';
      isLeapMonth: boolean;
    };
    missing: ['gender'];
  };
}

export interface BaziPillarsResolveOutput {
  pillars: {
    yearPillar: string;
    monthPillar: string;
    dayPillar: string;
    hourPillar: string;
  };
  count: number;
  candidates: BaziPillarsResolveCandidate[];
}

// ===== 紫微相关类型 =====

export interface ZiweiInput extends BirthTimeInput {
  gender: Gender;
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
  yongShenTargets: LiuQinType[];
  method?: 'auto' | 'select';
  hexagramName?: string;
  changedHexagramName?: string;
  date?: string;
  seed?: string;
  seedScope?: string;
  responseFormat?: ResponseFormat;
}

export interface LiuyaoOutput {
  seed: string;
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
  changedGuaCi?: string;
  changedXiangCi?: string;
  // 时间信息
  ganZhiTime: GanZhiTime;
  kongWang: KongWangInfo;
  kongWangByPillar: KongWangByPillarInfo;
  // 爻信息
  fullYaos: FullYaoInfo[];
  // 用神系统
  yongShen: YongShenGroupInfo[];
  fuShen?: FuShenInfo[];
  shenSystemByYongShen: ShenSystemByYongShenInfo[];
  globalShenSha: string[];
  // 分析结果
  liuChongGuaInfo?: LiuChongGuaInfo;
  liuHeGuaInfo?: LiuHeGuaInfo;
  chongHeTransition?: ChongHeTransition;
  guaFanFuYin?: GuaFanFuYinInfo;
  sanHeAnalysis?: SanHeAnalysisInfo;
  warnings?: string[];
  timeRecommendations?: TimeRecommendation[];
}

export type LiuQinType = '父母' | '兄弟' | '子孙' | '妻财' | '官鬼';
export type WuXing = '木' | '火' | '土' | '金' | '水';
export type TianGan = '甲' | '乙' | '丙' | '丁' | '戊' | '己' | '庚' | '辛' | '壬' | '癸';
export type DiZhi = '子' | '丑' | '寅' | '卯' | '辰' | '巳' | '午' | '未' | '申' | '酉' | '戌' | '亥';
export type YaoMovementState = 'static' | 'changing' | 'hidden_moving' | 'day_break';
export type WangShuai = 'wang' | 'xiang' | 'xiu' | 'qiu' | 'si';
export type KongWangState = 'not_kong' | 'kong_static' | 'kong_changing' | 'kong_ri_chong' | 'kong_yue_jian';
export type YaoSpecialStatus = 'none' | 'anDong' | 'riPo' | 'yuePo';
export type YongShenSelectionStatus = 'resolved' | 'ambiguous' | 'from_changed' | 'from_temporal' | 'from_fushen' | 'missing';
export type CandidateStrength = 'strong' | 'moderate' | 'weak' | 'unknown';

export interface ChangedYaoDetail {
  type: number;
  liuQin: string;
  naJia: string;
  wuXing: string;
  liuShen: string;
  yaoCi?: string;
  relation: string;
}

export interface GanZhiTime {
  year: { gan: string; zhi: string };
  month: { gan: string; zhi: string };
  day: { gan: string; zhi: string };
  hour: { gan: string; zhi: string };
  xun: string;
}

export interface YaoStrengthInfo {
  wangShuai: WangShuai;
  isStrong: boolean;
  specialStatus: YaoSpecialStatus;
  evidence: string[];
}

export interface YongShenCandidateInfo {
  liuQin: string;
  naJia?: string;
  changedNaJia?: string;
  huaType?: string;
  element: string;
  position?: number;
  source: 'visible' | 'changed' | 'temporal' | 'fushen';
  strength: CandidateStrength;
  strengthLabel: string;
  movementState: YaoMovementState;
  movementLabel: string;
  isShiYao: boolean;
  isYingYao: boolean;
  kongWangState?: KongWangState;
  evidence: string[];
}

export interface YongShenGroupInfo {
  targetLiuQin: LiuQinType;
  selectionStatus: YongShenSelectionStatus;
  selectionNote: string;
  selected: YongShenCandidateInfo;
  candidates: YongShenCandidateInfo[];
}

export interface KongWangInfo {
  xun: string;
  kongDizhi: [DiZhi, DiZhi];
}

export interface KongWangByPillarInfo {
  year: KongWangInfo;
  month: KongWangInfo;
  day: KongWangInfo;
  hour: KongWangInfo;
}

export interface FullYaoInfo {
  position: number;
  type: number;
  isChanging: boolean;
  movementState: YaoMovementState;
  movementLabel: string;
  liuQin: string;
  liuShen: string;
  naJia: string;
  wuXing: string;
  isShiYao: boolean;
  isYingYao: boolean;
  kongWangState?: KongWangState;
  strength: YaoStrengthInfo;
  yaoCi?: string;
  changedYao: ChangedYaoDetail | null;
  shenSha: string[];
  changSheng?: {
    stage: string;
    strength: 'strong' | 'medium' | 'weak';
  };
}

export interface FuShenInfo {
  liuQin: string;
  wuXing: string;
  naJia: string;
  feiShenPosition: number;
  feiShenLiuQin?: string;
  availabilityStatus: 'available' | 'conditional' | 'blocked';
  availabilityReason: string;
}

export interface ShenSystemInfo {
  yuanShen?: { liuQin: string; wuXing: string; positions: number[] };
  jiShen?: { liuQin: string; wuXing: string; positions: number[] };
  chouShen?: { liuQin: string; wuXing: string; positions: number[] };
}

export interface ShenSystemByYongShenInfo extends ShenSystemInfo {
  targetLiuQin: LiuQinType;
}

export interface LiuChongGuaInfo {
  isLiuChongGua: boolean;
  description?: string;
}

export interface LiuHeGuaInfo {
  isLiuHeGua: boolean;
  description?: string;
}

export interface ChongHeTransition {
  type: 'chong_to_he' | 'he_to_chong' | 'none';
  description?: string;
}

export interface GuaFanFuYinInfo {
  isFanYin: boolean;
  isFuYin: boolean;
  description?: string;
}

export interface SanHeAnalysisInfo {
  hasFullSanHe: boolean;
  fullSanHe?: { name: string; result: string; positions: number[]; description?: string };
  fullSanHeList?: Array<{ name: string; result: string; positions: number[]; description?: string }>;
  hasBanHe: boolean;
  banHe?: Array<{ branches: string[]; result: string; type: string; positions: number[] }>;
}

export interface TimeRecommendation {
  targetLiuQin: LiuQinType;
  type: 'favorable' | 'unfavorable' | 'critical';
  trigger: string;
  earthlyBranch?: string;
  basis: string[];
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
  seed?: string;
  seedScope?: string;
}

export interface TarotOutput {
  spreadId: string;
  spreadName: string;
  question?: string;
  seed: string;
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

// ===== 大运相关类型 =====

export interface DayunInput extends BirthTimeInput {
  gender: Gender;
}

export interface DayunOutput {
  list: Array<{
    startYear: number;
    ganZhi: string;
    stem: string;
    branch: string;
    tenGod: string;
    branchTenGod: string;
    hiddenStems: HiddenStemInfo[];
    naYin: string;
    diShi: string;
    shenSha: string[];
  }>;
}
