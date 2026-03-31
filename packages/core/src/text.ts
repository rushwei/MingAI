import type {
  BaziPillarsResolveOutput,
  BaziOutput,
  DetailLevel,
  DayunOutput,
  FlyingStarResult,
  FortuneOutput,
  LiuyaoOutput,
  MutagedPlaceInfo,
  QimenOutput,
  ShenSystemInfo,
  SurroundedPalaceInfo,
  TarotOutput,
  ZiweiFlyingStarOutput,
  ZiweiHoroscopeOutput,
  ZiweiOutput,
} from './types.js';
import type { DaliurenOutput } from './daliuren/types.js';
import {
  formatGuaLevelLines,
  KONG_WANG_LABELS,
  sortYaosDescending,
  traditionalYaoName,
  WANG_SHUAI_LABELS,
  YONG_SHEN_STATUS_LABELS,
} from './liuyao-core.js';
import { GAN_WUXING } from './utils.js';

export type BaziCanonicalTextOptions = {
  name?: string;
  dayun?: DayunOutput;
  detailLevel?: DetailLevel | 'more' | 'safe' | 'facts' | 'debug';
};

export type DayunCanonicalTextOptions = {
  detailLevel?: DetailLevel | 'more' | 'safe' | 'facts' | 'debug';
};

export type TarotCanonicalTextOptions = {
  birthDate?: string | null;
};

export type ZiweiCanonicalTextOptions = {
  detailLevel?: DetailLevel | 'safe' | 'facts' | 'debug';
  horoscope?: {
    decadal: { palaceName: string; ageRange: string };
    yearly: { palaceName: string; period: string };
    monthly: { palaceName: string; period: string };
    daily: { palaceName: string; period: string };
  };
};

export type QimenCanonicalTextOptions = {
  detailLevel?: DetailLevel | 'safe' | 'facts' | 'debug';
};

const ZIWEI_PALACE_TEXT_ORDER = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '交友', '官禄', '田宅', '福德', '父母'];

function normalizeBaziDetailLevel(detailLevel?: DetailLevel | 'more' | 'safe' | 'facts' | 'debug'): 'default' | 'full' {
  if (detailLevel === 'full' || detailLevel === 'more' || detailLevel === 'facts' || detailLevel === 'debug') {
    return 'full';
  }
  return 'default';
}

function normalizeZiweiDetailLevel(detailLevel?: DetailLevel | 'safe' | 'facts' | 'debug'): 'default' | 'full' {
  if (detailLevel === 'full' || detailLevel === 'more' || detailLevel === 'facts' || detailLevel === 'debug') {
    return 'full';
  }
  return 'default';
}

function normalizeQimenDetailLevel(detailLevel?: DetailLevel | 'safe' | 'facts' | 'debug'): 'default' | 'full' {
  if (detailLevel === 'full' || detailLevel === 'more' || detailLevel === 'facts' || detailLevel === 'debug') {
    return 'full';
  }
  return 'default';
}

function formatTrueSolarBlock(info: { clockTime: string; trueSolarTime: string; longitude: number; correctionMinutes: number; trueTimeIndex: number; dayOffset: number }): string[] {
  const dayOffsetLabel = info.dayOffset > 0
    ? `后${info.dayOffset}日`
    : info.dayOffset < 0
      ? `前${Math.abs(info.dayOffset)}日`
      : '当日';

  return [
    `- 钟表时间: ${info.clockTime}`,
    `- 真太阳时: ${info.trueSolarTime}（经度 ${info.longitude}°，校正 ${info.correctionMinutes > 0 ? '+' : ''}${info.correctionMinutes} 分钟）`,
    `- 真太阳时索引: ${info.trueTimeIndex}`,
    `- 跨日偏移: ${dayOffsetLabel}`,
  ];
}

function buildBaziCanonicalStemRelations(result: Pick<BaziOutput, 'tianGanChongKe' | 'tianGanWuHe'>): string[] {
  const relationParts: string[] = [];
  const seen = new Set<string>();
  const pushUnique = (value: string) => {
    if (!value || seen.has(value)) return;
    seen.add(value);
    relationParts.push(value);
  };

  for (const item of result.tianGanWuHe) {
    pushUnique(`${item.stemA}${item.stemB}合${item.resultElement}`);
  }
  for (const item of result.tianGanChongKe) {
    pushUnique(`${item.stemA}${item.stemB}冲克`);
  }

  return relationParts;
}

function buildBaziCanonicalBranchRelations(result: Pick<BaziOutput, 'fourPillars' | 'relations' | 'diZhiBanHe' | 'diZhiSanHui'>): string[] {
  const posBranchMap: Record<string, string> = {
    '年支': result.fourPillars.year.branch,
    '月支': result.fourPillars.month.branch,
    '日支': result.fourPillars.day.branch,
    '时支': result.fourPillars.hour.branch,
  };
  const relationParts: string[] = [];
  const seen = new Set<string>();
  const pushUnique = (value: string) => {
    if (!value || seen.has(value)) return;
    seen.add(value);
    relationParts.push(value);
  };

  for (const relation of result.relations) {
    if (relation.type === '刑') {
      const branches = [...new Set(relation.pillars.map((pillar) => posBranchMap[pillar]))].join('');
      pushUnique(`${branches}刑（${relation.description}）`);
    } else {
      pushUnique(relation.description);
    }
  }
  for (const item of result.diZhiBanHe) {
    pushUnique(`${item.branches.join('')}半合${item.resultElement}`);
  }
  for (const item of result.diZhiSanHui) {
    pushUnique(`${item.branches.join('')}三会${item.resultElement}`);
  }

  return relationParts;
}

function formatStarLabel(star: { name: string; brightness?: string; mutagen?: string; selfMutagen?: string; oppositeMutagen?: string }): string {
  let label = star.name;
  if (star.brightness) label += `(${star.brightness})`;
  if (star.mutagen) label += `[化${star.mutagen}]`;
  if (star.selfMutagen) label += `[↓${star.selfMutagen}]`;
  if (star.oppositeMutagen) label += `[↑${star.oppositeMutagen}]`;
  return label;
}

function buildShenSystemMap<T extends { targetLiuQin: string }>(systems: T[]): Map<string, T> {
  return new Map(systems.map((system) => [system.targetLiuQin, system] as const));
}

function formatShenSystemParts(system: ShenSystemInfo | undefined): string[] {
  const parts: string[] = [];
  if (system?.yuanShen) parts.push(`原神=${system.yuanShen.liuQin}（${system.yuanShen.wuXing}）`);
  if (system?.jiShen) parts.push(`忌神=${system.jiShen.liuQin}（${system.jiShen.wuXing}）`);
  if (system?.chouShen) parts.push(`仇神=${system.chouShen.liuQin}（${system.chouShen.wuXing}）`);
  return parts;
}

export function sortZiweiPalaces<T extends { name: string; index?: number }>(palaces: T[]): T[] {
  return [...palaces].sort((left, right) => {
    const leftOrder = ZIWEI_PALACE_TEXT_ORDER.indexOf(left.name);
    const rightOrder = ZIWEI_PALACE_TEXT_ORDER.indexOf(right.name);
    const normalizedLeft = leftOrder >= 0 ? leftOrder : Number.MAX_SAFE_INTEGER;
    const normalizedRight = rightOrder >= 0 ? rightOrder : Number.MAX_SAFE_INTEGER;
    if (normalizedLeft !== normalizedRight) return normalizedLeft - normalizedRight;
    return (left.index ?? Number.MAX_SAFE_INTEGER) - (right.index ?? Number.MAX_SAFE_INTEGER);
  });
}

export function renderBaziCanonicalText(chart: BaziOutput, options: BaziCanonicalTextOptions = {}): string {
  const detailLevel = normalizeBaziDetailLevel(options.detailLevel);
  if (detailLevel === 'full') {
    return renderBaziCanonicalFullText(chart, options);
  }

  return renderBaziCanonicalDefaultText(chart, options);
}

