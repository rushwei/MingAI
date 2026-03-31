/**
 * CanonicalJSON 输出类型定义
 * 与 text.ts 的 render*CanonicalText() 平行，提供结构化 JSON 输出。
 */

// ===== 共用子类型 =====

export interface TrueSolarTimeJSON {
  clockTime: string;
  trueSolarTime: string;
  longitude: number;
  correctionMinutes: number;
}

export interface DayunItemJSON {
  startYear: number;
  ganZhi: string;
  tenGod: string;
  hiddenStems: Array<{ stem: string; tenGod: string }>;
  diShi: string;
  naYin: string;
  shenSha: string[];
}

// ===== 八字 =====

export interface BaziPillarJSON {
  pillar: string;
  ganZhi: string;
  tenGod: string;
  hiddenStems: Array<{ stem: string; tenGod: string }>;
  diShi: string;
  naYin: string;
  shenSha: string[];
  isKong?: boolean;
}

export interface BaziCanonicalJSON {
  basicInfo: {
    gender: string;
    dayMaster: string;
    dayMasterElement: string;
    kongWang?: string[];
    birthPlace?: string;
    trueSolarTime?: TrueSolarTimeJSON;
    taiYuan?: string;
    mingGong?: string;
  };
  fourPillars: BaziPillarJSON[];
  relations: string[];
  dayun?: {
    startInfo: string;
    list: DayunItemJSON[];
  };
}

// ===== 六爻 =====

export interface DerivedHexagramJSON {
  卦名: string;
  卦辞?: string;
  象辞?: string;
}

export interface LiuyaoYaoJSON {
  爻位: string;
  世应?: string;
  六亲: string;
  六神: string;
  纳甲: string;
  五行: string;
  旺衰: string;
  动静状态?: string;
  动静: string;
  空亡?: string;
  长生?: string;
  神煞?: string[];
  变爻?: {
    六亲: string;
    纳甲: string;
    五行: string;
    关系: string;
  };
  伏神?: {
    六亲: string;
    纳甲: string;
    五行: string;
    关系: string;
  };
}

export interface LiuyaoYongShenJSON {
  目标六亲: string;
  取用状态: string;
  取用说明?: string;
  已选用神: {
    爻位?: string;
    六亲: string;
    纳甲?: string;
    变爻纳甲?: string;
    化变类型?: string;
    五行?: string;
    来源?: string;
    动静状态?: string;
    是否世爻?: '是';
    是否应爻?: '是';
    空亡状态?: string;
    强弱: string;
    动静: string;
    依据?: string[];
  };
  候选用神?: Array<{
    爻位?: string;
    六亲: string;
    纳甲?: string;
    变爻纳甲?: string;
    化变类型?: string;
    五行?: string;
    来源?: string;
    动静状态?: string;
    是否世爻?: '是';
    是否应爻?: '是';
    空亡状态?: string;
    依据?: string[];
  }>;
  神煞系统?: {
    原神?: string;
    忌神?: string;
    仇神?: string;
  };
  应期提示?: Array<{
    触发: string;
    依据: string[];
    说明: string;
  }>;
}

export interface LiuyaoCanonicalJSON {
  卦盘: {
    问题?: string;
    本卦: {
      卦名: string;
      卦宫: string;
      五行: string;
      卦辞?: string;
      象辞?: string;
    };
    变卦?: {
      卦名: string;
      卦宫?: string;
      五行?: string;
      卦辞?: string;
      象辞?: string;
      动爻爻辞?: Array<{ 爻名: string; 爻辞: string }>;
    };
    nuclearHexagram?: DerivedHexagramJSON;
    oppositeHexagram?: DerivedHexagramJSON;
    reversedHexagram?: DerivedHexagramJSON;
    guaShen?: {
      branch: string;
      position?: string;
      state?: string;
    };
  };
  ganZhiTime: Array<{
    pillar: string;
    ganZhi: string;
    kongWang: string[];
  }>;
  yaos: LiuyaoYaoJSON[];
  yongShenAnalysis: LiuyaoYongShenJSON[];
  guaLevelAnalysis: string[];
  warnings: string[];
  globalShenSha?: string[];
}

export interface LiuyaoAISafeLineJSON {
  position?: string;
  liuQin: string;
  naJia?: string;
  wuXing?: string;
  shiYing?: 'shi' | 'ying';
  shenSha?: string[];
  wangShuai?: string;
  movement?: string;
  kongWang?: string;
  changedTo?: {
    liuQin: string;
    naJia: string;
    wuXing: string;
  };
  transformation?: string;
}

