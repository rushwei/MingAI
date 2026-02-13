/**
 * 八字计算处理器
 */

import { Solar, Lunar, LunarMonth, LunarYear } from 'lunar-javascript';
import type {
  BaziInput,
  BaziOutput,
  HiddenStemInfo,
  PillarInfo,
  PillarKongWangInfo,
  PillarPosition,
  PillarRelation,
} from '../types.js';
import {
  STEM_ELEMENTS,
  getStemYinYang,
  calculateTenGod,
} from '../utils.js';
import { calculatePillarShenSha as calculateSharedPillarShenSha } from '../shensha.js';

type PillarShenShaByPosition = {
  year: string[];
  month: string[];
  day: string[];
  hour: string[];
};

const TIAN_GAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'] as const;
const DI_ZHI = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'] as const;

const HIDDEN_STEM_DETAILS: Record<string, Array<{ stem: string; qiType: '本气' | '中气' | '余气' }>> = {
  '子': [{ stem: '癸', qiType: '本气' }],
  '丑': [{ stem: '己', qiType: '本气' }, { stem: '癸', qiType: '中气' }, { stem: '辛', qiType: '余气' }],
  '寅': [{ stem: '甲', qiType: '本气' }, { stem: '丙', qiType: '中气' }, { stem: '戊', qiType: '余气' }],
  '卯': [{ stem: '乙', qiType: '本气' }],
  '辰': [{ stem: '戊', qiType: '本气' }, { stem: '乙', qiType: '中气' }, { stem: '癸', qiType: '余气' }],
  '巳': [{ stem: '丙', qiType: '本气' }, { stem: '庚', qiType: '中气' }, { stem: '戊', qiType: '余气' }],
  '午': [{ stem: '丁', qiType: '本气' }, { stem: '己', qiType: '中气' }],
  '未': [{ stem: '己', qiType: '本气' }, { stem: '丁', qiType: '中气' }, { stem: '乙', qiType: '余气' }],
  '申': [{ stem: '庚', qiType: '本气' }, { stem: '壬', qiType: '中气' }, { stem: '戊', qiType: '余气' }],
  '酉': [{ stem: '辛', qiType: '本气' }],
  '戌': [{ stem: '戊', qiType: '本气' }, { stem: '辛', qiType: '中气' }, { stem: '丁', qiType: '余气' }],
  '亥': [{ stem: '壬', qiType: '本气' }, { stem: '甲', qiType: '中气' }],
};

const NA_YIN_TABLE: Record<string, string> = {
  '甲子': '海中金', '乙丑': '海中金',
  '丙寅': '炉中火', '丁卯': '炉中火',
  '戊辰': '大林木', '己巳': '大林木',
  '庚午': '路旁土', '辛未': '路旁土',
  '壬申': '剑锋金', '癸酉': '剑锋金',
  '甲戌': '山头火', '乙亥': '山头火',
  '丙子': '涧下水', '丁丑': '涧下水',
  '戊寅': '城头土', '己卯': '城头土',
  '庚辰': '白蜡金', '辛巳': '白蜡金',
  '壬午': '杨柳木', '癸未': '杨柳木',
  '甲申': '泉中水', '乙酉': '泉中水',
  '丙戌': '屋上土', '丁亥': '屋上土',
  '戊子': '霹雳火', '己丑': '霹雳火',
  '庚寅': '松柏木', '辛卯': '松柏木',
  '壬辰': '长流水', '癸巳': '长流水',
  '甲午': '砂中金', '乙未': '砂中金',
  '丙申': '山下火', '丁酉': '山下火',
  '戊戌': '平地木', '己亥': '平地木',
  '庚子': '壁上土', '辛丑': '壁上土',
  '壬寅': '金箔金', '癸卯': '金箔金',
  '甲辰': '覆灯火', '乙巳': '覆灯火',
  '丙午': '天河水', '丁未': '天河水',
  '戊申': '大驿土', '己酉': '大驿土',
  '庚戌': '钗钏金', '辛亥': '钗钏金',
  '壬子': '桑柘木', '癸丑': '桑柘木',
  '甲寅': '大溪水', '乙卯': '大溪水',
  '丙辰': '沙中土', '丁巳': '沙中土',
  '戊午': '天上火', '己未': '天上火',
  '庚申': '石榴木', '辛酉': '石榴木',
  '壬戌': '大海水', '癸亥': '大海水',
};

const DI_SHI_ORDER = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
const CHANG_SHENG_START: Record<string, string> = {
  '木': '亥', '火': '寅', '土': '寅', '金': '巳', '水': '申',
};

