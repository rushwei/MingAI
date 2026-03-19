/**
 * Core 类型定义
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
  longitude?: number;
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

export interface TianGanWuHeItem {
  stemA: string;
  stemB: string;
  resultElement: string;
  positions: [PillarPosition, PillarPosition];
}

export interface DiZhiBanHeItem {
  branches: [string, string];
  resultElement: string;
  missingBranch: string;
  positions: PillarPosition[];
}

export interface TianGanChongKeItem {
  stemA: string;
  stemB: string;
  positions: [PillarPosition, PillarPosition];
}

export interface DiZhiSanHuiItem {
  branches: [string, string, string];
  resultElement: string;
  positions: PillarPosition[];
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
  tianGanWuHe: TianGanWuHeItem[];
  tianGanChongKe: TianGanChongKeItem[];
  diZhiBanHe: DiZhiBanHeItem[];
  diZhiSanHui: DiZhiSanHuiItem[];
  taiYuan?: string;
  mingGong?: string;
  trueSolarTimeInfo?: TrueSolarTimeInfo;
}

export interface BaziFiveElementsStats {
  金: number;
  木: number;
  水: number;
  火: number;
  土: number;
}

export interface BaziShenShaOutput {
  jiShen: string[];
  xiongSha: string[];
  dayYi: string[];
  dayJi: string[];
  pillarShenSha: {
    year: string[];
    month: string[];
    day: string[];
    hour: string[];
  };
}

export interface BaziLiuYueInfo {
  month: number;
  ganZhi: string;
  jieQi: string;
  startDate: string;
  endDate: string;
  gan?: string;
  zhi?: string;
  tenGod?: string;
  hiddenStems?: HiddenStemInfo[];
  naYin?: string;
  diShi?: string;
  shenSha?: string[];
}

export interface BaziLiuRiInfo {
  date: string;
  day: number;
  ganZhi: string;
  gan: string;
  zhi: string;
  tenGod?: string;
  hiddenStems?: HiddenStemInfo[];
  naYin?: string;
  diShi?: string;
  shenSha?: string[];
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
  longitude?: number;
}

export interface SmallLimitEntry {
  palaceName: string;
  ages: number[];
}

export interface ScholarStarEntry {
  starName: string;
  palaceName: string;
}

export interface GanZhiPair {
  gan: string;
  zhi: string;
}

export interface ZiweiOutput {
  solarDate: string;
  lunarDate: string;
  fourPillars: {
    year: GanZhiPair;
    month: GanZhiPair;
    day: GanZhiPair;
    hour: GanZhiPair;
  };
  soul: string;
  body: string;
  fiveElement: string;
  zodiac: string;
  sign: string;
  palaces: PalaceInfo[];
  decadalList: DecadalInfo[];
  earthlyBranchOfSoulPalace?: string;
  earthlyBranchOfBodyPalace?: string;
  time?: string;
  timeRange?: string;
  mutagenSummary?: MutagenSummaryItem[];
  gender?: string;    // 回显性别
  douJun?: string;    // 子年斗君地支
  trueSolarTimeInfo?: TrueSolarTimeInfo;
  lifeMasterStar?: string;   // 命主星
  bodyMasterStar?: string;   // 身主星
  smallLimit?: SmallLimitEntry[];    // 小限
  scholarStars?: ScholarStarEntry[]; // 博士十二星
}

/** 真太阳时校正信息 */
export interface TrueSolarTimeInfo {
  /** 钟表时间 (HH:MM) */
  clockTime: string;
  /** 真太阳时 (HH:MM) */
  trueSolarTime: string;
  /** 出生地经度 */
  longitude: number;
  /** 总校正量（分钟，正值表示真太阳时比钟表时间快） */
  correctionMinutes: number;
  /** 真太阳时对应的时辰索引 (0-12) */
  trueTimeIndex: number;
  /** 跨日偏移（-1=前一天, 0=当天, 1=后一天） */
  dayOffset: number;
}

export interface MutagenSummaryItem {
  mutagen: '禄' | '权' | '科' | '忌';
  starName: string;
  palaceName: string;
}

export interface PalaceInfo {
  name: string;
  heavenlyStem: string;
  earthlyBranch: string;
  isBodyPalace: boolean;
  majorStars: StarInfo[];
  minorStars: StarInfo[];
  adjStars?: StarInfo[];
  index?: number;
  isOriginalPalace?: boolean;
  changsheng12?: string;
  boshi12?: string;
  jiangqian12?: string;
  suiqian12?: string;
  ages?: number[];
  decadalRange?: [number, number];  // 大限虚岁范围 [起, 止]
  liuNianAges?: number[];           // 流年虚岁列表
  sanFangSiZheng?: string[];        // 三方四正宫位名
}