export interface LiuyaoAISafeParticipantJSON {
  source: '动爻' | '变爻' | '月建' | '日建';
  branch: string;
  position?: string;
}

export interface LiuyaoAISafeBoardLineJSON {
  position: string;
  liuShen: string;
  fuShen?: {
    liuQin: string;
    naJia: string;
    wuXing: string;
  };
  mainLine: {
    liuQin: string;
    naJia: string;
    wuXing: string;
  };
  changedTo?: {
    liuQin: string;
    naJia: string;
    wuXing: string;
  };
  transformation?: string;
  shiYing?: 'shi' | 'ying';
}

export interface LiuyaoAISafeLineFlagJSON {
  position: string;
  wangShuai: string;
  movement: string;
  kongWang?: string;
  transformation?: string;
}

export interface LiuyaoAISafeCombinationJSON {
  kind: '半合' | '三合';
  resultElement: string;
  participants?: LiuyaoAISafeParticipantJSON[];
  name?: string;
  positions?: string[];
}

export interface LiuyaoAISafeTransitionJSON {
  kind: '冲转合' | '合转冲';
}

export interface LiuyaoAISafeResonanceJSON {
  kind: '反吟' | '伏吟';
}

export interface LiuyaoAISafeJSON {
  board: {
    question?: string;
    mainHexagram: {
      name: string;
      gong: string;
      element: string;
      guaCi?: string;
    };
    changedHexagram?: {
      name: string;
      gong?: string;
      element?: string;
      guaCi?: string;
      changingYaos?: string[];
      changingYaoCi?: Array<{
        yaoName: string;
        yaoCi: string;
      }>;
    };
    ganZhiTime: Array<{
      pillar: string;
      ganZhi: string;
      kongWang: string[];
    }>;
    guaShen?: {
      branch: string;
      position?: string;
      state?: string;
    };
    derivedHexagrams?: {
      nuclearHexagram?: { name: string };
      oppositeHexagram?: { name: string };
      reversedHexagram?: { name: string };
    };
    globalShenSha?: string[];
  };
  fullBoard: {
    lines: LiuyaoAISafeBoardLineJSON[];
  };
  globalInteractions: {
    combinations: LiuyaoAISafeCombinationJSON[];
    transitions?: LiuyaoAISafeTransitionJSON[];
    resonances?: LiuyaoAISafeResonanceJSON[];
    isLiuChongGua?: '是' | '否';
    isLiuHeGua?: '是' | '否';
    chongHeTransition?: '冲转合' | '合转冲';
  };
  meta: {
    detailLevel: 'default' | 'more' | 'full';
  };
}

// ===== 塔罗 =====

export interface TarotCardJSON {
  position: string;
  cardName: string;
  direction: string;
  keywords: string[];
  meaning: string;
  element?: string;
  astrologicalCorrespondence?: string;
}

export interface TarotNumerologyCardJSON {
  name: string;
  keywords: string[];
  element?: string;
  astrologicalCorrespondence?: string;
}

export interface TarotCanonicalJSON {
  basicInfo: {
    spreadName: string;
    question?: string;
    birthDate?: string;
  };
  cards: TarotCardJSON[];
  numerology?: {
    personalityCard: TarotNumerologyCardJSON;
    soulCard: TarotNumerologyCardJSON;
    yearlyCard: TarotNumerologyCardJSON & { year: number };
  };
}

// ===== 紫微 =====

export interface ZiweiStarJSON {
  name: string;
  brightness?: string;
  mutagen?: string;
  selfMutagen?: string;
  oppositeMutagen?: string;
}

export interface ZiweiPalaceJSON {
  name: string;
  index?: number;
  ganZhi: string;
  isBodyPalace: boolean;
  isOriginalPalace?: boolean;
  majorStars: ZiweiStarJSON[];
  minorStars: ZiweiStarJSON[];
  adjStars: ZiweiStarJSON[];
  shenSha: string[];
  decadalRange?: string;
  liuNianAges: number[];
  ages: number[];
}

export interface ZiweiCanonicalJSON {
  basicInfo: {
    gender?: string;
    solarDate: string;
    lunarDate: string;
    fourPillars: string;
    soul: string;
    body: string;
    fiveElement: string;
    time?: string;
    douJun?: string;
    lifeMasterStar?: string;
    bodyMasterStar?: string;
    trueSolarTime?: TrueSolarTimeJSON;
  };
  palaces: ZiweiPalaceJSON[];
  smallLimit?: Array<{
    palaceName: string;
    ages: number[];
  }>;
}