const LIU_HE: Record<string, string> = {
  '子': '丑', '丑': '子',
  '寅': '亥', '亥': '寅',
  '卯': '戌', '戌': '卯',
  '辰': '酉', '酉': '辰',
  '巳': '申', '申': '巳',
  '午': '未', '未': '午',
};

const SAN_HE: Array<{ branches: string[]; element: string }> = [
  { branches: ['申', '子', '辰'], element: '水局' },
  { branches: ['巳', '酉', '丑'], element: '金局' },
  { branches: ['寅', '午', '戌'], element: '火局' },
  { branches: ['亥', '卯', '未'], element: '木局' },
];

const LIU_CHONG: Record<string, string> = {
  '子': '午', '午': '子',
  '丑': '未', '未': '丑',
  '寅': '申', '申': '寅',
  '卯': '酉', '酉': '卯',
  '辰': '戌', '戌': '辰',
  '巳': '亥', '亥': '巳',
};

const XIANG_HAI: Record<string, string> = {
  '子': '未', '未': '子',
  '丑': '午', '午': '丑',
  '寅': '巳', '巳': '寅',
  '卯': '辰', '辰': '卯',
  '申': '亥', '亥': '申',
  '酉': '戌', '戌': '酉',
};

const XIANG_XING: Array<{ combination: string[]; name: string }> = [
  { combination: ['寅', '巳', '申'], name: '无恩之刑' },
  { combination: ['丑', '戌', '未'], name: '恃势之刑' },
  { combination: ['子', '卯'], name: '无礼之刑' },
  { combination: ['辰'], name: '辰自刑' },
  { combination: ['午'], name: '午自刑' },
  { combination: ['酉'], name: '酉自刑' },
  { combination: ['亥'], name: '亥自刑' },
];

const XUN_KONG_TABLE: Record<string, [string, string]> = {
  '甲子旬': ['戌', '亥'],
  '甲戌旬': ['申', '酉'],
  '甲申旬': ['午', '未'],
  '甲午旬': ['辰', '巳'],
  '甲辰旬': ['寅', '卯'],
  '甲寅旬': ['子', '丑'],
};

// 八字专属神煞规则（shared shensha 未覆盖）
const YUE_DE: Record<string, string> = {
  '寅': '丙', '午': '丙', '戌': '丙',
  '申': '壬', '子': '壬', '辰': '壬',
  '亥': '甲', '卯': '甲', '未': '甲',
  '巳': '庚', '酉': '庚', '丑': '庚',
};

const TIAN_DE: Record<string, string> = {
  '寅': '丁', '卯': '申', '辰': '壬', '巳': '辛',
  '午': '亥', '未': '甲', '申': '癸', '酉': '寅',
  '戌': '丙', '亥': '乙', '子': '巳', '丑': '庚',
};

const JIN_YU: Record<string, string> = {
  '甲': '辰', '乙': '巳', '丙': '未', '丁': '申',
  '戊': '未', '己': '申', '庚': '戌', '辛': '亥',
  '壬': '丑', '癸': '寅',
};

const DE_XIU: Record<string, string[]> = {
  '寅': ['丙', '甲'], '卯': ['甲', '乙'], '辰': ['壬', '癸'], '巳': ['丙', '庚'],
  '午': ['丁', '己'], '未': ['甲', '己'], '申': ['庚', '壬'], '酉': ['辛', '庚'],
  '戌': ['丙', '戊'], '亥': ['壬', '甲'], '子': ['癸', '壬'], '丑': ['辛', '己'],
};

const TIAN_DE_HE: Record<string, string> = {
  '寅': '壬', '卯': '癸', '辰': '丁', '巳': '丙',
  '午': '寅', '未': '己', '申': '戊', '酉': '丁',
  '戌': '辛', '亥': '庚', '子': '庚', '丑': '乙',
};

const YUE_DE_HE: Record<string, string> = {
  '寅': '辛', '午': '辛', '戌': '辛',
  '申': '丁', '子': '丁', '辰': '丁',
  '亥': '己', '卯': '己', '未': '己',
  '巳': '乙', '酉': '乙', '丑': '乙',
};

export function getNaYin(stem: string, branch: string): string {
  return NA_YIN_TABLE[`${stem}${branch}`] || '';
}