function renderBaziCanonicalDefaultText(chart: BaziOutput, options: BaziCanonicalTextOptions = {}): string {
  const { dayun } = options;
  const lines: string[] = ['# 八字命盘', '', '## 命局全盘'];
  if (options.name) lines.push(`- 姓名: ${options.name}`);
  lines.push(`- 性别: ${chart.gender === 'male' ? '男' : '女'}`);
  lines.push(`- 日主: ${chart.dayMaster}`);
  if (chart.birthPlace) lines.push(`- 出生地: ${chart.birthPlace}`);
  if (chart.trueSolarTimeInfo) {
    lines.push(...formatTrueSolarBlock(chart.trueSolarTimeInfo));
  }
  lines.push('');
  lines.push('| 柱 | 干支 | 天干(十神) | 地支藏干(十神) | 地势 | 空亡 |');
  lines.push('|---|------|------------|----------------|------|------|');
  for (const [label, pillar] of [
    ['年柱', chart.fourPillars.year],
    ['月柱', chart.fourPillars.month],
    ['日柱', chart.fourPillars.day],
    ['时柱', chart.fourPillars.hour],
  ] as const) {
    const hiddenStemsText = pillar.hiddenStems.length > 0
      ? pillar.hiddenStems.map((item) => `${item.stem}(${item.tenGod || '-'})`).join(' ')
      : '-';
    const stemText = label === '日柱'
      ? `${pillar.stem}(日主)`
      : `${pillar.stem}(${pillar.tenGod || '-'})`;
    lines.push(`| ${label} | ${pillar.stem}${pillar.branch} | ${stemText} | ${hiddenStemsText} | ${pillar.diShi || '-'} | ${pillar.kongWang?.isKong ? '空' : '-'} |`);
  }
  lines.push('');

  const stemRelationParts = buildBaziCanonicalStemRelations(chart);
  const branchRelationParts = buildBaziCanonicalBranchRelations(chart);
  if (stemRelationParts.length > 0 || branchRelationParts.length > 0) {
    lines.push('## 干支关系');
    if (stemRelationParts.length > 0) lines.push(`- 天干: ${stemRelationParts.join('；')}`);
    if (branchRelationParts.length > 0) lines.push(`- 地支: ${branchRelationParts.join('；')}`);
  }

  if (dayun) {
    lines.push('');
    lines.push('## 大运轨迹');
    lines.push(`- 起运: ${dayun.startAge}岁（${dayun.startAgeDetail}）`);
    lines.push('');
    lines.push('| 起运年份 | 年龄 | 大运干支 | 天干(十神) | 地支藏干(十神) |');
    lines.push('|----------|------|----------|------------|----------------|');
    for (const item of dayun.list) {
      const hiddenStemsText = item.hiddenStems?.length
        ? item.hiddenStems.map((hs) => `${hs.stem}(${hs.tenGod})`).join(' ')
        : '-';
      lines.push(`| ${item.startYear} | ${item.startAge}岁 | ${item.ganZhi} | ${item.stem}(${item.tenGod || '-'}) | ${hiddenStemsText} |`);
    }
  }

  return lines.join('\n');
}

function renderBaziCanonicalFullText(chart: BaziOutput, options: BaziCanonicalTextOptions = {}): string {
  const { dayun } = options;
  const lines: string[] = ['# 八字命盘', '', '## 基本信息'];
  if (options.name) lines.push(`- 姓名: ${options.name}`);
  lines.push(`- 性别: ${chart.gender === 'male' ? '男' : '女'}`);
  lines.push(`- 日主: ${chart.dayMaster}`);
  lines.push(`- 命主五行: ${chart.dayMaster}${GAN_WUXING[chart.dayMaster.charAt(0)] || ''}`);
  if (chart.birthPlace) lines.push(`- 出生地: ${chart.birthPlace}`);
  if (chart.trueSolarTimeInfo) {
    lines.push(...formatTrueSolarBlock(chart.trueSolarTimeInfo));
  }
  if (chart.kongWang?.kongZhi?.length) lines.push(`- 空亡: ${chart.kongWang.kongZhi.join('')}`);
  if (chart.taiYuan) lines.push(`- 胎元: ${chart.taiYuan}`);
  if (chart.mingGong) lines.push(`- 命宫: ${chart.mingGong}`);
  lines.push('');
  lines.push('## 四柱');
  lines.push('| 柱 | 干支 | 天干(十神) | 地支藏干(十神) | 地势 | 纳音 | 神煞 |');
  lines.push('|---|------|------------|----------------|------|------|------|');
  for (const [label, pillar] of [
    ['年柱', chart.fourPillars.year],
    ['月柱', chart.fourPillars.month],
    ['日柱', chart.fourPillars.day],
    ['时柱', chart.fourPillars.hour],
  ] as const) {
    const hiddenStemsText = pillar.hiddenStems.length > 0
      ? pillar.hiddenStems.map((item) => `${item.stem}(${item.tenGod || '-'})`).join(' ')
      : '-';
    const stemText = label === '日柱'
      ? `${pillar.stem}(日主)`
      : `${pillar.stem}(${pillar.tenGod || '-'})`;
    const shenShaText = pillar.shenSha?.length ? pillar.shenSha.join('、') : '-';
    lines.push(`| ${label} | ${pillar.stem}${pillar.branch} | ${stemText} | ${hiddenStemsText} | ${pillar.diShi || '-'} | ${pillar.naYin || '-'} | ${shenShaText} |`);
  }
  lines.push('');

  const stemRelationParts = buildBaziCanonicalStemRelations(chart);
  const branchRelationParts = buildBaziCanonicalBranchRelations(chart);
  if (stemRelationParts.length > 0 || branchRelationParts.length > 0) {
    lines.push('## 干支关系');
    if (stemRelationParts.length > 0) lines.push(`- 天干: ${stemRelationParts.join('；')}`);
    if (branchRelationParts.length > 0) lines.push(`- 地支: ${branchRelationParts.join('；')}`);
  }

  if (dayun) {
    lines.push('');
    lines.push('## 大运轨迹');
    lines.push(`- 起运: ${dayun.startAge}岁（${dayun.startAgeDetail}）`);
    lines.push('');
    lines.push('| 起运年份 | 年龄 | 大运干支 | 天干(十神) | 地支藏干(十神) | 地势 | 纳音 | 神煞 |');
    lines.push('|----------|------|----------|------------|----------------|------|------|------|');
    for (const item of dayun.list) {
      const hiddenStemsText = item.hiddenStems?.length
        ? item.hiddenStems.map((hs) => `${hs.stem}(${hs.tenGod})`).join('、')
        : '-';
      const shenShaText = item.shenSha?.length ? item.shenSha.join('、') : '-';
      lines.push(`| ${item.startYear} | ${item.startAge}岁 | ${item.ganZhi} | ${item.stem}(${item.tenGod || '-'}) | ${hiddenStemsText} | ${item.diShi || '-'} | ${item.naYin || '-'} | ${shenShaText} |`);
    }
  }

  return lines.join('\n');
}

export function renderBaziPillarsResolveCanonicalText(result: BaziPillarsResolveOutput): string {
  const lines: string[] = [
    '# 四柱反推候选时间',
    '',
    '## 原始四柱',
    `- **年柱**: ${result.pillars.yearPillar}`,
    `- **月柱**: ${result.pillars.monthPillar}`,
    `- **日柱**: ${result.pillars.dayPillar}`,
    `- **时柱**: ${result.pillars.hourPillar}`,
    '',
    '## 候选数量',
    `- **总数**: ${result.count}`,
  ];

  if (result.candidates.length === 0) {
    lines.push('');
    lines.push('## 候选列表');
    lines.push('- 无匹配候选');
    return lines.join('\n');
  }

  lines.push('');
  lines.push('## 候选列表');
  for (const [index, candidate] of result.candidates.entries()) {
    lines.push('');
    lines.push(`### 候选 ${index + 1}（${candidate.candidateId}）`);
    lines.push(`- **农历**: ${candidate.lunarText}`);
    lines.push(`- **公历**: ${candidate.solarText}`);
    lines.push(`- **出生时间**: ${candidate.birthHour}:${String(candidate.birthMinute).padStart(2, '0')}`);
    if (candidate.isLeapMonth) lines.push('- **闰月**: 是');
  }

  return lines.join('\n');
}

export function renderZiweiCanonicalText(result: ZiweiOutput, options: ZiweiCanonicalTextOptions = {}): string {
  const detailLevel = normalizeZiweiDetailLevel(options.detailLevel);
  if (detailLevel === 'full') {
    return renderZiweiCanonicalFullText(result, options);
  }

  return renderZiweiCanonicalDefaultText(result, options);
}

function formatZiweiCanonicalLunarDate(result: ZiweiOutput): string {
  const raw = result.lunarDate?.trim();
  if (!raw) return '';
  const yearLabel = `${result.fourPillars.year.gan}${result.fourPillars.year.zhi}年`;
  if (!raw.includes('年')) return raw;
  const [, ...rest] = raw.split('年');
  const suffix = rest.join('年').trim();
  return suffix ? `${yearLabel}${suffix}` : yearLabel;
}