// ===== 奇门遁甲 =====

export interface QimenPalaceJSON {
  palaceName: string;
  palaceIndex: number;
  element: string;
  elementState?: string;
  deity: string;
  heavenStem: string;
  earthStem: string;
  star: string;
  gate: string;
  starElement?: string;
  gateElement?: string;
  formations: string[];
  isDayKong?: boolean;
  isHourKong?: boolean;
  isYiMa?: boolean;
  isRuMu?: boolean;
}

export interface QimenCanonicalJSON {
  basicInfo: {
    solarDate: string;
    lunarDate: string;
    solarTerm: string;
    solarTermRange?: string;
    fourPillars: string;
    ju: string;
    yuan: string;
    xunShou: string;
    panType: string;
    question?: string;
  };
  palaces: QimenPalaceJSON[];
  monthPhaseMap?: Record<string, string>;
}

// ===== 大六壬 =====

export interface DaliurenCanonicalJSON {
  basicInfo: {
    date: string;
    lunarDate?: string;
    bazi: string;
    ganZhi: {
      year: string;
      month: string;
      day: string;
      hour: string;
    };
    yueJiang: string;
    kongWang: string[];
    yiMa: string;
    dingMa: string;
    tianMa: string;
    diurnal: string;
    keTi: { method: string; subTypes: string[]; extraTypes: string[] };
    keName?: string;
    benMing?: string;
    xingNian?: string;
    question?: string;
  };
  siKe: Array<{
    ke: string;
    upper: string;
    lower: string;
    tianJiang: string;
  }>;
  sanChuan: Array<{
    chuan: string;
    branch: string;
    tianJiang: string;
    liuQin: string;
    dunGan: string;
  }>;
  gongInfos: Array<{
    diZhi: string;
    wuXing?: string;
    wangShuai?: string;
    tianZhi: string;
    tianJiang: string;
    dunGan: string;
    changSheng: string;
    jianChu: string;
  }>;
  shenSha: Record<string, string[]>;
}

// ===== 每日运势 =====

export interface FortuneCanonicalJSON {
  basicInfo: {
    date: string;
    dayGanZhi: string;
    tenGod: string;
  };
  almanac: {
    lunarDate: string;
    zodiac: string;
    solarTerm?: string;
    chongSha?: string;
    pengZuBaiJi?: string;
    taiShen?: string;
    dayNineStar?: { description: string; position: string };
    suitable: string[];
    avoid: string[];
    jishen: string[];
    xiongsha: string[];
  };
}

// ===== 大运 =====

export interface DayunCanonicalJSON {
  startInfo: {
    startAge: number;
    detail: string;
  };
  list: DayunItemJSON[];
}

// ===== 四柱反推 =====

export interface BaziPillarsResolveCanonicalJSON {
  originalPillars: {
    yearPillar: string;
    monthPillar: string;
    dayPillar: string;
    hourPillar: string;
  };
  count: number;
  candidates: Array<{
    candidateId: string;
    lunarText: string;
    solarText: string;
    birthTime: string;
    isLeapMonth: boolean;
  }>;
}

// ===== 紫微运限 =====

export interface ZiweiHoroscopeCanonicalJSON {
  basicInfo: {
    solarDate: string;
    lunarDate: string;
    soul: string;
    body: string;
    fiveElement: string;
    targetDate: string;
  };
  periods: Array<{
    label: string;
    palaceIndex: number;
    name: string;
    ganZhi: string;
    mutagen: string[];
    palaceNames: string[];
    nominalAge?: number;
  }>;
  transitStars?: Array<{ starName: string; palaceName: string }>;
  yearlyDecStar?: {
    suiqian12: string[];
    jiangqian12: string[];
  };
}

// ===== 紫微飞星 =====

export interface ZiweiFlyingStarResultJSON {
  queryIndex: number;
  type: string;
  booleanResult?: boolean;
  mutagedPlaces?: Array<{ mutagen: string; targetPalace: string | null }>;
  surroundedPalaces?: { target: string; opposite: string; wealth: string; career: string };
}

export interface ZiweiFlyingStarCanonicalJSON {
  results: ZiweiFlyingStarResultJSON[];
}