export function getDiShi(dayStem: string, branch: string): string {
  const element = STEM_ELEMENTS[dayStem];
  if (!element) return '';

  const startBranch = CHANG_SHENG_START[element];
  const startIdx = DI_ZHI.indexOf(startBranch as (typeof DI_ZHI)[number]);
  const branchIdx = DI_ZHI.indexOf(branch as (typeof DI_ZHI)[number]);
  if (startIdx < 0 || branchIdx < 0) return '';

  const isYang = getStemYinYang(dayStem) === 'yang';
  const offset = isYang
    ? (branchIdx - startIdx + 12) % 12
    : (startIdx - branchIdx + 12) % 12;

  return DI_SHI_ORDER[offset];
}

function getKongWang(dayGan: string, dayZhi: string): { xun: string; kongZhi: [string, string] } {
  const ganIdx = TIAN_GAN.indexOf(dayGan as (typeof TIAN_GAN)[number]);
  const zhiIdx = DI_ZHI.indexOf(dayZhi as (typeof DI_ZHI)[number]);
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

export function buildHiddenStems(branch: string, dayStem: string): HiddenStemInfo[] {
  const stems = HIDDEN_STEM_DETAILS[branch] || [];
  return stems.map((item) => ({
    stem: item.stem,
    qiType: item.qiType,
    tenGod: calculateTenGod(dayStem, item.stem),
  }));
}

function buildPillarKongWang(branch: string, kongWang: { xun: string; kongZhi: [string, string] }): PillarKongWangInfo {
  return {
    isKong: kongWang.kongZhi.includes(branch),
  };
}

function createPillar(stem: string, branch: string, dayStem: string): PillarInfo {
  return {
    stem,
    branch,
    tenGod: calculateTenGod(dayStem, stem),
    hiddenStems: buildHiddenStems(branch, dayStem),
    naYin: getNaYin(stem, branch),
    diShi: getDiShi(dayStem, branch),
    shenSha: [],
    kongWang: { isKong: false },
  };
}

const PILLAR_POSITION_MAP: Record<string, PillarPosition> = {
  year: '年支',
  month: '月支',
  day: '日支',
  hour: '时支',
  yearBranch: '年支',
  monthBranch: '月支',
  dayBranch: '日支',
  hourBranch: '时支',
  YearBranch: '年支',
  MonthBranch: '月支',
  DayBranch: '日支',
  HourBranch: '时支',
  年: '年支',
  月: '月支',
  日: '日支',
  时: '时支',
  年柱: '年支',
  月柱: '月支',
  日柱: '日支',
  时柱: '时支',
  年支: '年支',
  月支: '月支',
  日支: '日支',
  时支: '时支',
};

function normalizePillarPosition(label: string): PillarPosition {
  const normalized = PILLAR_POSITION_MAP[label];
  if (!normalized) {
    throw new Error(`Invalid pillar position label: ${label}`);
  }
  return normalized;
}

function analyzePillarRelations(yearBranch: string, monthBranch: string, dayBranch: string, hourBranch: string): PillarRelation[] {
  const branches = [yearBranch, monthBranch, dayBranch, hourBranch];
  const pillarNames = ['year', 'month', 'day', 'hour'] as const;
  const relations: PillarRelation[] = [];

  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      if (LIU_HE[branches[i]] === branches[j]) {
        relations.push({
          type: '合',
          pillars: [normalizePillarPosition(pillarNames[i]), normalizePillarPosition(pillarNames[j])],
          description: `${branches[i]}${branches[j]}六合`,
        });
      }
    }
  }

  for (const sanHe of SAN_HE) {
    const matchingBranches = branches.filter((b) => sanHe.branches.includes(b));
    const uniqueBranches = Array.from(new Set(matchingBranches));
    if (uniqueBranches.length >= 2) {
      const matchingPillars = branches
        .map((b, i) => (sanHe.branches.includes(b) ? normalizePillarPosition(pillarNames[i]) : null))
        .filter(Boolean) as PillarPosition[];

      if (uniqueBranches.length === 3) {
        relations.push({
          type: '合',
          pillars: matchingPillars,
          description: `${uniqueBranches.join('')}三合${sanHe.element}`,
        });
      } else {
        relations.push({
          type: '合',
          pillars: matchingPillars,
          description: `${uniqueBranches.join('')}半合${sanHe.element}`,
        });
      }
    }
  }

  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      if (LIU_CHONG[branches[i]] === branches[j]) {
        relations.push({
          type: '冲',
          pillars: [normalizePillarPosition(pillarNames[i]), normalizePillarPosition(pillarNames[j])],
          description: `${branches[i]}${branches[j]}相冲`,
        });
      }
    }
  }

  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      if (XIANG_HAI[branches[i]] === branches[j]) {
        relations.push({
          type: '害',
          pillars: [normalizePillarPosition(pillarNames[i]), normalizePillarPosition(pillarNames[j])],
          description: `${branches[i]}${branches[j]}相害`,
        });
      }
    }
  }

  for (const xing of XIANG_XING) {
    const matchingBranches = branches.filter((b) => xing.combination.includes(b));
    if (xing.combination.length === 1) {
      const count = branches.filter((b) => b === xing.combination[0]).length;
      if (count >= 2) {
        const matchingPillars = branches
          .map((b, i) => (b === xing.combination[0] ? normalizePillarPosition(pillarNames[i]) : null))
          .filter(Boolean) as PillarPosition[];
        relations.push({
          type: '刑',
          pillars: matchingPillars,
          description: xing.name,
        });
      }
    } else if (matchingBranches.length >= 2) {
      const matchingPillars = branches
        .map((b, i) => (xing.combination.includes(b) ? normalizePillarPosition(pillarNames[i]) : null))
        .filter(Boolean) as PillarPosition[];
      relations.push({
        type: '刑',
        pillars: matchingPillars,
        description: xing.name,
      });
    }
  }

  return relations;
}