function buildZiweiBirthMutagenLine(result: ZiweiOutput): string | undefined {
  if (!result.mutagenSummary?.length) return undefined;
  const order = new Map([
    ['禄', 0],
    ['权', 1],
    ['科', 2],
    ['忌', 3],
  ]);
  const sorted = [...result.mutagenSummary].sort((left, right) => {
    const leftOrder = order.get(left.mutagen) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = order.get(right.mutagen) ?? Number.MAX_SAFE_INTEGER;
    return leftOrder - rightOrder;
  });
  const items = sorted.map((item) => `${item.starName}化${item.mutagen}`);
  return `${items.join('、')} (${result.fourPillars.year.gan}干)`;
}

function formatZiweiPalaceName(palace: ZiweiOutput['palaces'][number]): string {
  const tags: string[] = [];
  if (palace.isBodyPalace) tags.push('身宫');
  if (palace.isOriginalPalace) tags.push('来因');
  return tags.length > 0 ? `${palace.name}(${tags.join('、')})` : palace.name;
}

function appendZiweiHoroscopeBlock(lines: string[], options: ZiweiCanonicalTextOptions): void {
  if (!options.horoscope) return;
  const h = options.horoscope;
  lines.push('');
  lines.push('## 当前运限');
  lines.push(`- 当前大限: ${h.decadal.palaceName}（${h.decadal.ageRange}）`);
  lines.push(`- 流年宫位: ${h.yearly.palaceName}（${h.yearly.period}）`);
  lines.push(`- 流月宫位: ${h.monthly.palaceName}（${h.monthly.period}）`);
  lines.push(`- 流日宫位: ${h.daily.palaceName}（${h.daily.period}）`);
}

function renderZiweiCanonicalDefaultText(result: ZiweiOutput, options: ZiweiCanonicalTextOptions = {}): string {
  const lines: string[] = ['# 紫微命盘', '', '## 基本信息'];
  if (result.gender === 'male' || result.gender === 'female') {
    lines.push(`- 性别: ${result.gender === 'male' ? '男' : '女'}`);
  }
  const lunarDate = formatZiweiCanonicalLunarDate(result) || result.lunarDate;
  lines.push(`- 阳历: ${result.solarDate}${lunarDate ? ` (农历: ${lunarDate})` : ''}`);
  lines.push(`- 四柱: ${result.fourPillars.year.gan}${result.fourPillars.year.zhi} ${result.fourPillars.month.gan}${result.fourPillars.month.zhi} ${result.fourPillars.day.gan}${result.fourPillars.day.zhi} ${result.fourPillars.hour.gan}${result.fourPillars.hour.zhi}`);
  lines.push(`- 五行局: ${result.fiveElement}`);
  lines.push(`- 命主: ${result.soul} / 身主: ${result.body}`);
  const birthMutagenLine = buildZiweiBirthMutagenLine(result);
  if (birthMutagenLine) lines.push(`- 生年四化: ${birthMutagenLine}`);
  if (result.trueSolarTimeInfo) {
    lines.push(`- 真太阳时: ${result.trueSolarTimeInfo.trueSolarTime} (钟表时间: ${result.trueSolarTimeInfo.clockTime}; 经度: ${result.trueSolarTimeInfo.longitude}°; 校正: ${result.trueSolarTimeInfo.correctionMinutes > 0 ? '+' : ''}${result.trueSolarTimeInfo.correctionMinutes}分钟)`);
  }
  lines.push('');
  lines.push('## 十二宫位全盘');
  lines.push('| 宫位 | 干支 | 大限 | 主星及四化 | 辅煞星 (吉/煞/禄/马) |');
  lines.push('|------|------|------|------------|----------------------|');
  for (const palace of sortZiweiPalaces(result.palaces)) {
    const decadal = palace.decadalRange ? `${palace.decadalRange[0]}~${palace.decadalRange[1]}` : '-';
    lines.push(`| ${formatZiweiPalaceName(palace)} | ${palace.heavenlyStem}${palace.earthlyBranch} | ${decadal} | ${palace.majorStars.map(formatStarLabel).join('、') || '-'} | ${palace.minorStars.map(formatStarLabel).join('、') || '-'} |`);
  }

  appendZiweiHoroscopeBlock(lines, options);
  return lines.join('\n');
}

function renderZiweiCanonicalFullText(result: ZiweiOutput, options: ZiweiCanonicalTextOptions = {}): string {
  const lines: string[] = ['# 紫微命盘', '', '## 基本信息'];
  if (result.gender === 'male' || result.gender === 'female') {
    lines.push(`- 性别: ${result.gender === 'male' ? '男' : '女'}`);
  }
  const lunarDate = formatZiweiCanonicalLunarDate(result) || result.lunarDate;
  lines.push(`- 阳历: ${result.solarDate}${lunarDate ? ` (农历: ${lunarDate})` : ''}`);
  lines.push(`- 四柱: ${result.fourPillars.year.gan}${result.fourPillars.year.zhi} ${result.fourPillars.month.gan}${result.fourPillars.month.zhi} ${result.fourPillars.day.gan}${result.fourPillars.day.zhi} ${result.fourPillars.hour.gan}${result.fourPillars.hour.zhi}`);
  lines.push(`- 五行局: ${result.fiveElement}`);
  lines.push(`- 命主: ${result.soul} / 身主: ${result.body}`);
  if (result.time) lines.push(`- 时辰: ${result.time}${result.timeRange ? `（${result.timeRange}）` : ''}`);
  const identityParts: string[] = [];
  if (result.douJun) identityParts.push(`斗君: ${result.douJun}`);
  if (result.lifeMasterStar) identityParts.push(`命主星: ${result.lifeMasterStar}`);
  if (result.bodyMasterStar) identityParts.push(`身主星: ${result.bodyMasterStar}`);
  if (identityParts.length > 0) lines.push(`- ${identityParts.join(' / ')}`);
  const birthMutagenLine = buildZiweiBirthMutagenLine(result);
  if (birthMutagenLine) lines.push(`- 生年四化: ${birthMutagenLine}`);
  if (result.trueSolarTimeInfo) {
    lines.push(`- 真太阳时: ${result.trueSolarTimeInfo.trueSolarTime} (钟表时间: ${result.trueSolarTimeInfo.clockTime}; 经度: ${result.trueSolarTimeInfo.longitude}°; 校正: ${result.trueSolarTimeInfo.correctionMinutes > 0 ? '+' : ''}${result.trueSolarTimeInfo.correctionMinutes}分钟)`);
    lines.push(`- 真太阳时索引: ${result.trueSolarTimeInfo.trueTimeIndex}`);
    lines.push(`- 跨日偏移: ${result.trueSolarTimeInfo.dayOffset > 0 ? `后${result.trueSolarTimeInfo.dayOffset}日` : result.trueSolarTimeInfo.dayOffset < 0 ? `前${Math.abs(result.trueSolarTimeInfo.dayOffset)}日` : '当日'}`);
  }
  lines.push('');
  lines.push('## 十二宫位全盘');
  lines.push('| 宫位 | 干支 | 大限 | 主星及四化 | 辅星 | 杂曜 | 神煞 | 流年 | 小限 |');
  lines.push('|------|------|------|------------|------|------|------|------|------|');
  for (const palace of sortZiweiPalaces(result.palaces)) {
    const palaceLabel = formatZiweiPalaceName(palace);
    const shensha = [palace.changsheng12, palace.boshi12, palace.jiangqian12, palace.suiqian12].filter(Boolean).join('、') || '-';
    const decadal = palace.decadalRange ? `${palace.decadalRange[0]}~${palace.decadalRange[1]}` : '-';
    const liuNian = palace.liuNianAges?.length ? palace.liuNianAges.join(',') : '-';
    const xiaoXian = palace.ages?.length ? palace.ages.join(',') : '-';
    lines.push(`| ${palaceLabel} | ${palace.heavenlyStem}${palace.earthlyBranch} | ${decadal} | ${palace.majorStars.map(formatStarLabel).join('、') || '-'} | ${palace.minorStars.map(formatStarLabel).join('、') || '-'} | ${(palace.adjStars || []).map(formatStarLabel).join('、') || '-'} | ${shensha} | ${liuNian} | ${xiaoXian} |`);
  }

  appendZiweiHoroscopeBlock(lines, options);
  return lines.join('\n');
}

