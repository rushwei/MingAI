/**
 * MCP 响应格式化器 - 将 JSON 结果转换为 Markdown 格式
 */

import type { BaziOutput, BaziPillarsResolveOutput, ZiweiOutput, ZiweiHoroscopeOutput, ZiweiFlyingStarOutput, LiuyaoOutput, TarotOutput, FortuneOutput, DayunOutput, QimenOutput, FlyingStarResult, MutagedPlaceInfo, SurroundedPalaceInfo } from './types.js';
import type { DaliurenOutput } from './daliuren/types.js';
import {
  renderBaziCanonicalText,
  renderDaliurenCanonicalText,
  renderDayunCanonicalText,
  renderFortuneCanonicalText,
  renderLiuyaoCanonicalText,
  renderQimenCanonicalText,
  renderTarotCanonicalText,
  renderZiweiCanonicalText,
} from './text.js';

// Runtime formatter bindings live in tool-registry.ts; this module only keeps formatter implementations.

/**
 * 格式化八字结果为 Markdown
 */
export function formatBaziAsMarkdown(result: BaziOutput): string {
  return renderBaziCanonicalText(result);
}

/**
 * 格式化四柱反推结果为 Markdown
 */
export function formatBaziPillarsResolveAsMarkdown(result: BaziPillarsResolveOutput): string {
  const { pillars, count, candidates } = result;

  let md = `# 四柱反推候选时间

## 原始四柱
- 年柱: ${pillars.yearPillar}
- 月柱: ${pillars.monthPillar}
- 日柱: ${pillars.dayPillar}
- 时柱: ${pillars.hourPillar}

## 候选数量
共 ${count} 个候选时间

`;

  // 只显示前5个候选
  const displayCandidates = candidates.slice(0, 5);
  for (const candidate of displayCandidates) {
    md += `### 候选 ${candidate.candidateId}

- 农历: ${candidate.lunarText}
- 公历: ${candidate.solarText}
- 出生时间: ${candidate.birthHour}:${String(candidate.birthMinute).padStart(2, '0')}
${candidate.isLeapMonth ? '- **闰月**' : ''}

`;
  }

  if (candidates.length > 5) {
    md += `*...还有 ${candidates.length - 5} 个候选时间*`;
  }

  return md;
}

/**
 * 格式化紫微斗数结果为 Markdown
 */
export function formatZiweiAsMarkdown(result: ZiweiOutput): string {
  return renderZiweiCanonicalText(result);
}

/**
 * 格式化紫微运限结果为 Markdown
 */
export function formatZiweiHoroscopeAsMarkdown(result: ZiweiHoroscopeOutput): string {
  const { solarDate, lunarDate, soul, body, fiveElement, targetDate } = result;

  const lines: string[] = [
    '# 紫微运限',
    '',
    '## 基本信息',
    `- **阳历**: ${solarDate}`,
    `- **农历**: ${lunarDate}`,
    `- **命主**: ${soul}`,
    `- **身主**: ${body}`,
    `- **五行局**: ${fiveElement}`,
    `- **目标日期**: ${targetDate}`,
    '',
  ];

  const periods = [
    { label: '大限', data: result.decadal },
    { label: '小限', data: result.age, extra: `虚岁 ${result.age.nominalAge}` },
    { label: '流年', data: result.yearly },
    { label: '流月', data: result.monthly },
    { label: '流日', data: result.daily },
    { label: '流时', data: result.hourly },
  ];

  for (const { label, data, extra } of periods) {
    lines.push(`## ${label}`);
    lines.push(`- **宫位**: ${data.name}（${data.heavenlyStem}${data.earthlyBranch}）`);
    if (extra) lines.push(`- **${extra.split(' ')[0]}**: ${extra.split(' ')[1]}`);
    if (data.mutagen.length > 0) lines.push(`- **四化**: ${data.mutagen.join('、')}`);
    if (data.palaceNames.length > 0) lines.push(`- **十二宫重排**: ${data.palaceNames.join('、')}`);
    lines.push('');
  }

  if (result.transitStars && result.transitStars.length > 0) {
    lines.push('## 流年星曜');
    for (const entry of result.transitStars) {
      lines.push(`- ${entry.starName} → ${entry.palaceName}`);
    }
    lines.push('');
  }

  if (result.yearlyDecStar) {
    if (result.yearlyDecStar.suiqian12.length > 0) {
      lines.push('## 岁前十二星');
      lines.push(result.yearlyDecStar.suiqian12.join('、'));
      lines.push('');
    }
    if (result.yearlyDecStar.jiangqian12.length > 0) {
      lines.push('## 将前十二星');
      lines.push(result.yearlyDecStar.jiangqian12.join('、'));
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * 格式化紫微飞星结果为 Markdown
 */
export function formatZiweiFlyingStarAsMarkdown(result: ZiweiFlyingStarOutput): string {
  const lines: string[] = ['# 紫微飞星分析', ''];

  for (const r of result.results) {
    lines.push(`## 查询 #${r.queryIndex + 1}（${r.type}）`);
    lines.push('');
    formatSingleFlyingStarResult(r, lines);
    lines.push('');
  }

  return lines.join('\n');
}

function formatSingleFlyingStarResult(r: FlyingStarResult, lines: string[]): void {
  if (r.type === 'fliesTo' || r.type === 'selfMutaged') {
    lines.push(`- 结果: ${r.result ? '是' : '否'}`);
  } else if (r.type === 'mutagedPlaces') {
    const places = r.result as MutagedPlaceInfo[];
    for (const p of places) {
      lines.push(`- 化${p.mutagen} → ${p.targetPalace ?? '无'}`);
    }
  } else if (r.type === 'surroundedPalaces') {
    const s = r.result as SurroundedPalaceInfo;
    lines.push(`- 本宫: ${s.target.name}`);
    lines.push(`- 对宫: ${s.opposite.name}`);
    lines.push(`- 财帛: ${s.wealth.name}`);
    lines.push(`- 官禄: ${s.career.name}`);
  }
}

/**
 * 格式化六爻结果为 Markdown
 */
export function formatLiuyaoAsMarkdown(result: LiuyaoOutput): string {
  return renderLiuyaoCanonicalText(result);
}

/**
 * 格式化塔罗结果为 Markdown
 */
export function formatTarotAsMarkdown(result: TarotOutput): string {
  return renderTarotCanonicalText(result);
}

/**
 * 格式化每日运势为 Markdown
 */
export function formatDailyFortuneAsMarkdown(result: FortuneOutput): string {
  return renderFortuneCanonicalText(result);
}

/**
 * 格式化大运结果为 Markdown
 */
export function formatDayunAsMarkdown(result: DayunOutput): string {
  return renderDayunCanonicalText(result);
}

/**
 * 格式化奇门遁甲结果为 Markdown
 */
export function formatQimenAsMarkdown(result: QimenOutput): string {
  return renderQimenCanonicalText(result);
}

/**
 * 格式化大六壬结果为 Markdown
 */
export function formatDaliurenAsMarkdown(result: DaliurenOutput): string {
  return renderDaliurenCanonicalText(result);
}
