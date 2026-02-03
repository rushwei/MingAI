/**
 * 八字计算处理器
 */

import { Solar, Lunar } from 'lunar-javascript';
import type { BaziInput, BaziOutput, PillarInfo, ShenShaInfo } from '../types.js';
import {
  STEM_ELEMENTS,
  getStemYinYang,
  calculateTenGod,
} from '../utils.js';

// 地支藏干表
const HIDDEN_STEMS: Record<string, string[]> = {
  '子': ['癸'],
  '丑': ['己', '癸', '辛'],
  '寅': ['甲', '丙', '戊'],
  '卯': ['乙'],
  '辰': ['戊', '乙', '癸'],
  '巳': ['丙', '庚', '戊'],
  '午': ['丁', '己'],
  '未': ['己', '丁', '乙'],
  '申': ['庚', '壬', '戊'],
  '酉': ['辛'],
  '戌': ['戊', '辛', '丁'],
  '亥': ['壬', '甲'],
};

// 六十甲子纳音表
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

// 十二长生表（五行对应地支的长生位置）
const DI_SHI_ORDER = ['长生', '沐浴', '冠带', '临官', '帝旺', '衰', '病', '死', '墓', '绝', '胎', '养'];
const DI_ZHI_ORDER = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];

// 五行长生起点
const CHANG_SHENG_START: Record<string, string> = {
  '木': '亥', '火': '寅', '土': '寅', '金': '巳', '水': '申',
};

// ===== 神煞数据表 =====

// 天乙贵人表（根据日干查地支）
const TIAN_YI_GUI_REN: Record<string, string[]> = {
  '甲': ['丑', '未'], '乙': ['子', '申'], '丙': ['亥', '酉'], '丁': ['亥', '酉'],
  '戊': ['丑', '未'], '己': ['子', '申'], '庚': ['丑', '未'], '辛': ['寅', '午'],
  '壬': ['卯', '巳'], '癸': ['卯', '巳'],
};

// 文昌贵人表（根据日干查地支）
const WEN_CHANG_GUI_REN: Record<string, string> = {
  '甲': '巳', '乙': '午', '丙': '申', '丁': '酉', '戊': '申',
  '己': '酉', '庚': '亥', '辛': '子', '壬': '寅', '癸': '卯',
};

// 驿马表（根据年支或日支查）
const YI_MA: Record<string, string> = {
  '寅': '申', '午': '申', '戌': '申',
  '申': '寅', '子': '寅', '辰': '寅',
  '巳': '亥', '酉': '亥', '丑': '亥',
  '亥': '巳', '卯': '巳', '未': '巳',
};

// 桃花表（根据年支或日支查）
const TAO_HUA: Record<string, string> = {
  '寅': '卯', '午': '卯', '戌': '卯',
  '申': '酉', '子': '酉', '辰': '酉',
  '巳': '午', '酉': '午', '丑': '午',
  '亥': '子', '卯': '子', '未': '子',
};

// 华盖表（根据年支或日支查）
const HUA_GAI: Record<string, string> = {
  '寅': '戌', '午': '戌', '戌': '戌',
  '申': '辰', '子': '辰', '辰': '辰',
  '巳': '丑', '酉': '丑', '丑': '丑',
  '亥': '未', '卯': '未', '未': '未',
};

// 将星表（根据年支或日支查）
const JIANG_XING: Record<string, string> = {
  '寅': '午', '午': '午', '戌': '午',
  '申': '子', '子': '子', '辰': '子',
  '巳': '酉', '酉': '酉', '丑': '酉',
  '亥': '卯', '卯': '卯', '未': '卯',
};

// 羊刃表（根据日干查地支）
const YANG_REN: Record<string, string> = {
  '甲': '卯', '乙': '寅', '丙': '午', '丁': '巳', '戊': '午',
  '己': '巳', '庚': '酉', '辛': '申', '壬': '子', '癸': '亥',
};

// 禄神表（根据日干查地支）
const LU_SHEN: Record<string, string> = {
  '甲': '寅', '乙': '卯', '丙': '巳', '丁': '午', '戊': '巳',
  '己': '午', '庚': '申', '辛': '酉', '壬': '亥', '癸': '子',
};

// 天德贵人表（根据月支查天干）
const TIAN_DE_GUI_REN: Record<string, string> = {
  '寅': '丁', '卯': '申', '辰': '壬', '巳': '辛', '午': '亥', '未': '甲',
  '申': '癸', '酉': '寅', '戌': '丙', '亥': '乙', '子': '巳', '丑': '庚',
};

