/**
 * 紫微斗数运限处理器
 */

import type { ZiweiHoroscopeInput, ZiweiHoroscopeOutput, HoroscopePeriodInfo, TransitStarEntry } from '../types.js';
import type { HoroscopeItem } from 'iztro';
import { createAstrolabe, DI_ZHI, LUCUN_TABLE } from './ziwei-shared.js';

/** 流昌/流曲查表：年干 → [流昌地支, 流曲地支] */
const FLOW_CHANG_QU_TABLE: Record<string, [string, string]> = {
  '甲': ['巳', '酉'], '乙': ['午', '申'], '丙': ['申', '午'],
  '丁': ['酉', '巳'], '戊': ['申', '午'], '己': ['酉', '巳'],
  '庚': ['亥', '卯'], '辛': ['子', '寅'], '壬': ['寅', '子'],
  '癸': ['卯', '亥'],
};

/** 计算流年星曜 */
function computeTransitStars(
  flowYearStem: string,
  palaces: { name: string; earthlyBranch: string }[],
): TransitStarEntry[] {
  const result: TransitStarEntry[] = [];

  const findPalace = (branch: string) =>
    palaces.find(p => p.earthlyBranch === branch)?.name ?? branch;

  // 流禄：same as 禄存 table
  const liuLuBranch = LUCUN_TABLE[flowYearStem];
  if (!liuLuBranch) return result;
  result.push({ starName: '流禄', palaceName: findPalace(liuLuBranch) });

  // 流羊：流禄 +1 palace
  const luIdx = DI_ZHI.indexOf(liuLuBranch);
  if (luIdx >= 0) {
    const yangBranch = DI_ZHI[(luIdx + 1) % 12];
    result.push({ starName: '流羊', palaceName: findPalace(yangBranch) });

    // 流陀：流禄 -1 palace
    const tuoBranch = DI_ZHI[(luIdx - 1 + 12) % 12];
    result.push({ starName: '流陀', palaceName: findPalace(tuoBranch) });
  }

  // 流昌 & 流曲
  const changQu = FLOW_CHANG_QU_TABLE[flowYearStem];
  if (changQu) {
    result.push({ starName: '流昌', palaceName: findPalace(changQu[0]) });
    result.push({ starName: '流曲', palaceName: findPalace(changQu[1]) });
  }

  return result;
}

function mapPeriod(item: HoroscopeItem): HoroscopePeriodInfo {
  return {
    index: item.index,
    name: item.name,
    heavenlyStem: item.heavenlyStem,
    earthlyBranch: item.earthlyBranch,
    palaceNames: item.palaceNames,
    mutagen: item.mutagen,
  };
}

export async function handleZiweiHoroscope(input: ZiweiHoroscopeInput): Promise<ZiweiHoroscopeOutput> {
  const astrolabe = createAstrolabe(input);

  const { targetDate, targetTimeIndex } = input;
  const horoscope = astrolabe.horoscope(targetDate, targetTimeIndex);

  // 流年星曜：from flow year stem
  const flowYearStem = horoscope.yearly.heavenlyStem;
  const palaceList = astrolabe.palaces.map(p => ({
    name: p.name,
    earthlyBranch: p.earthlyBranch,
  }));
  const transitStars = flowYearStem
    ? computeTransitStars(flowYearStem, palaceList)
    : undefined;

  return {
    solarDate: astrolabe.solarDate || '',
    lunarDate: astrolabe.lunarDate || '',
    soul: astrolabe.soul || '',
    body: astrolabe.body || '',
    fiveElement: astrolabe.fiveElementsClass || '',
    targetDate: targetDate || new Date().toISOString().slice(0, 10),
    decadal: mapPeriod(horoscope.decadal),
    age: { ...mapPeriod(horoscope.age), nominalAge: horoscope.age.nominalAge },
    yearly: mapPeriod(horoscope.yearly),
    monthly: mapPeriod(horoscope.monthly),
    daily: mapPeriod(horoscope.daily),
    hourly: mapPeriod(horoscope.hourly),
    transitStars,
  };
}
