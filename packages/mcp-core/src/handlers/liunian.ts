/**
 * 流年流月流日分析处理器
 * 计算大运、流年、流月对命主的影响
 */

import { Solar, Lunar } from 'lunar-javascript';
import type { LiunianInput, LiunianOutput } from '../types.js';
import { calculateTenGod } from '../utils.js';

// 分析十神吉凶趋势
function analyzeTenGodTrend(tenGod: string): 'favorable' | 'neutral' | 'unfavorable' {
  const favorable = ['正财', '偏财', '正官', '正印', '食神'];
  const unfavorable = ['七杀', '伤官', '劫财'];

  if (favorable.includes(tenGod)) return 'favorable';
  if (unfavorable.includes(tenGod)) return 'unfavorable';
  return 'neutral';
}

// 生成关键因素分析
function generateKeyFactors(
  daYunTenGod: string,
  liunianTenGod: string,
  liuyueTenGod?: string
): string[] {
  const factors: string[] = [];

  // 大运分析
  factors.push(`大运${daYunTenGod}：${getTenGodMeaning(daYunTenGod)}`);

  // 流年分析
  factors.push(`流年${liunianTenGod}：${getTenGodMeaning(liunianTenGod)}`);

  // 流月分析
  if (liuyueTenGod) {
    factors.push(`流月${liuyueTenGod}：${getTenGodMeaning(liuyueTenGod)}`);
  }

  // 大运流年组合分析
  const daYunTrend = analyzeTenGodTrend(daYunTenGod);
  const liunianTrend = analyzeTenGodTrend(liunianTenGod);

  if (daYunTrend === 'favorable' && liunianTrend === 'favorable') {
    factors.push('大运流年皆吉，整体运势向好');
  } else if (daYunTrend === 'unfavorable' && liunianTrend === 'unfavorable') {
    factors.push('大运流年皆凶，需谨慎行事');
  } else if (daYunTrend !== liunianTrend) {
    factors.push('大运流年吉凶参半，宜把握机遇、规避风险');
  }

  return factors;
}

// 获取十神含义
function getTenGodMeaning(tenGod: string): string {
  const meanings: Record<string, string> = {
    '比肩': '主竞争、合作、同辈助力',
    '劫财': '主破财、竞争、人际纷争',
    '食神': '主才华、口福、子女缘',
    '伤官': '主聪明、叛逆、口舌是非',
    '偏财': '主横财、父缘、投资机遇',
    '正财': '主正财、妻缘、稳定收入',
    '七杀': '主压力、小人、意外风险',
    '正官': '主事业、名誉、贵人相助',
    '偏印': '主学业、偏门、孤独',
    '正印': '主学业、母缘、贵人扶持',
  };
  return meanings[tenGod] || '';
}

export async function handleLiunianAnalyze(input: LiunianInput): Promise<LiunianOutput> {
  const {
    gender,
    birthYear,
    birthMonth,
    birthDay,
    birthHour,
    birthMinute = 0,
    calendarType = 'solar',
    isLeapMonth = false,
    targetYear,
    targetMonth,
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

  // 获取农历和八字
  let lunar: ReturnType<typeof Lunar.fromYmdHms>;
  if (calendarType === 'lunar') {
    const lunarMonth = isLeapMonth ? -Math.abs(birthMonth) : birthMonth;
    lunar = Lunar.fromYmdHms(birthYear, lunarMonth, birthDay, birthHour, birthMinute, 0);
  } else {
    lunar = solar.getLunar();
  }

  const eightChar = lunar.getEightChar();
  const dayStem = eightChar.getDayGan();

  // 计算大运
  const genderNum = gender === 'male' ? 1 : 0;
  const yun = eightChar.getYun(genderNum);
  const daYunList = yun.getDaYun();

  // 确定目标年份
  const currentYear = targetYear || new Date().getFullYear();

  // 找到当前大运
  let currentDaYun = {
    startYear: birthYear,
    endYear: birthYear + 10,
    ganZhi: '',
    tenGod: '',
  };

  for (const dy of daYunList) {
    const ganZhi = dy.getGanZhi() || '';
    if (!ganZhi) continue; // 跳过童限
    const startYear = dy.getStartYear();
    const endYear = startYear + 10;
    if (currentYear >= startYear && currentYear < endYear) {
      const gan = ganZhi.charAt(0);
      currentDaYun = {
        startYear,
        endYear,
        ganZhi,
        tenGod: gan ? calculateTenGod(dayStem, gan) : '',
      };
      break;
    }
  }

  // 边界处理：如果年龄超出大运范围，使用最后一个大运
  if (!currentDaYun.ganZhi && daYunList.length > 0) {
    const lastDy = daYunList[daYunList.length - 1];
    const startYear = (lastDy as unknown as { getStartYear: () => number }).getStartYear();
    const ganZhi = lastDy.getGanZhi() || '';
    const gan = ganZhi.charAt(0);
    currentDaYun = {
      startYear,
      endYear: startYear + 10,
      ganZhi,
      tenGod: gan ? calculateTenGod(dayStem, gan) : '',
    };
  }

  // 计算流年干支（使用立春后的日期确保年干支正确）
  const liunianSolar = Solar.fromYmdHms(currentYear, 2, 15, 12, 0, 0);
  const liunianLunar = liunianSolar.getLunar();
  const liunianEightChar = liunianLunar.getEightChar();
  const liunianGanZhi = `${liunianEightChar.getYearGan()}${liunianEightChar.getYearZhi()}`;
  const liunianGan = liunianGanZhi.charAt(0);
  const liunianTenGod = calculateTenGod(dayStem, liunianGan);

  // 计算流月（如果提供了目标月份）
  let liuyue: LiunianOutput['liuyue'] = undefined;
  if (targetMonth) {
    const liuyueSolar = Solar.fromYmdHms(currentYear, targetMonth, 15, 12, 0, 0);
    const liuyueLunar = liuyueSolar.getLunar();
    const liuyueEightChar = liuyueLunar.getEightChar();
    const liuyueGan = liuyueEightChar.getMonthGan();
    const liuyueZhi = liuyueEightChar.getMonthZhi();
    liuyue = {
      month: targetMonth,
      ganZhi: `${liuyueGan}${liuyueZhi}`,
      tenGod: calculateTenGod(dayStem, liuyueGan),
    };
  }

  // 综合分析趋势
  const trends = [
    analyzeTenGodTrend(currentDaYun.tenGod),
    analyzeTenGodTrend(liunianTenGod),
  ];
  if (liuyue) {
    trends.push(analyzeTenGodTrend(liuyue.tenGod));
  }

  const favorableCount = trends.filter(t => t === 'favorable').length;
  const unfavorableCount = trends.filter(t => t === 'unfavorable').length;

  let overallTrend: 'favorable' | 'neutral' | 'unfavorable';
  if (favorableCount > unfavorableCount) {
    overallTrend = 'favorable';
  } else if (unfavorableCount > favorableCount) {
    overallTrend = 'unfavorable';
  } else {
    overallTrend = 'neutral';
  }

  // 生成关键因素
  const keyFactors = generateKeyFactors(
    currentDaYun.tenGod,
    liunianTenGod,
    liuyue?.tenGod
  );

  return {
    currentDaYun,
    liunian: {
      year: currentYear,
      ganZhi: liunianGanZhi,
      tenGod: liunianTenGod,
    },
    liuyue,
    analysis: {
      trend: overallTrend,
      keyFactors,
    },
  };
}