// 月德贵人表（根据月支查天干）
const YUE_DE_GUI_REN: Record<string, string> = {
  '寅': '丙', '午': '丙', '戌': '丙',
  '申': '壬', '子': '壬', '辰': '壬',
  '巳': '庚', '酉': '庚', '丑': '庚',
  '亥': '甲', '卯': '甲', '未': '甲',
};

// 魁罡日（日柱干支组合）
const KUI_GANG = ['庚辰', '庚戌', '壬辰', '戊戌'];

// 金舆（根据日干查地支）
const JIN_YU: Record<string, string> = {
  '甲': '辰', '乙': '巳', '丙': '未', '丁': '申', '戊': '未',
  '己': '申', '庚': '戌', '辛': '亥', '壬': '丑', '癸': '寅',
};

// 计算神煞
function calculateShenSha(
  dayStem: string,
  dayBranch: string,
  yearBranch: string,
  monthBranch: string,
  hourBranch: string
): ShenShaInfo {
  const allBranches = [yearBranch, monthBranch, dayBranch, hourBranch];
  const shenSha: ShenShaInfo = {};

  // 天乙贵人
  const tianYi = TIAN_YI_GUI_REN[dayStem] || [];
  const tianYiFound = allBranches.filter(b => tianYi.includes(b));
  if (tianYiFound.length > 0) shenSha.tianYiGuiRen = tianYiFound;

  // 文昌贵人
  const wenChang = WEN_CHANG_GUI_REN[dayStem];
  const wenChangFound = allBranches.filter(b => b === wenChang);
  if (wenChangFound.length > 0) shenSha.wenChangGuiRen = wenChangFound;

  // 驿马（以年支和日支为准）
  const yiMaYear = YI_MA[yearBranch];
  const yiMaDay = YI_MA[dayBranch];
  const yiMaFound = allBranches.filter(b => b === yiMaYear || b === yiMaDay);
  if (yiMaFound.length > 0) shenSha.yiMa = [...new Set(yiMaFound)];

  // 桃花（以年支和日支为准）
  const taoHuaYear = TAO_HUA[yearBranch];
  const taoHuaDay = TAO_HUA[dayBranch];
  const taoHuaFound = allBranches.filter(b => b === taoHuaYear || b === taoHuaDay);
  if (taoHuaFound.length > 0) shenSha.taoHua = [...new Set(taoHuaFound)];

  // 华盖（以年支和日支为准）
  const huaGaiYear = HUA_GAI[yearBranch];
  const huaGaiDay = HUA_GAI[dayBranch];
  const huaGaiFound = allBranches.filter(b => b === huaGaiYear || b === huaGaiDay);
  if (huaGaiFound.length > 0) shenSha.huaGai = [...new Set(huaGaiFound)];

  // 将星（以年支和日支为准）
  const jiangXingYear = JIANG_XING[yearBranch];
  const jiangXingDay = JIANG_XING[dayBranch];
  const jiangXingFound = allBranches.filter(b => b === jiangXingYear || b === jiangXingDay);
  if (jiangXingFound.length > 0) shenSha.jiangXing = [...new Set(jiangXingFound)];

  // 羊刃
  const yangRen = YANG_REN[dayStem];
  const yangRenFound = allBranches.filter(b => b === yangRen);
  if (yangRenFound.length > 0) shenSha.yangRen = yangRenFound;

  // 禄神
  const luShen = LU_SHEN[dayStem];
  const luShenFound = allBranches.filter(b => b === luShen);
  if (luShenFound.length > 0) shenSha.luShen = luShenFound;

  // 天德贵人（根据月支查，看日干是否符合）
  const tianDe = TIAN_DE_GUI_REN[monthBranch];
  if (tianDe === dayStem) shenSha.tianDeGuiRen = tianDe;

  // 月德贵人（根据月支查，看日干是否符合）
  const yueDe = YUE_DE_GUI_REN[monthBranch];
  if (yueDe === dayStem) shenSha.yueDeGuiRen = yueDe;

  // 魁罡（日柱干支组合）
  const dayPillar = `${dayStem}${dayBranch}`;
  if (KUI_GANG.includes(dayPillar)) shenSha.kuiGang = true;

  // 金舆
  const jinYu = JIN_YU[dayStem];
  if (allBranches.includes(jinYu)) shenSha.jinYu = true;

  // 天罗地网（戌亥为天罗，辰巳为地网）
  const tianLuoDiWang: string[] = [];
  if (allBranches.includes('戌') || allBranches.includes('亥')) {
    tianLuoDiWang.push('天罗');
  }
  if (allBranches.includes('辰') || allBranches.includes('巳')) {
    tianLuoDiWang.push('地网');
  }
  if (tianLuoDiWang.length > 0) shenSha.tianLuodiWang = tianLuoDiWang;

  return shenSha;
}

