/**
 * 紫微斗数排盘处理器
 */

import type { Palace } from 'iztro';
import type { ZiweiInput, ZiweiOutput, PalaceInfo, DecadalInfo, MutagenSummaryItem, StarInfo } from '../types.js';
import { createAstrolabeWithTrueSolar, mapStar, MUTAGEN_NAMES, STEM_MUTAGEN_TABLE, computeLiuNianAges, computeDouJun, hourToTimeIndex, type MutagenName } from './ziwei-shared.js';

export async function handleZiweiCalculate(input: ZiweiInput): Promise<ZiweiOutput> {
  const { astrolabe, trueSolarTimeInfo } = createAstrolabeWithTrueSolar(input);

  const mutagenSummary: MutagenSummaryItem[] = [];

  // 转换宫位数据
  const palaces: PalaceInfo[] = astrolabe.palaces.map((palace: Palace, idx: number) => {
    // 收集四化分布
    for (const star of [...palace.majorStars, ...palace.minorStars]) {
      if (star.mutagen && MUTAGEN_NAMES.includes(star.mutagen as MutagenName)) {
        mutagenSummary.push({
          mutagen: star.mutagen as MutagenName,
          starName: star.name,
          palaceName: palace.name,
        });
      }
    }

    return {
      name: palace.name,
      heavenlyStem: palace.heavenlyStem,
      earthlyBranch: palace.earthlyBranch,
      isBodyPalace: palace.isBodyPalace,
      index: palace.index ?? idx,
      isOriginalPalace: palace.isOriginalPalace ?? false,
      changsheng12: palace.changsheng12,
      boshi12: palace.boshi12,
      jiangqian12: palace.jiangqian12,
      suiqian12: palace.suiqian12,
      ages: palace.ages,
      decadalRange: palace.decadal?.range ? [palace.decadal.range[0], palace.decadal.range[1]] as [number, number] : undefined,
      majorStars: palace.majorStars.map(mapStar),
      minorStars: palace.minorStars.map(mapStar),
      adjStars: (palace.adjectiveStars || []).map(mapStar),
    };
  });

  // 宫干自化标注（离心 + 向心）
  for (const palace of palaces) {
    const allStars: StarInfo[] = [...palace.majorStars, ...palace.minorStars, ...(palace.adjStars || [])];

    // 离心自化：本宫宫干四化落回本宫
    const selfMutagenStars = STEM_MUTAGEN_TABLE[palace.heavenlyStem];
    if (selfMutagenStars) {
      for (const star of allStars) {
        const mIdx = selfMutagenStars.indexOf(star.name);
        if (mIdx >= 0) star.selfMutagen = MUTAGEN_NAMES[mIdx];
      }
    }

    // 向心自化：对宫宫干四化飞入本宫
    const palaceIdx = palace.index ?? 0;
    const oppositeIdx = (palaceIdx + 6) % 12;
    const oppositePalace = palaces.find(p => (p.index ?? 0) === oppositeIdx);
    if (oppositePalace) {
      const oppMutagenStars = STEM_MUTAGEN_TABLE[oppositePalace.heavenlyStem];
      if (oppMutagenStars) {
        for (const star of allStars) {
          const mIdx = oppMutagenStars.indexOf(star.name);
          if (mIdx >= 0) star.oppositeMutagen = MUTAGEN_NAMES[mIdx];
        }
      }
    }
  }

  // 获取四柱
  const pillars = (astrolabe.chineseDate || '').split(' ');

  // 流年虚岁：从年柱第二个字取出生年地支
  const yearPillar = pillars[0] || '';
  const birthYearBranch = yearPillar.length >= 2 ? yearPillar[1] : '';
  if (birthYearBranch) {
    for (const palace of palaces) {
      palace.liuNianAges = computeLiuNianAges(palace.earthlyBranch, birthYearBranch);
    }
  }

  // 斗君计算
  let douJun: string | undefined;
  const rawDates = (astrolabe as unknown as Record<string, unknown>).rawDates as
    { lunarDate?: { lunarMonth: number } } | undefined;
  if (rawDates?.lunarDate) {
    const lunarMonth = rawDates.lunarDate.lunarMonth;
    const hourValue = input.birthHour + (input.birthMinute || 0) / 60;
    const timeIdx = hourToTimeIndex(hourValue);
    douJun = computeDouJun(lunarMonth, timeIdx);
  }

  // 提取大限数据
  const decadalList: DecadalInfo[] = astrolabe.palaces.map((rawPalace: Palace, index: number) => {
    const decadal = rawPalace.decadal;
    return {
      startAge: decadal?.range?.[0] ?? 0,
      endAge: decadal?.range?.[1] ?? 0,
      heavenlyStem: decadal?.heavenlyStem ?? palaces[index].heavenlyStem,
      palace: {
        earthlyBranch: decadal?.earthlyBranch ?? palaces[index].earthlyBranch,
        name: palaces[index].name,
      },
    };
  }).sort((a: DecadalInfo, b: DecadalInfo) => a.startAge - b.startAge);

  return {
    solarDate: astrolabe.solarDate || '',
    lunarDate: astrolabe.lunarDate || '',
    fourPillars: {
      year: pillars[0] || '',
      month: pillars[1] || '',
      day: pillars[2] || '',
      hour: pillars[3] || '',
    },
    soul: astrolabe.soul || '',
    body: astrolabe.body || '',
    fiveElement: astrolabe.fiveElementsClass || '',
    zodiac: astrolabe.zodiac || '',
    sign: astrolabe.sign || '',
    palaces,
    decadalList,
    earthlyBranchOfSoulPalace: astrolabe.earthlyBranchOfSoulPalace,
    earthlyBranchOfBodyPalace: astrolabe.earthlyBranchOfBodyPalace,
    time: astrolabe.time,
    timeRange: astrolabe.timeRange,
    mutagenSummary,
    gender: input.gender,
    douJun,
    trueSolarTimeInfo,
  };
}