export function renderZiweiHoroscopeCanonicalText(result: ZiweiHoroscopeOutput): string {
  const lines: string[] = [
    '# 紫微运限',
    '',
    '## 基本信息',
    `- **阳历**: ${result.solarDate}`,
    `- **农历**: ${result.lunarDate}`,
    `- **命主**: ${result.soul}`,
    `- **身主**: ${result.body}`,
    `- **五行局**: ${result.fiveElement}`,
    `- **目标日期**: ${result.targetDate}`,
    '',
    '## 运限列表',
    '| 类型 | 宫位 | 干支 | 四化 | 十二宫重排 | 附加 |',
    '|------|------|------|------|------------|------|',
  ];

  const periods = [
    { label: '大限', data: result.decadal },
    { label: '小限', data: result.age, extra: `虚岁${result.age.nominalAge}` },
    { label: '流年', data: result.yearly },
    { label: '流月', data: result.monthly },
    { label: '流日', data: result.daily },
    { label: '流时', data: result.hourly },
  ];

  for (const { label, data, extra } of periods) {
    lines.push(
      `| ${label} | ${data.name} | ${data.heavenlyStem}${data.earthlyBranch} | ${data.mutagen.join('、') || '-'} | ${data.palaceNames.join('、') || '-'} | ${extra || '-'} |`,
    );
  }

  if (result.transitStars?.length) {
    lines.push('');
    lines.push('## 流年星曜');
    for (const entry of result.transitStars) {
      lines.push(`- ${entry.starName} → ${entry.palaceName}`);
    }
  }

  if (result.yearlyDecStar?.suiqian12.length) {
    lines.push('');
    lines.push('## 岁前十二星');
    lines.push(result.yearlyDecStar.suiqian12.join('、'));
  }

  if (result.yearlyDecStar?.jiangqian12.length) {
    lines.push('');
    lines.push('## 将前十二星');
    lines.push(result.yearlyDecStar.jiangqian12.join('、'));
  }

  return lines.join('\n');
}

function formatZiweiFlyingStarResult(r: FlyingStarResult, lines: string[]): void {
  if (r.type === 'fliesTo' || r.type === 'selfMutaged') {
    lines.push(`- **结果**: ${r.result ? '是' : '否'}`);
    return;
  }

  if (r.type === 'mutagedPlaces') {
    const places = r.result as MutagedPlaceInfo[];
    if (places.length === 0) {
      lines.push('- **结果**: 无');
      return;
    }
    for (const p of places) {
      lines.push(`- **化${p.mutagen}**: ${p.targetPalace ?? '无'}`);
    }
    return;
  }

  if (r.type === 'surroundedPalaces') {
    const s = r.result as SurroundedPalaceInfo;
    lines.push(`- **本宫**: ${s.target.name}`);
    lines.push(`- **对宫**: ${s.opposite.name}`);
    lines.push(`- **财帛**: ${s.wealth.name}`);
    lines.push(`- **官禄**: ${s.career.name}`);
  }
}

export function renderZiweiFlyingStarCanonicalText(result: ZiweiFlyingStarOutput): string {
  const lines: string[] = ['# 紫微飞星分析'];

  for (const r of result.results) {
    lines.push('');
    lines.push(`## 查询 ${r.queryIndex + 1}`);
    lines.push(`- **类型**: ${r.type}`);
    formatZiweiFlyingStarResult(r, lines);
  }

  return lines.join('\n');
}

export function renderLiuyaoCanonicalText(result: LiuyaoOutput): string {
  const lines: string[] = ['# 六爻分析', '', '## 卦象信息'];
  if (result.question) lines.push(`- 问题: ${result.question}`);
  lines.push(`- 本卦: ${result.hexagramName}（${result.hexagramGong || '?'}宫·${result.hexagramElement || '?'}）`);
  if (result.guaCi) lines.push(`- 卦辞: ${result.guaCi}`);
  if (result.xiangCi) lines.push(`- 象辞: ${result.xiangCi}`);
  if (result.changedHexagramName) {
    lines.push(`- 变卦: ${result.changedHexagramName}（${result.changedHexagramGong || ''}宫·${result.changedHexagramElement || ''}）`);
    if (result.changedGuaCi) lines.push(`- 变卦卦辞: ${result.changedGuaCi}`);
    if (result.changedXiangCi) lines.push(`- 变卦象辞: ${result.changedXiangCi}`);
    for (const yao of (result.fullYaos || []).filter((item) => item.isChanging && item.yaoCi)) {
      lines.push(`- ${traditionalYaoName(yao.position, yao.type)}爻辞: ${yao.yaoCi}`);
    }
  } else {
    lines.push('- 变卦: 无');
  }
  if (result.nuclearHexagram) {
    lines.push(`- 互卦: ${result.nuclearHexagram.name}`);
    if (result.nuclearHexagram.guaCi) lines.push(`- 互卦卦辞: ${result.nuclearHexagram.guaCi}`);
    if (result.nuclearHexagram.xiangCi) lines.push(`- 互卦象辞: ${result.nuclearHexagram.xiangCi}`);
  }
  if (result.oppositeHexagram) {
    lines.push(`- 错卦: ${result.oppositeHexagram.name}`);
    if (result.oppositeHexagram.guaCi) lines.push(`- 错卦卦辞: ${result.oppositeHexagram.guaCi}`);
    if (result.oppositeHexagram.xiangCi) lines.push(`- 错卦象辞: ${result.oppositeHexagram.xiangCi}`);
  }
  if (result.reversedHexagram) {
    lines.push(`- 综卦: ${result.reversedHexagram.name}`);
    if (result.reversedHexagram.guaCi) lines.push(`- 综卦卦辞: ${result.reversedHexagram.guaCi}`);
    if (result.reversedHexagram.xiangCi) lines.push(`- 综卦象辞: ${result.reversedHexagram.xiangCi}`);
  }
  if (result.guaShen) {
    const guaShenYao = (result.fullYaos || []).find((y) => y.position === result.guaShen!.linePosition);
    const posLabel = typeof result.guaShen.linePosition === 'number'
      ? (guaShenYao ? `${traditionalYaoName(result.guaShen.linePosition, guaShenYao.type)}爻` : `${result.guaShen.linePosition}爻`)
      : '';
    const extra = [posLabel, result.guaShen.absent ? '飞伏' : ''].filter(Boolean).join('，');
    lines.push(`- 卦身: ${result.guaShen.branch}${extra ? `（${extra}）` : ''}`);
  } else {
    lines.push('- 卦身: 无');
  }
  lines.push('');
  const gz = result.ganZhiTime;
  lines.push('| 柱 | 干支 | 空亡 |');
  lines.push('|------|------|------|');
  lines.push(`| 年 | ${gz.year.gan}${gz.year.zhi} | ${result.kongWangByPillar.year.kongDizhi.join(' ')} |`);
  lines.push(`| 月 | ${gz.month.gan}${gz.month.zhi} | ${result.kongWangByPillar.month.kongDizhi.join(' ')} |`);
  lines.push(`| 日 | ${gz.day.gan}${gz.day.zhi} | ${result.kongWang.kongDizhi.join(' ')} |`);
  lines.push(`| 时 | ${gz.hour.gan}${gz.hour.zhi} | ${result.kongWangByPillar.hour.kongDizhi.join(' ')} |`);
  lines.push('');
  lines.push('## 六爻排盘');
  lines.push('');
  const sortedYaos = sortYaosDescending(result.fullYaos || []);
  const globalShenShaSet = new Set(result.globalShenSha || []);
  const hasKongCol = sortedYaos.some((y) => y.kongWangState && y.kongWangState !== 'not_kong');
  const hasChangShengCol = sortedYaos.some((y) => y.changSheng?.stage);
  const hasShenShaCol = sortedYaos.some((y) => y.shenSha?.some((s) => !globalShenShaSet.has(s)));
  const hasBianChuCol = sortedYaos.some((y) => y.isChanging && y.changedYao);
  const hasFuShenCol = sortedYaos.some((y) => y.fuShen);
  const yaoHeader: string[] = ['爻位', '六亲', '六神', '纳甲', '动静'];
  if (hasKongCol) yaoHeader.push('空亡');
  if (hasChangShengCol) yaoHeader.push('长生');
  if (hasShenShaCol) yaoHeader.push('神煞');
  if (hasBianChuCol) yaoHeader.push('变出');
  if (hasFuShenCol) yaoHeader.push('伏神');
  lines.push(`| ${yaoHeader.join(' | ')} |`);
  lines.push(`|${yaoHeader.map(() => '------').join('|')}|`);
  for (const yao of sortedYaos) {
    const shiYing = yao.isShiYao ? '·世' : yao.isYingYao ? '·应' : '';
    const cells: string[] = [
      `${traditionalYaoName(yao.position, yao.type)}${shiYing}`,
      yao.liuQin,
      yao.liuShen,
      `${yao.naJia}${yao.wuXing}(${WANG_SHUAI_LABELS[yao.strength.wangShuai]})`,
      yao.movementLabel,
    ];
    if (hasKongCol) {
      const kl = yao.kongWangState && yao.kongWangState !== 'not_kong' ? KONG_WANG_LABELS[yao.kongWangState] : '';
      cells.push(kl || '-');
    }
    if (hasChangShengCol) cells.push(yao.changSheng?.stage || '-');
    if (hasShenShaCol) {
      const local = yao.shenSha?.filter((s) => !globalShenShaSet.has(s)) || [];
      cells.push(local.length ? local.join('、') : '-');
    }
    if (hasBianChuCol) {
      if (yao.isChanging && yao.changedYao) {
        const rel = yao.changedYao.relation ? `(${yao.changedYao.relation})` : '';
        cells.push(`→${yao.changedYao.liuQin}${yao.changedYao.naJia}${yao.changedYao.wuXing}${rel}`);
      } else {
        cells.push('-');
      }
    }
    if (hasFuShenCol) {
      if (yao.fuShen) {
        const rel = yao.fuShen.relation ? `(${yao.fuShen.relation})` : '';
        cells.push(`${yao.fuShen.liuQin}${yao.fuShen.naJia}${yao.fuShen.wuXing}${rel}`);
      } else {
        cells.push('-');
      }
    }
    lines.push(`| ${cells.join(' | ')} |`);
  }
  lines.push('');

  if (result.yongShen.length > 0) {
    lines.push('## 用神分析');
    lines.push('');
    const yaoNameMap = new Map<number, string>();
    for (const yao of sortedYaos) yaoNameMap.set(yao.position, traditionalYaoName(yao.position, yao.type));
    const posLabel = (pos?: number) => (pos ? `${yaoNameMap.get(pos) || pos}爻` : '');
    const shenSystemMap = buildShenSystemMap(result.shenSystemByYongShen || []);
    const timeRecMap = new Map<string, typeof result.timeRecommendations>();
    for (const item of result.timeRecommendations || []) {
      const list = timeRecMap.get(item.targetLiuQin) || [];
      list.push(item);
      timeRecMap.set(item.targetLiuQin, list);
    }
    for (const group of result.yongShen) {
      const statusSuffix = group.selectionStatus !== 'resolved' ? `（${YONG_SHEN_STATUS_LABELS[group.selectionStatus] || group.selectionStatus}）` : '';
      lines.push(`### ${group.targetLiuQin}${statusSuffix}`);
      const selected = group.selected;
      const selectedExtra = [
        selected.changedNaJia ? `变出=${selected.changedNaJia}` : null,
        selected.huaType ? `化变=${selected.huaType}` : null,
      ].filter(Boolean).join('，');
      const posStr = posLabel(selected.position);
      const mainPrefix = posStr || selected.liuQin;
      lines.push(`- ${mainPrefix}${selected.naJia ? ` ${selected.naJia}` : ''}${selectedExtra ? `（${selectedExtra}）` : ''}，${selected.strengthLabel}，${selected.movementLabel}`);
      if (group.selectionNote && group.selectionStatus !== 'resolved') lines.push(`- 说明: ${group.selectionNote}`);
      if (selected.evidence?.length) lines.push(`- 依据: ${selected.evidence.join('、')}`);
      if (group.candidates?.length) {
        lines.push(`- 并看: ${group.candidates.map((candidate) => {
          const candidateExtra = [
            candidate.changedNaJia ? `变出=${candidate.changedNaJia}` : null,
            candidate.huaType ? `化变=${candidate.huaType}` : null,
          ].filter(Boolean).join('，');
          const cPos = posLabel(candidate.position);
          const cPrefix = cPos || candidate.liuQin;
          return `${cPrefix}${candidate.naJia ? ` ${candidate.naJia}` : ''}${candidateExtra ? `（${candidateExtra}）` : ''}${candidate.evidence?.length ? `：${candidate.evidence.join('、')}` : ''}`;
        }).join('；')}`);
      }
      const system = shenSystemMap.get(group.targetLiuQin);
      const shenParts = formatShenSystemParts(system);
      if (shenParts.length > 0) lines.push(`- 神系: ${shenParts.join('，')}`);
      const recs = timeRecMap.get(group.targetLiuQin);
      if (recs?.length) {
        for (const item of recs) {
          lines.push(`- 应期: ${item.trigger}${item.basis?.length ? `（${item.basis.join('、')}）` : ''}，${item.description}`);
        }
      }
      lines.push('');
    }
  }

  const guaLevelParts = formatGuaLevelLines(result).map((line) => `- ${line}`);
  if (guaLevelParts.length > 0) {
    lines.push('## 卦级分析');
    lines.push('');
    lines.push(...guaLevelParts);
    lines.push('');
  }

  if (result.warnings?.length) {
    lines.push('## 凶吉警告');
    lines.push('');
    for (const warning of result.warnings) lines.push(`- ${warning}`);
    lines.push('');
  }

  return lines.join('\n');
}