// 获取纳音
function getNaYin(stem: string, branch: string): string {
  return NA_YIN_TABLE[`${stem}${branch}`] || '';
}

// 获取地势（十二长生）
function getDiShi(dayStem: string, branch: string): string {
  const element = STEM_ELEMENTS[dayStem];
  if (!element) return '';

  const startBranch = CHANG_SHENG_START[element];
  const startIdx = DI_ZHI_ORDER.indexOf(startBranch);
  const branchIdx = DI_ZHI_ORDER.indexOf(branch);

  // 阳干顺行，阴干逆行
  const isYang = getStemYinYang(dayStem) === 'yang';
  let offset: number;
  if (isYang) {
    offset = (branchIdx - startIdx + 12) % 12;
  } else {
    offset = (startIdx - branchIdx + 12) % 12;
  }

  return DI_SHI_ORDER[offset];
}

// 创建柱信息
function createPillar(stem: string, branch: string, dayStem?: string): PillarInfo {
  return {
    stem,
    branch,
    tenGod: dayStem ? calculateTenGod(dayStem, stem) : undefined,
    hiddenStems: HIDDEN_STEMS[branch] || [],
    naYin: getNaYin(stem, branch),
    diShi: dayStem ? getDiShi(dayStem, branch) : undefined,
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

  // 创建 Solar 对象
  const solar = Solar.fromYmdHms(
    birthYear,
    birthMonth,
    birthDay,
    birthHour,
    birthMinute,
    0
  );

  // 获取农历
  let lunar: ReturnType<typeof Lunar.fromYmdHms>;
  if (calendarType === 'lunar') {
    const lunarMonth = isLeapMonth ? -Math.abs(birthMonth) : birthMonth;
    lunar = Lunar.fromYmdHms(birthYear, lunarMonth, birthDay, birthHour, birthMinute, 0);
  } else {
    lunar = solar.getLunar();
  }

  // 获取八字
  const eightChar = lunar.getEightChar();
  const dayStem = eightChar.getDayGan();

  // 构建四柱
  const fourPillars = {
    year: createPillar(eightChar.getYearGan(), eightChar.getYearZhi(), dayStem),
    month: createPillar(eightChar.getMonthGan(), eightChar.getMonthZhi(), dayStem),
    day: createPillar(eightChar.getDayGan(), eightChar.getDayZhi(), dayStem),
    hour: createPillar(eightChar.getTimeGan(), eightChar.getTimeZhi(), dayStem),
  };

  // 日柱不计算十神（自己对自己）
  fourPillars.day.tenGod = undefined;

  // 计算大运
  const genderNum = gender === 'male' ? 1 : 0;
  const yun = eightChar.getYun(genderNum);
  const daYunList = yun.getDaYun();

  // 计算精确起运时间
  let startAgeDetail = `${yun.getStartYear()}岁起运`;
  try {
    const startSolar = yun.getStartSolar();
    if (startSolar) {
      const birthDate = new Date(birthYear, birthMonth - 1, birthDay, birthHour, birthMinute);
      const qiyunDate = new Date(
        startSolar.getYear(),
        startSolar.getMonth() - 1,
        startSolar.getDay(),
        startSolar.getHour(),
        startSolar.getMinute()
      );
      const diffDays = Math.floor((qiyunDate.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24));
      const years = Math.floor(diffDays / 365);
      const remainingDays = diffDays % 365;
      const months = Math.floor(remainingDays / 30);
      const days = remainingDays % 30;
      startAgeDetail = `${years}年${months}月${days}天起运`;
    }
  } catch {
    // 使用默认值
  }

  // 处理大运列表
  // 使用 dy.getStartYear() 获取每个大运的起始公历年份
  const daYun = daYunList
    .filter((dy) => dy.getGanZhi()) // 过滤掉童限（无干支）
    .slice(0, 10)
    .map((dy) => ({
      startYear: (dy as unknown as { getStartYear: () => number }).getStartYear(),
      ganZhi: dy.getGanZhi(),
    }));

  // 计算神煞
  const shenSha = calculateShenSha(
    dayStem,
    eightChar.getDayZhi(),
    eightChar.getYearZhi(),
    eightChar.getMonthZhi(),
    eightChar.getTimeZhi()
  );

  return {
    gender,
    birthPlace,
    dayMaster: dayStem,
    fourPillars,
    daYun: {
      startAgeDetail,
      list: daYun,
    },
    shenSha,
  };
}
