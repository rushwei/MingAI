/**
 * MCP 响应格式化器 - 将 JSON 结果转换为 Markdown 格式
 */

import type { BaziOutput, BaziPillarsResolveOutput, ZiweiOutput, LiuyaoOutput, TarotOutput, FortuneOutput, DayunOutput } from './types.js';

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
  const { hexagramName, hexagramGong, hexagramBrief, changedHexagramName, guaCi, yongShen, warnings, timeRecommendations } = result;

  let md = `# 六爻分析

## 卦象信息
- **本卦**: ${hexagramName} (${hexagramGong}宫)
- **变卦**: ${changedHexagramName || '无'}
- **卦辞**: ${hexagramBrief}

## 爻象

| 位置 | 六亲 | 旺衰 | 动静 |
|------|------|------|------|
`;

  for (const yao of result.fullYaos || []) {
    md += `| ${yao.position} | ${yao.liuQin} | ${yao.wangShuaiLabel} | ${yao.movementLabel} |\n`;
  }

  // 用神分析
  if (yongShen && yongShen.length > 0) {
    md += `\n## 用神分析\n`;
    for (const ys of yongShen) {
      md += `### ${ys.targetLiuQin}\n`;
      if (ys.candidates && ys.candidates.length > 0) {
        const main = ys.candidates[0];
        md += `- 主用神: ${main.liuQin}（${main.naJia}），强度 ${main.strengthLabel}\n`;
      }
    }
  }

  // 凶吉警告
  if (warnings && warnings.length > 0) {
    md += `\n## 凶吉警告\n`;
    for (const warning of warnings) {
      md += `- ${warning}\n`;
    }
  }

  // 应期建议
  if (timeRecommendations && timeRecommendations.length > 0) {
    md += `\n## 应期建议\n`;
    for (const tr of timeRecommendations) {
      md += `- ${tr.targetLiuQin}: ${tr.description}（${tr.startDate} - ${tr.endDate}）\n`;
    }
  }

  return md;
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
