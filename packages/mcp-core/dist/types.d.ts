/**
 * MCP Core 类型定义
 */
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
    isAuspicious: boolean;
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
    daYun: {
        startAgeDetail: string;
        list: Array<{
            startYear: number;
            ganZhi: string;
            tenGod: string;
            branchTenGod: string;
        }>;
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
export interface LiuyaoInput {
    question: string;
    yongShenTargets: LiuQinType[];
    method?: 'auto' | 'select';
    hexagramName?: string;
    changedHexagramName?: string;
    date?: string;
    seed?: string;
}
export interface LiuyaoOutput {
    seed: string;
    question: string;
    hexagramName: string;
    hexagramGong: string;
    hexagramElement: string;
    hexagramBrief?: string;
    guaCi?: string;
    xiangCi?: string;
    changedHexagramName?: string;
    changedHexagramGong?: string;
    changedHexagramElement?: string;
    ganZhiTime: GanZhiTime;
    kongWang?: KongWangInfo;
    fullYaos: FullYaoInfo[];
    yongShen: YongShenGroupInfo[];
    fuShen?: FuShenInfo[];
    shenSystemByYongShen: ShenSystemByYongShenInfo[];
    globalShenSha: string[];
    liuChongGuaInfo?: LiuChongGuaInfo;
    sanHeAnalysis?: SanHeAnalysisInfo;
    warnings?: string[];
    timeRecommendations?: TimeRecommendation[];
}
export type LiuQinType = '父母' | '兄弟' | '子孙' | '妻财' | '官鬼';
export type YaoMovementState = 'static' | 'changing' | 'hidden_moving' | 'day_break';
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
    year: {
        gan: string;
        zhi: string;
    };
    month: {
        gan: string;
        zhi: string;
    };
    day: {
        gan: string;
        zhi: string;
    };
    hour: {
        gan: string;
        zhi: string;
    };
}
export interface YongShenCandidateInfo {
    liuQin: string;
    naJia?: string;
    element: string;
    position?: number;
    strengthScore: number;
    isStrong: boolean;
    strengthLabel: string;
    movementState: YaoMovementState;
    movementLabel: string;
    isShiYao: boolean;
    isYingYao: boolean;
    kongWangState?: string;
    factors: string[];
}
export interface YongShenGroupInfo {
    targetLiuQin: LiuQinType;
    candidates: YongShenCandidateInfo[];
}
export interface KongWangInfo {
    xun: string;
    kongZhi: [string, string];
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
    wangShuai: string;
    wangShuaiLabel: string;
    kongWangState?: string;
    kongWangLabel?: string;
    strengthScore?: number;
    isStrong?: boolean;
    strengthFactors?: string[];
    changSheng?: string;
    shenSha: string[];
    changedYao: ChangedYaoDetail | null;
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
    yuanShen?: {
        liuQin: string;
        wuXing: string;
        positions: number[];
    };
    jiShen?: {
        liuQin: string;
        wuXing: string;
        positions: number[];
    };
    chouShen?: {
        liuQin: string;
        wuXing: string;
        positions: number[];
    };
}
export interface ShenSystemByYongShenInfo extends ShenSystemInfo {
    targetLiuQin: LiuQinType;
}
export interface LiuChongGuaInfo {
    isLiuChongGua: boolean;
    description?: string;
}
export interface SanHeAnalysisInfo {
    hasFullSanHe: boolean;
    fullSanHe?: {
        name: string;
        result: string;
        positions: number[];
    };
    hasBanHe: boolean;
    banHe?: Array<{
        branches: string[];
        result: string;
        type: string;
        positions: number[];
    }>;
}
export interface TimeRecommendation {
    targetLiuQin: LiuQinType;
    type: 'favorable' | 'unfavorable' | 'critical';
    earthlyBranch?: string;
    startDate: string;
    endDate: string;
    confidence: number;
    description: string;
}
export interface SummaryInfo {
    overallTrend: 'favorable' | 'neutral' | 'unfavorable';
    keyFactors: string[];
}
export interface TarotInput {
    spreadType?: string;
    question?: string;
    allowReversed?: boolean;
    seed?: string;
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
export interface FortuneInput {
    dayMaster?: string;
    birthYear?: number;
    birthMonth?: number;
    birthDay?: number;
    birthHour?: number;
    date?: string;
    seed?: string;
}
export interface FortuneOutput {
    date: string;
    seed: string;
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
    currentDaYun: {
        startYear: number;
        endYear: number;
        ganZhi: string;
        tenGod: string;
    };
    liunian: {
        year: number;
        ganZhi: string;
        tenGod: string;
    };
    liuyue?: {
        month: number;
        ganZhi: string;
        tenGod: string;
    };
    analysis: {
        trend: 'favorable' | 'neutral' | 'unfavorable';
        keyFactors: string[];
    };
}
//# sourceMappingURL=types.d.ts.map