export interface StarInfo {
  name: string;
  type?: string;
  brightness?: string;
  mutagen?: string;
  selfMutagen?: string;       // 离心自化 ↓（宫干四化落回本宫）
  oppositeMutagen?: string;   // 向心自化 ↑（对宫宫干四化飞入本宫）
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

// ===== 紫微运限类型 =====

export interface ZiweiHoroscopeInput extends BirthTimeInput {
  gender: Gender;
  longitude?: number;
  targetDate?: string;
  targetTimeIndex?: number;
}

export interface HoroscopePeriodInfo {
  index: number;
  name: string;
  heavenlyStem: string;
  earthlyBranch: string;
  palaceNames: string[];
  mutagen: string[];
}

export interface TransitStarEntry {
  starName: string;
  palaceName: string;
}

export interface YearlyDecStarInfo {
  jiangqian12: string[];  // 将前十二星
  suiqian12: string[];    // 岁前十二星
}

export interface ZiweiHoroscopeOutput {
  solarDate: string;
  lunarDate: string;
  soul: string;
  body: string;
  fiveElement: string;
  targetDate: string;
  decadal: HoroscopePeriodInfo;
  age: HoroscopePeriodInfo & { nominalAge: number };
  yearly: HoroscopePeriodInfo;
  monthly: HoroscopePeriodInfo;
  daily: HoroscopePeriodInfo;
  hourly: HoroscopePeriodInfo;
  transitStars?: TransitStarEntry[];      // 流年星曜
  yearlyDecStar?: YearlyDecStarInfo;      // 流年神煞（岁前/将前十二星）
}

// ===== 紫微飞星类型 =====

export interface ZiweiFlyingStarInput extends BirthTimeInput {
  gender: Gender;
  longitude?: number;
  queries: FlyingStarQuery[];
}

export type FlyingStarQuery =
  | { type: 'fliesTo'; from: string; to: string; mutagens: string[] }
  | { type: 'selfMutaged'; palace: string; mutagens?: string[] }
  | { type: 'mutagedPlaces'; palace: string }
  | { type: 'surroundedPalaces'; palace: string };

export interface ZiweiFlyingStarOutput {
  results: FlyingStarResult[];
}

export interface FlyingStarResult {
  queryIndex: number;
  type: string;
  result: boolean | MutagedPlaceInfo[] | SurroundedPalaceInfo;
}

export interface MutagedPlaceInfo {
  mutagen: string;
  targetPalace: string | null;
}

export interface SurroundedPalaceInfo {
  target: { name: string; index: number };
  opposite: { name: string; index: number };
  wealth: { name: string; index: number };
  career: { name: string; index: number };
}

// ===== 六爻相关类型 =====

export interface LiuyaoInput {
  question: string;
  yongShenTargets: LiuQinType[];
  method?: 'auto' | 'select' | 'time' | 'number';
  hexagramName?: string;
  changedHexagramName?: string;
  numbers?: number[];
  date: string;  // 占卜日期时间，必须包含时间；支持 YYYY-MM-DDTHH:MM[:SS]、YYYY-MM-DD HH:MM[:SS] 及带时区偏移的 ISO 时间
  seed?: string;
  seedScope?: string;
  responseFormat?: ResponseFormat;
}

export interface LiuyaoOutput {
  question: string;
  seed?: string;
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
  // 互卦/错卦/综卦
  nuclearHexagram?: DerivedHexagramInfo;
  oppositeHexagram?: DerivedHexagramInfo;
  reversedHexagram?: DerivedHexagramInfo;
  // 卦身
  guaShen?: GuaShenInfo;
}

export interface DerivedHexagramInfo {
  name: string;
  guaCi?: string;
  xiangCi?: string;
}

export interface GuaShenInfo {
  branch: string;
  linePosition?: number;
  absent?: boolean;
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

export interface YaoFuShenInfo {
  liuQin: string;
  naJia: string;
  wuXing: string;
  relation: string;  // 伏神与飞神的生克关系
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
  fuShen?: YaoFuShenInfo;
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

// ===== 塔罗相关类型 =====

export interface TarotInput {
  spreadType?: string;
  question?: string;
  allowReversed?: boolean;
  seed?: string;
  seedScope?: string;
  birthYear?: number;
  birthMonth?: number;
  birthDay?: number;
}

export interface TarotNumerologyCard {
  number: number;
  name: string;
  nameChinese: string;
  year?: number;
}

export interface TarotNumerology {
  personalityCard: TarotNumerologyCard;
  soulCard: TarotNumerologyCard;
  yearlyCard: TarotNumerologyCard;
}

export interface TarotOutput {
  spreadId: string;
  spreadName: string;
  question?: string;
  seed: string;
  cards: TarotCardResult[];
  numerology?: TarotNumerology;
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
  number?: number;
  reversedKeywords?: string[];
  element?: string;
  astrologicalCorrespondence?: string;
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

export interface DirectionsInfo {
  caiShen: string;   // 财神方位
  xiShen: string;    // 喜神方位
  fuShen: string;    // 福神方位
  yangGui: string;   // 阳贵人方位
  yinGui: string;    // 阴贵人方位
}

export interface HourlyFortuneInfo {
  ganZhi: string;       // 时辰干支
  tianShen: string;     // 时辰天神
  tianShenType: string; // 黄道/黑道
  tianShenLuck: string; // 吉/凶
  chong: string;        // 冲
  sha: string;          // 煞
  suitable: string[];   // 宜
  avoid: string[];      // 忌
}

export interface NineStarInfo {
  number: number;       // 飞星数字 (1-9)
  description: string;  // 完整描述
  color: string;        // 颜色
  wuXing: string;       // 五行
  position: string;     // 方位
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
  pengZuBaiJi: string;       // 彭祖百忌（完整文本）
  jishen: string[];
  xiongsha: string[];
  directions: DirectionsInfo;
  dayOfficer: string;       // 建除十二值星
  tianShen: string;          // 天神（日）
  tianShenType: string;      // 黄道/黑道
  tianShenLuck: string;      // 吉/凶
  lunarMansion: string;      // 二十八星宿
  lunarMansionLuck: string;  // 星宿吉凶
  lunarMansionSong: string;  // 星宿歌诀
  nayin: string;             // 日柱纳音
  dayNineStar?: NineStarInfo;  // 日九宫飞星
  taiShen?: string;            // 胎神占方
  hourlyFortune: HourlyFortuneInfo[];
}

// ===== 大运相关类型 =====

export interface DayunInput extends BirthTimeInput {
  gender: Gender;
}

export interface BranchRelation {
  type: '六合' | '六冲' | '三合' | '相刑' | '相害';
  branches: string[];
  description: string;
}

export interface LiunianInfo {
  year: number;
  age: number;
  ganZhi: string;
  gan: string;
  zhi: string;
  tenGod: string;
  nayin: string;
  hiddenStems: HiddenStemInfo[];
  diShi: string;
  shenSha: string[];
  branchRelations: BranchRelation[];
  taiSui: string[];
}

export interface XiaoyunInfo {
  age: number;
  ganZhi: string;
  tenGod: string;
}

export interface DayunOutput {
  startAge: number;
  startAgeDetail: string;
  xiaoYun: XiaoyunInfo[];
  list: Array<{
    startYear: number;
    startAge: number;
    ganZhi: string;
    stem: string;
    branch: string;
    tenGod: string;
    branchTenGod: string;
    hiddenStems: HiddenStemInfo[];
    naYin: string;
    diShi: string;
    shenSha: string[];
    branchRelations: BranchRelation[];
    liunianList: LiunianInfo[];
  }>;
}

// ===== 奇门遁甲相关类型 =====

export interface QimenInput {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute?: number;
  timezone?: string;
  question?: string;
  panType?: 'zhuan';
  juMethod?: 'chaibu' | 'maoshan';
  zhiFuJiGong?: 'ji_liuyi' | 'ji_wugong';
}

export interface QimenPalaceInfo {
  palaceIndex: number;        // 宫位序号 1-9
  palaceName: string;         // 卦名（坎、坤、震...）
  direction: string;          // 方位
  element: string;            // 宫五行
  earthStem: string;          // 地盘天干
  heavenStem: string;         // 天盘天干
  star: string;               // 九星
  starElement: string;        // 星五行
  gate: string;               // 八门
  gateElement: string;        // 门五行
  deity: string;              // 八神
  formations: string[];       // 该宫格局列表
  stemWangShuai?: string;     // 天干旺衰状态
  elementState?: string;      // 宫五行旺衰
  isKongWang?: boolean;       // 是否空亡
  isYiMa?: boolean;           // 是否驿马
  isRuMu?: boolean;           // 是否入墓
}

export interface QimenOutput {
  dateInfo: {
    solarDate: string;
    lunarDate: string;
    solarTerm: string;
    solarTermRange?: string;
  };
  siZhu: {
    year: string;
    month: string;
    day: string;
    hour: string;
  };
  dunType: 'yang' | 'yin';
  juNumber: number;
  yuan: string;
  xunShou: string;
  zhiFu: { star: string; palace: number };
  zhiShi: { gate: string; palace: number };
  palaces: QimenPalaceInfo[];
  kongWang: {
    dayKong: { branches: string[]; palaces: number[] };
    hourKong: { branches: string[]; palaces: number[] };
  };
  yiMa: { branch: string; palace: number };
  globalFormations: string[];
  panType: string;
  juMethod: string;
  question?: string;
}
