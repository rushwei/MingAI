/**
 * 每日运势处理器
 */

import { Solar } from 'lunar-javascript';
import type { FortuneInput, FortuneOutput } from '../types.js';
import { calculateTenGod } from '../utils.js';

export async function handleDailyFortune(input: FortuneInput): Promise<FortuneOutput> {
  // 解析日期为本地时间，避免 UTC 偏移
  let targetDate: Date;
  if (input.date) {
    const [y, m, d] = input.date.split('-').map(Number);
    targetDate = new Date(y, m - 1, d);
  } else {
    targetDate = new Date();
  }
  const dateKey = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
  const solar = Solar.fromDate(targetDate);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();

  // 获取日主
  let dayMaster = input.dayMaster;
  if (!dayMaster && input.birthYear && input.birthMonth && input.birthDay) {
    const birthSolar = Solar.fromYmdHms(
      input.birthYear,
      input.birthMonth,
      input.birthDay,
      input.birthHour ?? 12,
      0,
      0
    );
    const birthLunar = birthSolar.getLunar();
    dayMaster = birthLunar.getEightChar().getDayGan();
  }

  // 流日干支
  const dayStem = eightChar.getDayGan();
  const dayBranch = eightChar.getDayZhi();

  // 计算十神（如果有日主）
  const tenGod = dayMaster ? calculateTenGod(dayMaster, dayStem) : undefined;

  // 获取黄历信息
  const jieQi = lunar.getJieQi();

  // 安全获取数组
  const safeGetArray = (fn: () => string[]): string[] => {
    try { return fn() || []; } catch { return []; }
  };

  // 安全获取字符串
  const safeGetString = (fn: () => string): string => {
    try { return fn() || ''; } catch { return ''; }
  };

  return {
    date: dateKey,
    dayInfo: {
      stem: dayStem,
      branch: dayBranch,
      ganZhi: `${dayStem}${dayBranch}`,
    },
    tenGod,
    almanac: {
      lunarDate: lunar.toString(),
      lunarMonth: lunar.getMonthInChinese(),
      lunarDay: lunar.getDayInChinese(),
      zodiac: lunar.getYearShengXiao(),
      solarTerm: jieQi || undefined,
      suitable: safeGetArray(() => lunar.getDayYi()),
      avoid: safeGetArray(() => lunar.getDayJi()),
      chongSha: `冲${safeGetString(() => lunar.getDayChongDesc())} 煞${safeGetString(() => lunar.getDaySha())}`,
      pengZuBaiJi: safeGetArray(() => lunar.getPengZuGan()).concat(safeGetArray(() => lunar.getPengZuZhi())),
      jishen: safeGetArray(() => lunar.getDayJiShen()),
      xiongsha: safeGetArray(() => lunar.getDayXiongSha()),
    },
  };
}
