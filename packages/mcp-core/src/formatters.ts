/**
 * MCP 响应格式化器 - 将 JSON 结果转换为 Markdown 格式
 */

import type { BaziOutput, BaziPillarsResolveOutput, ZiweiOutput, LiuyaoOutput, TarotOutput, FortuneOutput, DayunOutput, ShenSystemInfo } from './types.js';
import {
  YONG_SHEN_STATUS_LABELS,
  WANG_SHUAI_LABELS,
  KONG_WANG_LABELS,
  YAO_POSITION_NAMES,
  traditionalYaoName,
  formatGanZhiTime,
  formatGuaLevelLines,
  sortYaosDescending,
} from './liuyao-core.js';

/**
 * 格式化八字结果为 Markdown
 */
export function formatBaziAsMarkdown(result: BaziOutput): string {
  const { gender, birthPlace, dayMaster, kongWang, fourPillars, relations } = result;
  const genderText = gender === 'male' ? '男' : '女';

  let md = `# 八字命盘

## 基本信息
- **性别**: ${genderText}
- **日主**: ${dayMaster}
- **命主五行**: ${dayMaster.charAt(0)}${getElementByStem(dayMaster.charAt(0))}
${birthPlace ? `- **出生地**: ${birthPlace}` : ''}

## 四柱

| 柱 | 天干 | 地支 | 纳音 | 地势 |
|---|------|------|------|------|
| 年柱 | ${fourPillars.year.stem} | ${fourPillars.year.branch} | ${fourPillars.year.naYin || '-'} | ${fourPillars.year.diShi || '-'} |
| 月柱 | ${fourPillars.month.stem} | ${fourPillars.month.branch} | ${fourPillars.month.naYin || '-'} | ${fourPillars.month.diShi || '-'} |
| 日柱 | ${fourPillars.day.stem} | ${fourPillars.day.branch} | ${fourPillars.day.naYin || '-'} | ${fourPillars.day.diShi || '-'} |
| 时柱 | ${fourPillars.hour.stem} | ${fourPillars.hour.branch} | ${fourPillars.hour.naYin || '-'} | ${fourPillars.hour.diShi || '-'} |

## 空亡
- **旬**: ${kongWang.xun}
- **空亡地支**: ${kongWang.kongZhi.join('、')}

`;

  // 十神
  md += `## 十神

- 年柱十神: ${fourPillars.year.tenGod || '-'}
- 月柱十神: ${fourPillars.month.tenGod || '-'}
- 时柱十神: ${fourPillars.hour.tenGod || '-'}

`;

  // 地支关系
  if (relations && relations.length > 0) {
    md += `## 地支关系

`;
    for (const rel of relations) {
      md += `- **${rel.type}**: ${rel.pillars.join('、')} - ${rel.description}\n`;
    }
  }

  return md;
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
  const { solarDate, lunarDate, fourPillars, soul, body, fiveElement, zodiac, palaces, decadalList } = result;

  let md = `# 紫微命盘

## 基本信息
- **阳历**: ${solarDate}
- **农历**: ${lunarDate}
- **命主**: ${soul}
- **身主**: ${body}
- **五行局**: ${fiveElement}
- **属相**: ${zodiac}

## 四柱
- 年柱: ${fourPillars.year}
- 月柱: ${fourPillars.month}
- 日柱: ${fourPillars.day}
- 时柱: ${fourPillars.hour}

## 十二宫位

| 宫位 | 主星 |
|------|------|
`;

  for (const palace of palaces) {
    const majorStars = palace.majorStars.map((s) => s.name).join('、') || '-';
    md += `| ${palace.name} | ${majorStars} |\n`;
  }

  if (decadalList && decadalList.length > 0) {
    md += `\n## 大限

| 年龄 | 干支 | 宫位 |
|------|------|------|
`;
    for (const decadal of decadalList) {
      md += `| ${decadal.startAge}-${decadal.endAge} | ${decadal.heavenlyStem}${decadal.palace.earthlyBranch} | ${decadal.palace.name} |\n`;
    }
  }

  return md;
}

