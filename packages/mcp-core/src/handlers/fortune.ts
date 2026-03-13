/**
 * 每日运势处理器
 */

import { Solar } from 'lunar-javascript';
import type { FortuneInput, FortuneOutput } from '../types.js';
import { calculateTenGod } from '../utils.js';

// ===== 缓存配置 =====
const FORTUNE_CACHE_TTL = 60 * 60 * 1000; // 1小时
const FORTUNE_CACHE_MAX = 200;
const fortuneCache = new Map<string, { data: FortuneOutput; expire: number }>();

function getCachedFortune(date: string, dayMaster?: string): FortuneOutput | undefined {
  const key = `${date}:${dayMaster || 'none'}`;
  const cached = fortuneCache.get(key);
  if (cached && cached.expire > Date.now()) {
    return cached.data;
  }
  if (cached) fortuneCache.delete(key);
  return undefined;
}

function setCachedFortune(date: string, dayMaster: string | undefined, data: FortuneOutput): void {
  const key = `${date}:${dayMaster || 'none'}`;
  if (fortuneCache.size >= FORTUNE_CACHE_MAX) {
    // 淘汰最早的条目
    const firstKey = fortuneCache.keys().next().value;
    if (firstKey !== undefined) fortuneCache.delete(firstKey);
  }
  fortuneCache.set(key, { data, expire: Date.now() + FORTUNE_CACHE_TTL });
}

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

  // 检查缓存（只有当 dayMaster 相同时才能复用缓存）
  const cached = getCachedFortune(dateKey, dayMaster);
  if (cached) {
    return cached;
  }

  // 如果没有日主，尝试从缓存中获取无日主的结果
  if (!dayMaster) {
    const cachedNoDayMaster = getCachedFortune(dateKey, undefined);
    if (cachedNoDayMaster) {
      return cachedNoDayMaster;
    }
  }

  const solar = Solar.fromDate(targetDate);
  const lunar = solar.getLunar();
  const eightChar = lunar.getEightChar();

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

  const result: FortuneOutput = {
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

  // 缓存结果
  setCachedFortune(dateKey, dayMaster, result);

  // 如果没有日主，同时缓存无日主版本
  if (!dayMaster) {
    setCachedFortune(dateKey, undefined, result);
  }

  return result;
}
