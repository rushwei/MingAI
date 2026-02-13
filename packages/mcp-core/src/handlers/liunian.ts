/**
 * 大运计算处理器
 * 根据出生时间计算完整大运列表
 */

import { Solar, Lunar } from 'lunar-javascript';
import type { DayunInput, DayunOutput } from '../types.js';
import { calculateTenGod } from '../utils.js';
import { getNaYin, getDiShi, buildHiddenStems } from './bazi.js';
import { calculateBranchShenSha, type ShenShaContext } from '../shensha.js';

const HIDDEN_STEM_MAIN: Record<string, string> = {
  '子': '癸', '丑': '己', '寅': '甲', '卯': '乙',
  '辰': '戊', '巳': '丙', '午': '丁', '未': '己',
  '申': '庚', '酉': '辛', '戌': '戊', '亥': '壬',
};

function getDaYunTenGods(ganZhi: string, dayStem: string): { tenGod: string; branchTenGod: string } {
  const stem = ganZhi.slice(0, 1);
  const branch = ganZhi.slice(1, 2);
  const tenGod = stem ? calculateTenGod(dayStem, stem) : '';
  const branchMainStem = HIDDEN_STEM_MAIN[branch];
  const branchTenGod = branchMainStem ? calculateTenGod(dayStem, branchMainStem) : '';
  return { tenGod, branchTenGod };
}

export async function handleDayunCalculate(input: DayunInput): Promise<DayunOutput> {
  const {
    gender,
    birthYear,
    birthMonth,
    birthDay,
    birthHour,
    birthMinute = 0,
    calendarType = 'solar',
    isLeapMonth = false,
  } = input;

  let solar: ReturnType<typeof Solar.fromYmdHms>;
  let lunar: ReturnType<typeof Lunar.fromYmdHms>;

  if (calendarType === 'lunar') {
    const lunarMonth = isLeapMonth ? -Math.abs(birthMonth) : birthMonth;
    lunar = Lunar.fromYmdHms(birthYear, lunarMonth, birthDay, birthHour, birthMinute, 0);
    solar = lunar.getSolar();
  } else {
    solar = Solar.fromYmdHms(birthYear, birthMonth, birthDay, birthHour, birthMinute, 0);
    lunar = solar.getLunar();
  }

  const eightChar = lunar.getEightChar();
  const dayStem = eightChar.getDayGan();

  // 构建神煞上下文（基于原命盘四柱）
  const shenShaContext: ShenShaContext = {
    yearStem: eightChar.getYearGan(),
    yearBranch: eightChar.getYearZhi(),
    monthStem: eightChar.getMonthGan(),
    monthBranch: eightChar.getMonthZhi(),
    dayStem,
    dayBranch: eightChar.getDayZhi(),
    hourStem: eightChar.getTimeGan(),
    hourBranch: eightChar.getTimeZhi(),
  };

  const genderNum = gender === 'male' ? 1 : 0;
  const yun = eightChar.getYun(genderNum);
  const daYunList = yun.getDaYun();

  const list = daYunList
    .filter((dy) => dy.getGanZhi())
    .slice(0, 10)
    .map((dy) => {
      const ganZhi = dy.getGanZhi();
      const stem = ganZhi.slice(0, 1);
      const branch = ganZhi.slice(1, 2);
      const { tenGod, branchTenGod } = getDaYunTenGods(ganZhi, dayStem);
      return {
        startYear: dy.getStartYear(),
        ganZhi,
        stem,
        branch,
        tenGod,
        branchTenGod,
        hiddenStems: buildHiddenStems(branch, dayStem),
        naYin: getNaYin(stem, branch),
        diShi: getDiShi(dayStem, branch),
        shenSha: calculateBranchShenSha(shenShaContext, branch),
      };
    });

  return { list };
}