/**
 * 格式化六爻结果为 Markdown
 */
export function formatLiuyaoAsMarkdown(result: LiuyaoOutput): string {
  const lines: string[] = [];

  // ── 卦象信息（含经文） ──
  lines.push('# 六爻分析');
  lines.push('');
  lines.push('## 卦象信息');
  if (result.question) lines.push(`- 问题: ${result.question}`);
  lines.push(`- 本卦: ${result.hexagramName}（${result.hexagramGong}宫·${result.hexagramElement}）`);
  if (result.guaCi) lines.push(`- 卦辞: ${result.guaCi}`);
  if (result.xiangCi) lines.push(`- 象辞: ${result.xiangCi}`);
  if (result.changedHexagramName) {
    lines.push(`- 变卦: ${result.changedHexagramName}（${result.changedHexagramGong || ''}宫·${result.changedHexagramElement || ''}）`);
    if (result.changedGuaCi) lines.push(`- 变卦卦辞: ${result.changedGuaCi}`);
    if (result.changedXiangCi) lines.push(`- 变卦象辞: ${result.changedXiangCi}`);
    // 动爻爻辞
    const movingYaoCi = (result.fullYaos || []).filter(y => y.isChanging && y.yaoCi);
    for (const yao of movingYaoCi) {
      lines.push(`- ${traditionalYaoName(yao.position, yao.type)}爻辞: ${yao.yaoCi}`);
    }
  } else {
    lines.push('- 变卦: 无');
  }
  const gz = result.ganZhiTime;
  lines.push(`- 起卦时间: ${formatGanZhiTime(gz)}`);
  lines.push(`- 日旬空: ${result.kongWang.xun}（${result.kongWang.kongDizhi.join(' ')}）`);
  if (result.kongWangByPillar) {
    lines.push(`- 年旬空: ${result.kongWangByPillar.year.xun}（${result.kongWangByPillar.year.kongDizhi.join(' ')}）`);
    lines.push(`- 月旬空: ${result.kongWangByPillar.month.xun}（${result.kongWangByPillar.month.kongDizhi.join(' ')}）`);
    lines.push(`- 时旬空: ${result.kongWangByPillar.hour.xun}（${result.kongWangByPillar.hour.kongDizhi.join(' ')}）`);
    lines.push('- 注: 六爻断卦判空亡以"日旬空"为主，年/月/时旬空供参考。');
  }
  lines.push('');

  // ── 六爻排盘 ──
  lines.push('## 六爻排盘');
  lines.push('');
  lines.push('| 爻位 | 六亲 | 六神 | 纳甲 | 五行 | 旺衰 | 动静 | 空亡 | 世应 |');
  lines.push('|------|------|------|------|------|------|------|------|------|');
  const sortedYaos = sortYaosDescending(result.fullYaos || []);
  for (const yao of sortedYaos) {
    const shiYing = yao.isShiYao ? '世' : yao.isYingYao ? '应' : '';
    const kongLabel = yao.kongWangState && yao.kongWangState !== 'not_kong' ? KONG_WANG_LABELS[yao.kongWangState] : '';
    lines.push(`| ${traditionalYaoName(yao.position, yao.type)} | ${yao.liuQin} | ${yao.liuShen} | ${yao.naJia} | ${yao.wuXing} | ${WANG_SHUAI_LABELS[yao.strength.wangShuai]} | ${yao.movementLabel} | ${kongLabel} | ${shiYing} |`);
    if (yao.isChanging && yao.changedYao) {
      const cy = yao.changedYao;
      lines.push(`| ↳ 化 | ${cy.liuQin} | ${cy.liuShen || ''} | ${cy.naJia} | ${cy.wuXing} | | | | ${cy.relation || ''} |`);
    }
  }
  lines.push('');

  // ── 用神分析（含神系） ──
  if (result.yongShen && result.yongShen.length > 0) {
    lines.push('## 用神分析');
    lines.push('');
    const shenSystemMap = buildShenSystemMap(result.shenSystemByYongShen || []);
    for (const ys of result.yongShen) {
      lines.push(`### ${ys.targetLiuQin}（${YONG_SHEN_STATUS_LABELS[ys.selectionStatus] || ys.selectionStatus}）`);
      if (ys.selected) {
        const main = ys.selected;
        lines.push(`- 主用神: ${main.liuQin}${main.position ? ` @${main.position}爻` : ''}${main.naJia ? `（${main.naJia}）` : ''}，${main.strengthLabel}，${main.movementLabel}`);
        if (ys.selectionNote) {
          lines.push(`- 说明: ${ys.selectionNote}`);
        }
        if (main.evidence?.length) {
          lines.push(`- 依据: ${main.evidence.join('、')}`);
        }
        if (ys.candidates?.length) {
          lines.push(`- 并看: ${ys.candidates.map((item) => `${item.liuQin}${item.position ? `@${item.position}爻` : ''}${item.naJia ? `（${item.naJia}）` : ''}${item.evidence?.length ? `：${item.evidence.join('、')}` : ''}`).join('；')}`);
        }
      }
      // 神系
      const sys = shenSystemMap.get(ys.targetLiuQin);
      if (sys) {
        const shenParts = formatShenSystemParts(sys);
        if (shenParts.length > 0) lines.push(`- 神系: ${shenParts.join('，')}`);
      }
      lines.push('');
    }
  }

  // ── 伏神 ──
  if (result.fuShen && result.fuShen.length > 0) {
    lines.push('## 伏神');
    lines.push('');
    for (const fs of result.fuShen) {
      lines.push(`- ${fs.liuQin}（${fs.wuXing}·${fs.naJia}）伏于${YAO_POSITION_NAMES[fs.feiShenPosition - 1]}（${fs.feiShenLiuQin || ''}）下，${fs.availabilityReason}`);
    }
    lines.push('');
  }

  // ── 卦级分析（六冲/六合/反吟伏吟/三合/神煞） ──
  const guaLevelParts = formatGuaLevelLines(result).map(line => `- ${line}`);
  if (guaLevelParts.length > 0) {
    lines.push('## 卦级分析');
    lines.push('');
    lines.push(...guaLevelParts);
    lines.push('');
  }

  // ── 凶吉警告 ──
  if (result.warnings && result.warnings.length > 0) {
    lines.push('## 凶吉警告');
    lines.push('');
    for (const warning of result.warnings) {
      lines.push(`- ${warning}`);
    }
    lines.push('');
  }

  // ── 应期建议 ──
  if (result.timeRecommendations && result.timeRecommendations.length > 0) {
    lines.push('## 应期建议');
    lines.push('');
    for (const tr of result.timeRecommendations) {
      lines.push(`- ${tr.targetLiuQin}: ${tr.trigger}${tr.basis?.length ? `（${tr.basis.join('、')}）` : ''}，${tr.description}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * 格式化塔罗结果为 Markdown
 */
export function formatTarotAsMarkdown(result: TarotOutput): string {
  const { spreadName, question, cards } = result;

  let md = `# 塔罗占卜

## 基本信息
- **牌阵**: ${spreadName}
${question ? `- **问题**: ${question}` : ''}

## 抽到的牌

`;

  for (const card of cards) {
    const orientation = card.orientation === 'reversed' ? '逆位' : '正位';
    md += `### ${card.position}: ${card.card.nameChinese} (${card.card.name})

- **方向**: ${orientation}
- **关键词**: ${card.card.keywords.join('、')}
- **牌义**: ${card.meaning}

`;
  }

  return md;
}

/**
 * 格式化每日运势为 Markdown
 */
export function formatDailyFortuneAsMarkdown(result: FortuneOutput): string {
  const { date, dayInfo, tenGod, almanac } = result;

  let md = `# 每日运势

## 基本信息
- **日期**: ${date}
- **日干支**: ${dayInfo.ganZhi}
- **流日十神**: ${tenGod}

## 黄历
`;

  if (almanac) {
    md += `- **农历**: ${almanac.lunarMonth}${almanac.lunarDay}
- **生肖**: ${almanac.zodiac}
${almanac.solarTerm ? `- **节气**: ${almanac.solarTerm}` : ''}

### 宜
${almanac.suitable.map((s) => `- ${s}`).join('\n')}

### 忌
${almanac.avoid.map((s) => `- ${s}`).join('\n')}

`;
    if (almanac.jishen && almanac.jishen.length > 0) {
      md += `### 吉神宜趋\n${almanac.jishen.join('、')}\n\n`;
    }
    if (almanac.xiongsha && almanac.xiongsha.length > 0) {
      md += `### 凶煞宜忌\n${almanac.xiongsha.join('、')}\n\n`;
    }
  }

  return md;
}

/**
 * 格式化大运结果为 Markdown
 */
export function formatDayunAsMarkdown(result: DayunOutput): string {
  let md = `# 大运流年

## 大运列表

| 年龄 | 干支 | 十神 | 纳音 |
|------|------|------|------|
`;

  for (const dayun of result.list) {
    md += `| ${dayun.startYear} | ${dayun.ganZhi} | ${dayun.tenGod} | ${dayun.naYin || '-'} |\n`;
  }

  return md;
}

/**
 * 根据工具名格式化结果
 */
export function formatAsMarkdown(toolName: string, result: unknown): string {
  switch (toolName) {
    case 'bazi_calculate':
      return formatBaziAsMarkdown(result as BaziOutput);
    case 'bazi_pillars_resolve':
      return formatBaziPillarsResolveAsMarkdown(result as BaziPillarsResolveOutput);
    case 'ziwei_calculate':
      return formatZiweiAsMarkdown(result as ZiweiOutput);
    case 'liuyao_analyze':
      return formatLiuyaoAsMarkdown(result as LiuyaoOutput);
    case 'tarot_draw':
      return formatTarotAsMarkdown(result as TarotOutput);
    case 'daily_fortune':
      return formatDailyFortuneAsMarkdown(result as FortuneOutput);
    case 'dayun_calculate':
      return formatDayunAsMarkdown(result as DayunOutput);
    default:
      return JSON.stringify(result, null, 2);
  }
}

// 辅助函数：构建 targetLiuQin → ShenSystem 映射（本地版，不依赖 web 侧）
function buildShenSystemMap<T extends { targetLiuQin: string }>(systems: T[]): Map<string, T> {
  return new Map(systems.map(s => [s.targetLiuQin, s] as const));
}

// 辅助函数：格式化原神/忌神/仇神文本片段（本地版）
function formatShenSystemParts(system: ShenSystemInfo | undefined): string[] {
  const parts: string[] = [];
  if (system?.yuanShen) parts.push(`原神=${system.yuanShen.liuQin}（${system.yuanShen.wuXing}）`);
  if (system?.jiShen) parts.push(`忌神=${system.jiShen.liuQin}（${system.jiShen.wuXing}）`);
  if (system?.chouShen) parts.push(`仇神=${system.chouShen.liuQin}（${system.chouShen.wuXing}）`);
  return parts;
}

// 辅助函数：根据天干获取五行
function getElementByStem(stem: string): string {
  const elements: Record<string, string> = {
    甲: '木', 乙: '木',
    丙: '火', 丁: '火',
    戊: '土', 己: '土',
    庚: '金', 辛: '金',
    壬: '水', 癸: '水',
  };
  return elements[stem] || '';
}