function calculatePillarShenSha(params: {
  yearStem: string;
  yearBranch: string;
  monthStem: string;
  monthBranch: string;
  dayStem: string;
  dayBranch: string;
  hourStem: string;
  hourBranch: string;
  kongWang: { xun: string; kongZhi: [string, string] };
}): PillarShenShaByPosition {
  const shenSha = calculateSharedPillarShenSha(params);
  const {
    yearStem,
    yearBranch,
    monthBranch,
    dayStem,
    dayBranch,
    hourStem,
    hourBranch,
  } = params;

  const pushUnique = (position: keyof PillarShenShaByPosition, name: string) => {
    if (!shenSha[position].includes(name)) {
      shenSha[position].push(name);
    }
  };

  const jinYuBranch = JIN_YU[dayStem];
  if (jinYuBranch === yearBranch) pushUnique('year', '金舆');
  if (jinYuBranch === monthBranch) pushUnique('month', '金舆');
  if (jinYuBranch === dayBranch) pushUnique('day', '金舆');
  if (jinYuBranch === hourBranch) pushUnique('hour', '金舆');

  const yueDeStem = YUE_DE[monthBranch];
  if (yueDeStem === yearStem) pushUnique('year', '月德贵人');
  if (yueDeStem === dayStem) pushUnique('day', '月德贵人');
  if (yueDeStem === hourStem) pushUnique('hour', '月德贵人');

  const tianDeChar = TIAN_DE[monthBranch];
  if (tianDeChar === yearStem || tianDeChar === yearBranch) pushUnique('year', '天德贵人');
  if (tianDeChar === dayStem || tianDeChar === dayBranch) pushUnique('day', '天德贵人');
  if (tianDeChar === hourStem || tianDeChar === hourBranch) pushUnique('hour', '天德贵人');

  const deXiuStems = DE_XIU[monthBranch] || [];
  if (deXiuStems.includes(dayStem)) pushUnique('day', '德秀贵人');
  if (deXiuStems.includes(hourStem)) pushUnique('hour', '德秀贵人');

  const tianDeHeChar = TIAN_DE_HE[monthBranch];
  if (tianDeHeChar === yearStem || tianDeHeChar === yearBranch) pushUnique('year', '天德合');
  if (tianDeHeChar === dayStem || tianDeHeChar === dayBranch) pushUnique('day', '天德合');
  if (tianDeHeChar === hourStem || tianDeHeChar === hourBranch) pushUnique('hour', '天德合');

  const yueDeHeStem = YUE_DE_HE[monthBranch];
  if (yueDeHeStem === yearStem) pushUnique('year', '月德合');
  if (yueDeHeStem === dayStem) pushUnique('day', '月德合');
  if (yueDeHeStem === hourStem) pushUnique('hour', '月德合');

  return shenSha;
}

