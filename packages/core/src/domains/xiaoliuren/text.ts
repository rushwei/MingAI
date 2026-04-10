import type { XiaoliurenOutput } from './types.js';

export interface XiaoliurenCanonicalTextOptions {
  /** 是否显示诗诀，默认 true */
  showPoem?: boolean;
}

export function toXiaoliurenText(
  output: XiaoliurenOutput,
  options: XiaoliurenCanonicalTextOptions = {},
): string {
  const { showPoem = true } = options;
  const lines: string[] = [];

  lines.push('# 小六壬占卜结果');
  lines.push('');

  if (output.question) {
    lines.push(`**占问**: ${output.question}`);
    lines.push('');
  }

  lines.push('## 起卦信息');
  lines.push(`- 农历月: ${output.input.lunarMonth}月`);
  lines.push(`- 农历日: ${output.input.lunarDay}日`);
  lines.push(`- 时辰: ${output.input.shichen}`);
  lines.push('');

  lines.push('## 推算过程');
  lines.push(`- 月上起: **${output.monthStatus}**`);
  lines.push(`- 日上落: **${output.dayStatus}**`);
  lines.push(`- 时上落: **${output.hourStatus}**`);
  lines.push('');

  lines.push('## 最终结果');
  lines.push(`- 落宫: **${output.result.name}**`);
  lines.push(`- 五行: ${output.result.element}`);
  lines.push(`- 方位: ${output.result.direction}`);
  lines.push(`- 吉凶: ${output.result.nature}`);
  lines.push('');
  lines.push(`**释义**: ${output.result.description}`);

  if (showPoem) {
    lines.push('');
    lines.push('## 诗诀');
    lines.push(output.result.poem);
  }

  return lines.join('\n');
}