function buildLiuyaoSafeTextPosition(
  position: number | undefined,
  fullYaos: LiuyaoOutput['fullYaos'],
): string | undefined {
  if (!position) return undefined;
  const attached = fullYaos.find((yao) => yao.position === position);
  return attached ? `${traditionalYaoName(position, attached.type)}爻` : `${position}爻`;
}

function buildLiuyaoSafeInteractionText(result: LiuyaoOutput): string[] {
  const lines: string[] = [];
  const sourceIndex = new Map<string, string>();
  for (const yao of result.fullYaos || []) {
    const positionLabel = buildLiuyaoSafeTextPosition(yao.position, result.fullYaos) || `${yao.position}爻`;
    if (yao.isChanging) {
      sourceIndex.set(`moving:${yao.naJia}`, `${yao.naJia}(动爻 ${positionLabel})`);
    }
    if (yao.changedYao) {
      sourceIndex.set(`changed:${yao.changedYao.naJia}`, `${yao.changedYao.naJia}(变爻 ${positionLabel})`);
    }
  }
  sourceIndex.set(`month:${result.ganZhiTime.month.zhi}`, `${result.ganZhiTime.month.zhi}(月建)`);
  sourceIndex.set(`day:${result.ganZhiTime.day.zhi}`, `${result.ganZhiTime.day.zhi}(日建)`);

  if (result.sanHeAnalysis?.banHe?.length) {
    for (const item of result.sanHeAnalysis.banHe) {
      const participants = item.branches.map((branch) =>
        sourceIndex.get(`changed:${branch}`)
        || sourceIndex.get(`moving:${branch}`)
        || sourceIndex.get(`month:${branch}`)
        || sourceIndex.get(`day:${branch}`)
        || branch,
      );
      lines.push(`- 半合: ${participants.join(' + ')} -> ${item.result}`);
    }
  }

  if (result.sanHeAnalysis?.fullSanHeList?.length) {
    for (const item of result.sanHeAnalysis.fullSanHeList) {
      const positions = item.positions?.map((position) => buildLiuyaoSafeTextPosition(position, result.fullYaos) || `${position}爻`) || [];
      lines.push(`- 三合: ${item.name} -> ${item.result}${positions.length ? ` (${positions.join('、')})` : ''}`);
    }
  }

  if (result.chongHeTransition?.type === 'chong_to_he') {
    lines.push('- 转换: 冲转合');
  } else if (result.chongHeTransition?.type === 'he_to_chong') {
    lines.push('- 转换: 合转冲');
  }

  if (result.guaFanFuYin?.isFuYin) lines.push('- 共振: 伏吟');
  if (result.guaFanFuYin?.isFanYin) lines.push('- 共振: 反吟');

  return lines;
}

function mapLiuyaoRelationLabel(label: string | undefined): string | undefined {
  if (!label || label === '平') return undefined;
  return label;
}

export function renderLiuyaoAISafeText(result: LiuyaoOutput): string {
  return renderLiuyaoLevelText(result, { detailLevel: 'default' });
}

