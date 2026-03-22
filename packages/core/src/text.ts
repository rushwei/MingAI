import type {
  BaziOutput,
  DayunOutput,
  FortuneOutput,
  LiuyaoOutput,
  QimenOutput,
  ShenSystemInfo,
  TarotOutput,
  ZiweiOutput,
} from './types.js';
import type { DaliurenOutput } from './daliuren/types.js';
import {
  formatGuaLevelLines,
  KONG_WANG_LABELS,
  sortYaosDescending,
  traditionalYaoName,
  WANG_SHUAI_LABELS,
  YAO_POSITION_NAMES,
  YONG_SHEN_STATUS_LABELS,
} from './liuyao-core.js';
import { GAN_WUXING } from './utils.js';

export type BaziCanonicalTextOptions = {
  name?: string;
  dayun?: DayunOutput;
};

export type TarotCanonicalTextOptions = {
  birthDate?: string | null;
};

const ZIWEI_PALACE_TEXT_ORDER = ['命宫', '兄弟', '夫妻', '子女', '财帛', '疾厄', '迁移', '交友', '官禄', '田宅', '福德', '父母'];

function formatTrueSolarBlock(info: { clockTime: string; trueSolarTime: string; longitude: number; correctionMinutes: number; trueTimeIndex: number; dayOffset: number }): string[] {
  const dayOffsetLabel = info.dayOffset > 0
    ? `后${info.dayOffset}日`
    : info.dayOffset < 0
      ? `前${Math.abs(info.dayOffset)}日`
      : '当日';

  return [
    `- **钟表时间**: ${info.clockTime}`,
    `- **真太阳时**: ${info.trueSolarTime}（经度 ${info.longitude}°，校正 ${info.correctionMinutes > 0 ? '+' : ''}${info.correctionMinutes} 分钟）`,
    `- **真太阳时索引**: ${info.trueTimeIndex}`,
    `- **跨日偏移**: ${dayOffsetLabel}`,
  ];
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

function sortZiweiPalaces<T extends { name: string; index?: number }>(palaces: T[]): T[] {
  return [...palaces].sort((left, right) => {
    const leftOrder = ZIWEI_PALACE_TEXT_ORDER.indexOf(left.name);
    const rightOrder = ZIWEI_PALACE_TEXT_ORDER.indexOf(right.name);
    const normalizedLeft = leftOrder >= 0 ? leftOrder : Number.MAX_SAFE_INTEGER;
    const normalizedRight = rightOrder >= 0 ? rightOrder : Number.MAX_SAFE_INTEGER;
    if (normalizedLeft !== normalizedRight) return normalizedLeft - normalizedRight;
    return (left.index ?? Number.MAX_SAFE_INTEGER) - (right.index ?? Number.MAX_SAFE_INTEGER);
  });
}

export function renderBaziCanonicalText(result: BaziOutput, options: BaziCanonicalTextOptions = {}): string {
  const lines: string[] = ['# 八字命盘', '', '## 基本信息'];
  if (options.name) lines.push(`- **姓名**: ${options.name}`);
  lines.push(`- **性别**: ${result.gender === 'male' ? '男' : '女'}`);
  lines.push(`- **日主**: ${result.dayMaster}`);
  lines.push(`- **命主五行**: ${result.dayMaster}${GAN_WUXING[result.dayMaster.charAt(0)] || ''}`);
  if (result.birthPlace) lines.push(`- **出生地**: ${result.birthPlace}`);
  if (result.trueSolarTimeInfo) {
    lines.push(...formatTrueSolarBlock(result.trueSolarTimeInfo));
  }
  if (result.taiYuan) lines.push(`- **胎元**: ${result.taiYuan}`);
  if (result.mingGong) lines.push(`- **命宫**: ${result.mingGong}`);
  lines.push('');
  lines.push('## 四柱');
  lines.push('| 柱 | 干支 | 天干十神 | 藏干 | 地势 | 纳音 | 神煞 |');
  lines.push('|---|------|----------|------|------|------|------|');
  for (const [label, pillar] of [
    ['年柱', result.fourPillars.year],
    ['月柱', result.fourPillars.month],
    ['日柱', result.fourPillars.day],
    ['时柱', result.fourPillars.hour],
  ] as const) {
    const hiddenStemsText = pillar.hiddenStems.length > 0
      ? pillar.hiddenStems.map((item) => `${item.stem}(${item.tenGod || '-'})`).join('、')
      : '-';
    const shenShaParts = [...pillar.shenSha];
    if (pillar.kongWang?.isKong) shenShaParts.unshift('空亡');
    lines.push(`| ${label} | ${pillar.stem}${pillar.branch} | ${pillar.tenGod || '-'} | ${hiddenStemsText} | ${pillar.diShi || '-'} | ${pillar.naYin || '-'} | ${shenShaParts.length > 0 ? shenShaParts.join('、') : '-'} |`);
  }
  lines.push('');

  const posBranchMap: Record<string, string> = {
    '年支': result.fourPillars.year.branch,
    '月支': result.fourPillars.month.branch,
    '日支': result.fourPillars.day.branch,
    '时支': result.fourPillars.hour.branch,
  };
  const relationParts: string[] = [];
  for (const relation of result.relations) {
    if (relation.type === '刑') {
      const branches = [...new Set(relation.pillars.map((p) => posBranchMap[p]))].join('');
      relationParts.push(`${branches}刑（${relation.description}）`);
    } else {
      relationParts.push(relation.description);
    }
  }
  for (const item of result.tianGanChongKe) {
    relationParts.push(`${item.stemA}${item.stemB}冲克`);
  }
  for (const item of result.tianGanWuHe) {
    relationParts.push(`${item.stemA}${item.stemB}合${item.resultElement}`);
  }
  for (const item of result.diZhiBanHe) {
    const missing = item.missingBranch ? `（缺${item.missingBranch}）` : '';
    relationParts.push(`${item.branches.join('')}半合${item.resultElement}${missing}`);
  }
  for (const item of result.diZhiSanHui) {
    relationParts.push(`${item.branches.join('')}三会${item.resultElement}`);
  }
  if (relationParts.length > 0) {
    lines.push('## 干支关系');
    lines.push(relationParts.join('；'));
  }

  if (options.dayun) {
    const { dayun } = options;
    lines.push('');
    lines.push('## 大运');
    lines.push(`- **起运**: ${dayun.startAge}岁（${dayun.startAgeDetail}）`);
    lines.push('');
    lines.push('| 起运年 | 干支 | 天干十神 | 藏干 | 地势 | 纳音 | 神煞 |');
    lines.push('|--------|------|----------|------|------|------|------|');
    for (const item of dayun.list) {
      const hiddenStemsText = item.hiddenStems?.length
        ? item.hiddenStems.map((hs) => `${hs.stem}(${hs.tenGod})`).join('、')
        : '-';
      const shenShaText = item.shenSha?.length ? item.shenSha.join('、') : '-';
      lines.push(`| ${item.startYear} | ${item.ganZhi} | ${item.tenGod || '-'} | ${hiddenStemsText} | ${item.diShi || '-'} | ${item.naYin || '-'} | ${shenShaText} |`);
    }
  }

  return lines.join('\n');
}

export type ZiweiCanonicalTextOptions = {
  horoscope?: {
    decadal: { palaceName: string; ageRange: string };
    yearly: { palaceName: string; period: string };
    monthly: { palaceName: string; period: string };
    daily: { palaceName: string; period: string };
  };
};

export function renderZiweiCanonicalText(result: ZiweiOutput, options: ZiweiCanonicalTextOptions = {}): string {
  const lines: string[] = ['# 紫微命盘', '', '## 基本信息'];
  if (result.gender === 'male' || result.gender === 'female') {
    lines.push(`- **性别**: ${result.gender === 'male' ? '男' : '女'}`);
  }
  lines.push(`- **阳历**: ${result.solarDate}`);
  lines.push(`- **农历**: ${result.lunarDate}`);
  lines.push(`- **四柱**: ${result.fourPillars.year.gan}${result.fourPillars.year.zhi} ${result.fourPillars.month.gan}${result.fourPillars.month.zhi} ${result.fourPillars.day.gan}${result.fourPillars.day.zhi} ${result.fourPillars.hour.gan}${result.fourPillars.hour.zhi}`);
  lines.push(`- **命主**: ${result.soul}`);
  lines.push(`- **身主**: ${result.body}`);
  lines.push(`- **五行局**: ${result.fiveElement}`);
  if (result.time) lines.push(`- **时辰**: ${result.time}${result.timeRange ? `（${result.timeRange}）` : ''}`);
  if (result.douJun) lines.push(`- **子年斗君**: ${result.douJun}`);
  if (result.lifeMasterStar) lines.push(`- **命主星**: ${result.lifeMasterStar}`);
  if (result.bodyMasterStar) lines.push(`- **身主星**: ${result.bodyMasterStar}`);
  if (result.trueSolarTimeInfo) {
    lines.push(...formatTrueSolarBlock(result.trueSolarTimeInfo));
  }
  lines.push('');
  lines.push('## 十二宫位');
  lines.push('| 宫位 | 干支 | 主星 | 辅星 | 杂曜 | 神煞 | 大限 | 流年 | 小限 |');
  lines.push('|------|------|------|------|------|------|------|------|------|');
  for (const palace of sortZiweiPalaces(result.palaces)) {
    let palaceLabel = palace.name;
    if (palace.isBodyPalace) palaceLabel += '(身宫)';
    if (palace.isOriginalPalace) palaceLabel += '(来因宫)';
    const shensha = [palace.changsheng12, palace.boshi12, palace.jiangqian12, palace.suiqian12].filter(Boolean).join('、') || '-';
    const decadal = palace.decadalRange ? `${palace.decadalRange[0]}~${palace.decadalRange[1]}` : '-';
    const liuNian = palace.liuNianAges?.length ? palace.liuNianAges.join(',') : '-';
    const xiaoXian = palace.ages?.length ? palace.ages.join(',') : '-';
    lines.push(`| ${palaceLabel} | ${palace.heavenlyStem}${palace.earthlyBranch} | ${palace.majorStars.map(formatStarLabel).join('、') || '-'} | ${palace.minorStars.map(formatStarLabel).join('、') || '-'} | ${(palace.adjStars || []).map(formatStarLabel).join('、') || '-'} | ${shensha} | ${decadal} | ${liuNian} | ${xiaoXian} |`);
  }

  if (options.horoscope) {
    const h = options.horoscope;
    lines.push('');
    lines.push('## 当前运限');
    lines.push(`- **当前大限**: ${h.decadal.palaceName}（${h.decadal.ageRange}）`);
    lines.push(`- **流年宫位**: ${h.yearly.palaceName}（${h.yearly.period}）`);
    lines.push(`- **流月宫位**: ${h.monthly.palaceName}（${h.monthly.period}）`);
    lines.push(`- **流日宫位**: ${h.daily.palaceName}（${h.daily.period}）`);
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

export function renderQimenCanonicalText(result: QimenOutput): string {
  const dunText = result.dunType === 'yang' ? '阳遁' : '阴遁';
  const lines: string[] = [
    '# 奇门遁甲排盘',
    '',
    '## 基本信息',
    `- **公历**: ${result.dateInfo.solarDate}`,
    `- **农历**: ${result.dateInfo.lunarDate}`,
    `- **节气**: ${result.dateInfo.solarTerm}${result.dateInfo.solarTermRange ? `（${result.dateInfo.solarTermRange}）` : ''}`,
    `- **四柱**: ${result.siZhu.year} ${result.siZhu.month} ${result.siZhu.day} ${result.siZhu.hour}`,
    `- **局**: ${dunText}${result.juNumber}局`,
    `- **三元**: ${result.yuan}`,
    `- **旬首**: ${result.xunShou}`,
    `- **盘式**: ${result.panType}（${result.juMethod}）`,
  ];
  if (result.question) lines.push(`- **占问**: ${result.question}`);
  lines.push('');
  lines.push('## 九宫盘');
  lines.push('');
  // 宫五行/星五行/门五行/heavenStemElement/earthStemElement inline in table columns
  lines.push('| 宫 | 八神 | 天盘 | 地盘 | 九星 | 八门 | 格局 | 标记 |');
  lines.push('|------|------|------|------|------|------|------|------|');

  const dayKongPalaces = new Set(result.kongWang.dayKong.palaces);
  const hourKongPalaces = new Set(result.kongWang.hourKong.palaces);

  for (const palace of result.palaces) {
    // Palace: name + index + element (no wangShuai)
    const palaceElement = palace.element || '';
    const palaceLabel = `${palace.palaceName}${palace.palaceIndex}${palaceElement}`;

    // Heaven/Earth stem: 丁火 style, no parentheses
    const hElement = palace.heavenStemElement || GAN_WUXING[palace.heavenStem] || '';
    const heavenLabel = palace.heavenStem ? `${palace.heavenStem}${hElement}` : '-';

    const eElement = palace.earthStemElement || GAN_WUXING[palace.earthStem] || '';
    const earthLabel = palace.earthStem ? `${palace.earthStem}${eElement}` : '-';

    // Star/Gate with element in parentheses
    const starLabel = palace.star ? `${palace.star}(${palace.starElement || ''})` : '-';
    const gateLabel = palace.gate ? `${palace.gate}(${palace.gateElement || ''})` : '-';

    // Formations
    const formationStr = palace.formations.length > 0 ? palace.formations.join(',') : '-';

    // Marks: 值符/值使/日空/时空/驿马/入墓
    const isDayKong = dayKongPalaces.has(palace.palaceIndex);
    const isHourKong = hourKongPalaces.has(palace.palaceIndex);
    const marks = [
      result.zhiFu.palace === palace.palaceIndex ? `值符${result.zhiFu.star}` : null,
      result.zhiShi.palace === palace.palaceIndex ? `值使${result.zhiShi.gate}` : null,
      isDayKong ? '日空' : null,
      isHourKong ? '时空' : null,
      palace.isYiMa ? '驿马' : null,
      palace.isRuMu ? '入墓' : null,
    ].filter(Boolean).join(',');
    const markStr = marks || '-';

    lines.push(`| ${palaceLabel} | ${palace.deity} | ${heavenLabel} | ${earthLabel} | ${starLabel} | ${gateLabel} | ${formationStr} | ${markStr} |`);
  }

  // 月令旺衰：group stems by wangShuai state
  if (result.monthPhase && Object.keys(result.monthPhase).length > 0) {
    const phaseGroups = new Map<string, string[]>();
    for (const [stem, phase] of Object.entries(result.monthPhase)) {
      if (!phase) continue;
      phaseGroups.set(phase, [...(phaseGroups.get(phase) || []), stem]);
    }
    if (phaseGroups.size > 0) {
      lines.push('');
      lines.push('## 月令旺衰');
      lines.push('');
      const parts: string[] = [];
      for (const [phase, stems] of phaseGroups.entries()) {
        const stemsWithElement = stems.map((s) => `${s}${GAN_WUXING[s] || ''}`).join('');
        parts.push(`${phase}：${stemsWithElement}`);
      }
      lines.push(parts.join('、'));
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

export function renderDayunCanonicalText(result: DayunOutput): string {
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
    '| 年龄 | 干支 | 天干十神 | 藏干 | 地势 | 纳音 | 神煞 |',
    '|------|------|----------|------|------|------|------|',
  ];

  for (const dayun of result.list) {
    const hiddenStemsText = dayun.hiddenStems && dayun.hiddenStems.length > 0
      ? dayun.hiddenStems.map((hs) => `${hs.stem}(${hs.tenGod})`).join('、')
      : '-';
    const shenShaText = dayun.shenSha && dayun.shenSha.length > 0
      ? dayun.shenSha.join('、')
      : '-';
    lines.push(`| ${dayun.startYear} | ${dayun.ganZhi} | ${dayun.tenGod || '-'} | ${hiddenStemsText} | ${dayun.diShi || '-'} | ${dayun.naYin || '-'} | ${shenShaText} |`);
  }

  return lines.join('\n');
}