function validateLunarDateInput(params: {
  birthYear: number;
  birthMonth: number;
  birthDay: number;
  birthHour: number;
  birthMinute: number;
  isLeapMonth: boolean;
}): { solar: ReturnType<typeof Solar.fromYmdHms>; lunar: ReturnType<typeof Lunar.fromYmdHms> } {
  const {
    birthYear,
    birthMonth,
    birthDay,
    birthHour,
    birthMinute,
    isLeapMonth,
  } = params;

  if (!Number.isInteger(birthMonth) || birthMonth < 1 || birthMonth > 12) {
    throw new Error(`农历月份无效：月份需为 1-12 的正整数（收到 ${birthMonth}）`);
  }

  const leapMonth = LunarYear.fromYear(birthYear).getLeapMonth();
  if (isLeapMonth && leapMonth !== birthMonth) {
    throw new Error(`农历闰月无效：${birthYear}年不存在闰${birthMonth}月`);
  }

  const lunarMonth = isLeapMonth ? -Math.abs(birthMonth) : birthMonth;
  let lunarMonthInfo: ReturnType<typeof LunarMonth.fromYm>;
  try {
    lunarMonthInfo = LunarMonth.fromYm(birthYear, lunarMonth);
  } catch {
    throw new Error(`农历月份无效：${birthYear}年${isLeapMonth ? '闰' : ''}${birthMonth}月`);
  }
  if (!lunarMonthInfo) {
    throw new Error(`农历月份无效：${birthYear}年${isLeapMonth ? '闰' : ''}${birthMonth}月`);
  }

  const dayCount = lunarMonthInfo.getDayCount();
  if (birthDay < 1 || birthDay > dayCount) {
    throw new Error(`农历日期无效：${birthYear}年${isLeapMonth ? '闰' : ''}${birthMonth}月只有${dayCount}天`);
  }

  let lunar: ReturnType<typeof Lunar.fromYmdHms>;
  try {
    lunar = Lunar.fromYmdHms(birthYear, lunarMonth, birthDay, birthHour, birthMinute, 0);
  } catch {
    throw new Error(`农历日期无效：${birthYear}年${isLeapMonth ? '闰' : ''}${birthMonth}月${birthDay}日`);
  }
  return {
    solar: lunar.getSolar(),
    lunar,
  };
}

export async function handleBaziCalculate(input: BaziInput): Promise<BaziOutput> {
  const {
    gender,
    birthYear,
    birthMonth,
    birthDay,
    birthHour,
    birthMinute = 0,
    calendarType = 'solar',
    isLeapMonth = false,
    birthPlace,
  } = input;

  let solar: ReturnType<typeof Solar.fromYmdHms>;
  let lunar: ReturnType<typeof Lunar.fromYmdHms>;
  if (calendarType === 'lunar') {
    const prepared = validateLunarDateInput({
      birthYear,
      birthMonth,
      birthDay,
      birthHour,
      birthMinute,
      isLeapMonth,
    });
    solar = prepared.solar;
    lunar = prepared.lunar;
  } else {
    solar = Solar.fromYmdHms(
      birthYear,
      birthMonth,
      birthDay,
      birthHour,
      birthMinute,
      0
    );
    lunar = solar.getLunar();
  }

  const eightChar = lunar.getEightChar();
  const yearStem = eightChar.getYearGan();
  const yearBranch = eightChar.getYearZhi();
  const monthStem = eightChar.getMonthGan();
  const monthBranch = eightChar.getMonthZhi();
  const dayStem = eightChar.getDayGan();
  const dayBranch = eightChar.getDayZhi();
  const hourStem = eightChar.getTimeGan();
  const hourBranch = eightChar.getTimeZhi();

  const kongWang = getKongWang(dayStem, dayBranch);
  const pillarShenSha = calculatePillarShenSha({
    yearStem,
    yearBranch,
    monthStem,
    monthBranch,
    dayStem,
    dayBranch,
    hourStem,
    hourBranch,
    kongWang,
  });

  const fourPillars = {
    year: {
      ...createPillar(yearStem, yearBranch, dayStem),
      shenSha: pillarShenSha.year,
      kongWang: buildPillarKongWang(yearBranch, kongWang),
    },
    month: {
      ...createPillar(monthStem, monthBranch, dayStem),
      shenSha: pillarShenSha.month,
      kongWang: buildPillarKongWang(monthBranch, kongWang),
    },
    day: {
      ...createPillar(dayStem, dayBranch, dayStem),
      shenSha: pillarShenSha.day,
      kongWang: buildPillarKongWang(dayBranch, kongWang),
    },
    hour: {
      ...createPillar(hourStem, hourBranch, dayStem),
      shenSha: pillarShenSha.hour,
      kongWang: buildPillarKongWang(hourBranch, kongWang),
    },
  };

  fourPillars.day.tenGod = undefined;

  const relations = analyzePillarRelations(yearBranch, monthBranch, dayBranch, hourBranch);

  return {
    gender,
    birthPlace,
    dayMaster: dayStem,
    kongWang,
    fourPillars,
    relations,
  };
}