export function renderLiuyaoLevelText(
  result: LiuyaoOutput,
  options?: { detailLevel?: 'default' | 'more' | 'full' | 'safe' | 'facts' | 'debug' },
): string {
  const requested = options?.detailLevel;
  const detailLevel = requested === 'more' || requested === 'facts'
    ? 'more'
    : requested === 'full' || requested === 'debug'
      ? 'full'
      : 'default';

  const lines: string[] = ['# 六爻盘面', '', '## 卦盘总览'];
  if (result.question) lines.push(`- 问题: ${result.question}`);
  lines.push(`- 本卦: ${result.hexagramName}（${result.hexagramGong || '?'}宫·${result.hexagramElement || '?'}）`);
  if (result.guaCi) {
    lines.push(`- 本卦卦辞: ${result.guaCi}`);
  }
  if (result.changedHexagramName) {
    const changedMeta = result.changedHexagramGong || result.changedHexagramElement
      ? `（${result.changedHexagramGong || ''}宫·${result.changedHexagramElement || ''}）`
      : '';
    lines.push(`- 变卦: ${result.changedHexagramName}${changedMeta}`);
    if (result.changedGuaCi) {
      lines.push(`- 变卦卦辞: ${result.changedGuaCi}`);
    }
  }
  const changing = (result.fullYaos || [])
    .filter((item) => item.isChanging)
    .map((yao) => traditionalYaoName(yao.position, yao.type));
  if (changing.length > 0) {
    lines.push(`- 动爻: ${changing.join('、')}`);
  }
  for (const yao of (result.fullYaos || []).filter((item) => item.isChanging && item.yaoCi)) {
    lines.push(`- ${traditionalYaoName(yao.position, yao.type)}爻辞: ${yao.yaoCi}`);
  }

  if (detailLevel === 'more' || detailLevel === 'full') {
    if (result.guaShen) {
      const guaShenPos = result.guaShen.linePosition ? buildLiuyaoSafeTextPosition(result.guaShen.linePosition, result.fullYaos) : '';
      lines.push(`- 卦身: ${result.guaShen.branch}${guaShenPos ? `（${guaShenPos}）` : ''}`);
    }
    if (result.nuclearHexagram) lines.push(`- 互卦: ${result.nuclearHexagram.name}`);
    if (result.oppositeHexagram) lines.push(`- 错卦: ${result.oppositeHexagram.name}`);
    if (result.reversedHexagram) lines.push(`- 综卦: ${result.reversedHexagram.name}`);
    if (result.globalShenSha?.length) lines.push(`- 全局神煞: ${result.globalShenSha.join('、')}`);
    lines.push('');
  }

  const gz = result.ganZhiTime;
  lines.push('## 时间信息');
  lines.push('| 柱 | 干支 | 空亡 |');
  lines.push('|------|------|------|');
  lines.push(`| 年 | ${gz.year.gan}${gz.year.zhi} | ${result.kongWangByPillar.year.kongDizhi.join(' ')} |`);
  lines.push(`| 月 | ${gz.month.gan}${gz.month.zhi} | ${result.kongWangByPillar.month.kongDizhi.join(' ')} |`);
  lines.push(`| 日 | ${gz.day.gan}${gz.day.zhi} | ${result.kongWang.kongDizhi.join(' ')} |`);
  lines.push(`| 时 | ${gz.hour.gan}${gz.hour.zhi} | ${result.kongWangByPillar.hour.kongDizhi.join(' ')} |`);
  lines.push('');

  const boardLines = sortYaosDescending(result.fullYaos || []);
  if (boardLines.length > 0) {
    lines.push('## 六爻排盘');
    const header = ['爻位', '六神'];
    if (detailLevel === 'more' || detailLevel === 'full') header.push('神煞');
    header.push('伏神', '本卦六亲/干支');
    if (detailLevel === 'full') header.push('旺衰', '动静', '空亡');
    header.push('变出');
    if (detailLevel === 'full') header.push('化变');
    header.push('世应');
    lines.push(`| ${header.join(' | ')} |`);
    lines.push(`|${header.map(() => '------').join('|')}|`);
    for (const yao of boardLines) {
      const fuShen = yao.fuShen ? `${yao.fuShen.liuQin} ${yao.fuShen.naJia}${yao.fuShen.wuXing}` : '-';
      const mainLine = `${yao.liuQin} ${yao.naJia}${yao.wuXing}`;
      const changedTo = yao.changedYao ? `${yao.changedYao.liuQin} ${yao.changedYao.naJia}${yao.changedYao.wuXing}` : '-';
      const shiYing = yao.isShiYao ? '世' : yao.isYingYao ? '应' : '-';
      const row = [traditionalYaoName(yao.position, yao.type), yao.liuShen];
      if (detailLevel === 'more' || detailLevel === 'full') row.push(yao.shenSha?.length ? yao.shenSha.join('、') : '-');
      row.push(fuShen, mainLine);
      if (detailLevel === 'full') {
        row.push(
          WANG_SHUAI_LABELS[yao.strength.wangShuai],
          yao.movementLabel,
          yao.kongWangState && yao.kongWangState !== 'not_kong' ? (KONG_WANG_LABELS[yao.kongWangState] || yao.kongWangState) : '-',
        );
      }
      row.push(changedTo);
      if (detailLevel === 'full') row.push(mapLiuyaoRelationLabel(yao.changedYao?.relation) || '-');
      row.push(shiYing);
      lines.push(`| ${row.join(' | ')} |`);
    }
    lines.push('');
  }

  const interactions = buildLiuyaoSafeInteractionText(result);
  if (interactions.length > 0) {
    lines.push('## 卦象关系', '');
    lines.push(...interactions);
    if (detailLevel === 'full') {
      if (result.liuChongGuaInfo) lines.push(`- 六冲卦: ${result.liuChongGuaInfo.isLiuChongGua ? '是' : '否'}`);
      if (result.liuHeGuaInfo) lines.push(`- 六合卦: ${result.liuHeGuaInfo.isLiuHeGua ? '是' : '否'}`);
      if (result.chongHeTransition?.type && result.chongHeTransition.type !== 'none') {
        lines.push(`- 冲合转换: ${result.chongHeTransition.type === 'chong_to_he' ? '冲转合' : '合转冲'}`);
      }
      const resonanceFlags = [
        ...(result.guaFanFuYin?.isFanYin ? ['反吟'] : []),
        ...(result.guaFanFuYin?.isFuYin ? ['伏吟'] : []),
      ];
      if (resonanceFlags.length > 0) {
        lines.push(`- 反吟伏吟: ${resonanceFlags.join('、')}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

export function renderTarotCanonicalText(result: TarotOutput, options: TarotCanonicalTextOptions = {}): string {
  const lines: string[] = ['# 塔罗占卜', '', '## 基本信息', `- **牌阵**: ${result.spreadName}`];
  if (result.question) lines.push(`- **问题**: ${result.question}`);
  if (options.birthDate?.trim()) lines.push(`- **出生日期**: ${options.birthDate.trim()}`);
  lines.push('');

  // Dynamic columns for card table
  const hasElement = result.cards.some((c) => c.element);
  const hasAstro = result.cards.some((c) => c.astrologicalCorrespondence);

  const header = ['牌位', '牌名', '方向', '关键词', '牌义'];
  if (hasElement) header.push('元素');
  if (hasAstro) header.push('星象');

  lines.push('## 抽到的牌');
  lines.push('');
  lines.push(`| ${header.join(' | ')} |`);
  lines.push(`|${header.map(() => '------').join('|')}|`);

  for (const card of result.cards) {
    const isReversed = card.orientation === 'reversed';
    const direction = isReversed ? '逆位' : '正位';
    // Reversed: use reversedKeywords if available, otherwise fall back to regular keywords
    const keywords = (isReversed && card.reversedKeywords?.length ? card.reversedKeywords : card.card.keywords).join('、');
    const row = [card.position, card.card.nameChinese, direction, keywords, card.meaning];
    if (hasElement) row.push(card.element || '-');
    if (hasAstro) row.push(card.astrologicalCorrespondence || '-');
    lines.push(`| ${row.join(' | ')} |`);
  }
  lines.push('');

  if (result.numerology) {
    lines.push('## 塔罗数秘术');
    lines.push('');
    const nCards = [
      { label: '人格牌', card: result.numerology.personalityCard },
      { label: '灵魂牌', card: result.numerology.soulCard },
      { label: `年度牌(${result.numerology.yearlyCard.year})`, card: result.numerology.yearlyCard },
    ];
    lines.push('| 类型 | 牌名 | 关键词 | 元素 | 星象 |');
    lines.push('|------|------|--------|------|------|');
    for (const { label, card } of nCards) {
      lines.push(`| ${label} | ${card.nameChinese} | ${card.keywords?.join('、') || '-'} | ${card.element || '-'} | ${card.astrologicalCorrespondence || '-'} |`);
    }
  }

  return lines.join('\n');
}

function formatQimenPalaceStateText(palace: QimenOutput['palaces'][number], dayKongPalaces: Set<number>, hourKongPalaces: Set<number>): string {
  if (palace.palaceIndex === 5) return '(寄宫参看对应宫位)';
  const states = [
    dayKongPalaces.has(palace.palaceIndex) ? '日空' : null,
    hourKongPalaces.has(palace.palaceIndex) ? '时空' : null,
    palace.isYiMa ? '驿马' : null,
    palace.isRuMu ? '入墓' : null,
  ].filter(Boolean).join('、');
  return states || '-';
}

function formatQimenMonthPhaseLine(monthPhase: Record<string, string>): string | null {
  const phaseGroups = new Map<string, string[]>();
  for (const [stem, phase] of Object.entries(monthPhase)) {
    if (!phase) continue;
    phaseGroups.set(phase, [...(phaseGroups.get(phase) || []), stem]);
  }
  if (phaseGroups.size === 0) return null;

  const parts: string[] = [];
  for (const [phase, stems] of phaseGroups.entries()) {
    const stemsWithElement = stems.map((stem) => `${stem}${GAN_WUXING[stem] || ''}`).join('');
    parts.push(`${phase}：${stemsWithElement}`);
  }
  return parts.join('、');
}

function formatQimenPalaceName(palace: QimenOutput['palaces'][number]): string {
  return `${palace.palaceName}${palace.palaceIndex}(${palace.element || '-'})`;
}

export function renderQimenCanonicalText(result: QimenOutput, options: QimenCanonicalTextOptions = {}): string {
  const detailLevel = normalizeQimenDetailLevel(options.detailLevel);
  const dunText = result.dunType === 'yang' ? '阳遁' : '阴遁';
  const juLabel = `${dunText}${result.juNumber}局`;
  const dayKongPalaces = new Set(result.kongWang.dayKong.palaces);
  const hourKongPalaces = new Set(result.kongWang.hourKong.palaces);
  const lines: string[] = [
    '# 奇门遁甲排盘',
    '',
    '## 基本信息',
    ...(result.question ? [`- 占问: ${result.question}`] : []),
    `- 四柱: ${result.siZhu.year} ${result.siZhu.month} ${result.siZhu.day} ${result.siZhu.hour}`,
    `- 节气: ${result.dateInfo.solarTerm} (${juLabel} · ${result.yuan})`,
    `- 旬首: ${result.xunShou}`,
    `- 值符 (大局趋势): ${result.zhiFu.star}`,
    `- 值使 (执行枢纽): ${result.zhiShi.gate}`,
  ];
  if (detailLevel === 'full') {
    lines.push(`- 公历: ${result.dateInfo.solarDate}`);
    lines.push(`- 农历: ${result.dateInfo.lunarDate}`);
    if (result.dateInfo.solarTermRange) lines.push(`- 节气范围: ${result.dateInfo.solarTermRange}`);
    lines.push(`- 盘式: ${result.panType}`);
    lines.push(`- 定局法: ${result.juMethod}`);
  }
  lines.push('');
  lines.push('## 九宫盘');
  lines.push('');
  if (detailLevel === 'full') {
    lines.push('| 宫位(五行) | 八神 | 九星(五行) | 八门(五行) | 天盘天干 | 地盘天干 | 宫位状态 | 方位 | 格局 |');
    lines.push('|------------|------|------------|------------|----------|----------|----------|------|------|');
  } else {
    lines.push('| 宫位(五行) | 八神 | 九星(五行) | 八门(五行) | 天盘天干 | 地盘天干 | 宫位状态 |');
    lines.push('|------------|------|------------|------------|----------|----------|----------|');
  }

  for (const palace of result.palaces) {
    const starLabel = palace.star ? `${palace.star}(${palace.starElement || ''})` : '-';
    const gateLabel = palace.gate ? `${palace.gate}(${palace.gateElement || ''})` : '-';
    const row = [
      formatQimenPalaceName(palace),
      palace.deity || '-',
      starLabel,
      gateLabel,
      palace.heavenStem || '-',
      palace.earthStem || '-',
      formatQimenPalaceStateText(palace, dayKongPalaces, hourKongPalaces),
    ];
    if (detailLevel === 'full') {
      row.push(palace.direction || '-');
      row.push(palace.formations.length > 0 ? palace.formations.join('、') : '-');
    }
    lines.push(`| ${row.join(' | ')} |`);
  }

  if (detailLevel === 'full') {
    lines.push('');
    lines.push('## 补充信息');
    lines.push('');
    lines.push(`- 日空: ${result.kongWang.dayKong.branches.join('、') || '-'} (${result.kongWang.dayKong.palaces.map((index) => `${result.palaces[index - 1]?.palaceName || ''}${index}`).join('、') || '-'})`);
    lines.push(`- 时空: ${result.kongWang.hourKong.branches.join('、') || '-'} (${result.kongWang.hourKong.palaces.map((index) => `${result.palaces[index - 1]?.palaceName || ''}${index}`).join('、') || '-'})`);
    lines.push(`- 驿马: ${result.yiMa.branch || '-'}${result.yiMa.palace ? ` (${result.palaces[result.yiMa.palace - 1]?.palaceName || ''}${result.yiMa.palace})` : ''}`);

    const monthPhaseLine = result.monthPhase ? formatQimenMonthPhaseLine(result.monthPhase) : null;
    if (monthPhaseLine) {
      lines.push('');
      lines.push('## 月令旺衰');
      lines.push('');
      lines.push(monthPhaseLine);
    }

    if (result.globalFormations.length > 0) {
      lines.push('');
      lines.push('## 全局格局');
      lines.push('');
      for (const formation of result.globalFormations) {
        lines.push(`- ${formation}`);
      }
    }
  }

  return lines.join('\n');
}

export function renderDaliurenCanonicalText(result: DaliurenOutput): string {
  const lines: string[] = [
    '# 大六壬排盘',
    '',
    '## 基本信息',
    `- **日期**: ${result.dateInfo.solarDate}`,
    ...(result.dateInfo.lunarDate ? [`- **农历**: ${result.dateInfo.lunarDate}`] : []),
    `- **八字**: ${result.dateInfo.bazi}`,
    `- **月将**: ${result.dateInfo.yueJiang}（${result.dateInfo.yueJiangName}）`,
    `- **空亡**: ${result.dateInfo.kongWang.join('、')}`,
    `- **驿马**: ${result.dateInfo.yiMa}`,
    `- **丁马**: ${result.dateInfo.dingMa}`,
    `- **天马**: ${result.dateInfo.tianMa}`,
    `- **昼夜**: ${result.dateInfo.diurnal ? '昼' : '夜'}`,
    `- **取传法**: ${result.keTi.method}`,
  ];
  if (result.keTi.subTypes.length > 0) lines.push(`- **课体**: ${result.keTi.subTypes.join('、')}`);
  if (result.keTi.extraTypes.length > 0) lines.push(`- **附加**: ${result.keTi.extraTypes.join('、')}`);
  if (result.keName) lines.push(`- **课名**: ${result.keName}`);
  if (result.benMing) lines.push(`- **本命**: ${result.benMing}`);
  if (result.xingNian) lines.push(`- **行年**: ${result.xingNian}`);
  if (result.question) lines.push(`- **占事**: ${result.question}`);
  lines.push('');
  lines.push('## 四课');
  lines.push('');
  lines.push('| 课 | 上神 | 下神 | 天将 |');
  lines.push('|---|------|------|------|');
  lines.push(`| 一课 | ${result.siKe.yiKe[0]?.[0] || '-'} | ${result.siKe.yiKe[0]?.[1] || '-'} | ${result.siKe.yiKe[1] || '-'} |`);
  lines.push(`| 二课 | ${result.siKe.erKe[0]?.[0] || '-'} | ${result.siKe.erKe[0]?.[1] || '-'} | ${result.siKe.erKe[1] || '-'} |`);
  lines.push(`| 三课 | ${result.siKe.sanKe[0]?.[0] || '-'} | ${result.siKe.sanKe[0]?.[1] || '-'} | ${result.siKe.sanKe[1] || '-'} |`);
  lines.push(`| 四课 | ${result.siKe.siKe[0]?.[0] || '-'} | ${result.siKe.siKe[0]?.[1] || '-'} | ${result.siKe.siKe[1] || '-'} |`);
  lines.push('');
  lines.push('## 三传');
  lines.push('');
  lines.push('| 传 | 地支 | 天将 | 六亲 | 遁干 |');
  lines.push('|---|------|------|------|------|');
  lines.push(`| 初传 | ${result.sanChuan.chu[0] || '-'} | ${result.sanChuan.chu[1] || '-'} | ${result.sanChuan.chu[2] || '-'} | ${result.sanChuan.chu[3] || '-'} |`);
  lines.push(`| 中传 | ${result.sanChuan.zhong[0] || '-'} | ${result.sanChuan.zhong[1] || '-'} | ${result.sanChuan.zhong[2] || '-'} | ${result.sanChuan.zhong[3] || '-'} |`);
  lines.push(`| 末传 | ${result.sanChuan.mo[0] || '-'} | ${result.sanChuan.mo[1] || '-'} | ${result.sanChuan.mo[2] || '-'} | ${result.sanChuan.mo[3] || '-'} |`);
  lines.push('');
  if (result.gongInfos.length > 0) {
    lines.push('## 十二宫');
    lines.push('');
    lines.push('| 地盘 | 天盘 | 天将 | 遁干 | 长生 | 建除 |');
    lines.push('|------|------|------|------|------|------|');
    for (const item of result.gongInfos) {
      const inlineParts = [item.wuXing, item.wangShuai].filter(Boolean).join('·');
      const diZhiLabel = inlineParts ? `${item.diZhi}(${inlineParts})` : item.diZhi;
      lines.push(`| ${diZhiLabel} | ${item.tianZhi} | ${item.tianJiangShort || item.tianJiang} | ${item.dunGan || '-'} | ${item.changSheng || '-'} | ${item.jianChu || '-'} |`);
    }
    lines.push('');
  }
  if (result.shenSha.length > 0) {
    lines.push('## 神煞');
    lines.push('');
    const shaByValue = new Map<string, string[]>();
    for (const item of result.shenSha) {
      const names = shaByValue.get(item.value) || [];
      names.push(item.name);
      shaByValue.set(item.value, names);
    }
    for (const [value, names] of shaByValue) {
      lines.push(`- ${value}: ${names.join('、')}`);
    }
  }
  return lines.join('\n');
}

export function renderFortuneCanonicalText(result: FortuneOutput): string {
  const { date, dayInfo, tenGod, almanac } = result;
  const lines: string[] = [
    '# 每日运势',
    '',
    '## 基本信息',
    `- **日期**: ${date}`,
    `- **日干支**: ${dayInfo.ganZhi}`,
    `- **流日十神**: ${tenGod}`,
  ];

  if (almanac) {
    lines.push('');
    lines.push('## 黄历');
    lines.push(`- **农历**: ${almanac.lunarDate || `${almanac.lunarMonth}${almanac.lunarDay}`}`);
    lines.push(`- **生肖**: ${almanac.zodiac}`);
    if (almanac.solarTerm) lines.push(`- **节气**: ${almanac.solarTerm}`);
    if (almanac.chongSha) lines.push(`- **冲煞**: ${almanac.chongSha}`);
    if (almanac.pengZuBaiJi) lines.push(`- **彭祖百忌**: ${almanac.pengZuBaiJi}`);
    if (almanac.taiShen) lines.push(`- **胎神占方**: ${almanac.taiShen}`);
    if (almanac.dayNineStar) lines.push(`- **日九星**: ${almanac.dayNineStar.description}（${almanac.dayNineStar.position}）`);

    if (almanac.suitable.length > 0) {
      lines.push('');
      lines.push('### 宜');
      for (const item of almanac.suitable) lines.push(`- ${item}`);
    }
    if (almanac.avoid.length > 0) {
      lines.push('');
      lines.push('### 忌');
      for (const item of almanac.avoid) lines.push(`- ${item}`);
    }
    if (almanac.jishen && almanac.jishen.length > 0) {
      lines.push('');
      lines.push('### 吉神宜趋');
      lines.push(almanac.jishen.join('、'));
    }
    if (almanac.xiongsha && almanac.xiongsha.length > 0) {
      lines.push('');
      lines.push('### 凶煞宜忌');
      lines.push(almanac.xiongsha.join('、'));
    }
  }

  return lines.join('\n');
}

export function renderDayunCanonicalText(result: DayunOutput, options: DayunCanonicalTextOptions = {}): string {
  const detailLevel = normalizeBaziDetailLevel(options.detailLevel);
  if (detailLevel === 'full') {
    return renderDayunCanonicalFullText(result);
  }

  return renderDayunCanonicalDefaultText(result);
}

function renderDayunCanonicalDefaultText(result: DayunOutput): string {
  const lines: string[] = [
    '# 大运流年',
    '',
    '## 起运信息',
    '',
    `- 起运年龄：${result.startAge}岁`,
    `- 起运详情：${result.startAgeDetail}`,
    '',
    '## 大运列表',
    '',
    '| 起运年份 | 起运年龄 | 干支 | 天干十神 | 藏干 |',
    '|----------|----------|------|----------|------|',
  ];

  for (const dayun of result.list) {
    const hiddenStemsText = dayun.hiddenStems && dayun.hiddenStems.length > 0
      ? dayun.hiddenStems.map((hs) => `${hs.stem}(${hs.tenGod})`).join(' ')
      : '-';
    lines.push(`| ${dayun.startYear} | ${dayun.startAge}岁 | ${dayun.ganZhi} | ${dayun.tenGod || '-'} | ${hiddenStemsText} |`);
  }

  return lines.join('\n');
}

function renderDayunCanonicalFullText(result: DayunOutput): string {
  const lines: string[] = [
    '# 大运流年',
    '',
    '## 起运信息',
    '',
    `- 起运年龄：${result.startAge}岁`,
    `- 起运详情：${result.startAgeDetail}`,
  ];

  if (result.xiaoYun.length > 0) {
    lines.push('');
    lines.push('## 小运');
    lines.push('');
    lines.push('| 年龄 | 干支 | 天干十神 |');
    lines.push('|------|------|----------|');
    for (const item of result.xiaoYun) {
      lines.push(`| ${item.age}岁 | ${item.ganZhi} | ${item.tenGod || '-'} |`);
    }
  }

  lines.push('');
  lines.push('## 大运列表');
  lines.push('');
  lines.push('| 起运年份 | 起运年龄 | 干支 | 天干十神 | 地支主气十神 | 藏干 | 地势 | 纳音 | 神煞 | 原局关系 |');
  lines.push('|----------|----------|------|----------|--------------|------|------|------|------|----------|');
  for (const dayun of result.list) {
    const hiddenStemsText = dayun.hiddenStems.length > 0
      ? dayun.hiddenStems.map((hs) => `${hs.stem}(${hs.tenGod})`).join('、')
      : '-';
    const shenShaText = dayun.shenSha.length > 0 ? dayun.shenSha.join('、') : '-';
    const relationText = dayun.branchRelations.length > 0 ? dayun.branchRelations.map((item) => item.description).join('；') : '-';
    lines.push(`| ${dayun.startYear} | ${dayun.startAge}岁 | ${dayun.ganZhi} | ${dayun.tenGod || '-'} | ${dayun.branchTenGod || '-'} | ${hiddenStemsText} | ${dayun.diShi || '-'} | ${dayun.naYin || '-'} | ${shenShaText} | ${relationText} |`);
  }

  for (const [index, dayun] of result.list.entries()) {
    const endYear = result.list[index + 1]?.startYear ? result.list[index + 1]!.startYear - 1 : dayun.startYear + 9;
    lines.push('');
    lines.push(`### ${dayun.startYear}-${endYear} ${dayun.ganZhi}`);
    lines.push(`- 起运年龄: ${dayun.startAge}岁`);
    if (dayun.branchRelations.length > 0) {
      lines.push(`- 原局关系: ${dayun.branchRelations.map((item) => item.description).join('；')}`);
    }
    lines.push('');
    lines.push('| 流年 | 年龄 | 干支 | 天干十神 | 藏干 | 地势 | 纳音 | 神煞 | 地支关系 | 太岁 |');
    lines.push('|------|------|------|----------|------|------|------|------|----------|------|');
    for (const liunian of dayun.liunianList) {
      const hiddenStemsText = liunian.hiddenStems.length > 0
        ? liunian.hiddenStems.map((hs) => `${hs.stem}(${hs.tenGod})`).join('、')
        : '-';
      const shenShaText = liunian.shenSha.length > 0 ? liunian.shenSha.join('、') : '-';
      const relationText = liunian.branchRelations.length > 0 ? liunian.branchRelations.map((item) => item.description).join('；') : '-';
      const taiSuiText = liunian.taiSui.length > 0 ? liunian.taiSui.join('、') : '-';
      lines.push(`| ${liunian.year} | ${liunian.age}岁 | ${liunian.ganZhi} | ${liunian.tenGod || '-'} | ${hiddenStemsText} | ${liunian.diShi || '-'} | ${liunian.nayin || '-'} | ${shenShaText} | ${relationText} | ${taiSuiText} |`);
    }
  }

  return lines.join('\n');
}
