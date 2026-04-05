import {
  traditionalYaoName
} from '../../liuyao-core.js';
import {
  normalizeDetailLevelBinary
} from '../../render-utils.js';
import type {
  MeihuaOutput
} from '../../types.js';
import type {
  MeihuaCanonicalTextOptions
} from '../shared/text-options.js';

export function renderMeihuaCanonicalText(result: MeihuaOutput, options: MeihuaCanonicalTextOptions = {}): string {
  const detailLevel = normalizeDetailLevelBinary(options.detailLevel);
  const lines: string[] = ['# 梅花易数', '', '## 起卦信息'];

  lines.push(`- 问题: ${result.question}`);
  lines.push(`- 方法: ${result.castMeta.methodLabel}`);
  lines.push(`- 方法系: ${result.castMeta.methodFamily === 'classical' ? '经典' : '扩展'}`);
  if (result.castMeta.resolvedMode) lines.push(`- 实际子方式: ${result.castMeta.resolvedMode}`);
  if (result.castMeta.inputSnapshot?.date) lines.push(`- 起卦时间: ${result.castMeta.inputSnapshot.date}`);
  if (result.castMeta.inputSnapshot?.text) lines.push(`- 原始文本: ${result.castMeta.inputSnapshot.text}`);
  if (result.castMeta.inputSnapshot?.sentences?.length) lines.push(`- 分句: ${result.castMeta.inputSnapshot.sentences.join(' / ')}`);
  if (result.castMeta.inputSnapshot?.selectedText) lines.push(`- 取用文本: ${result.castMeta.inputSnapshot.selectedText}`);
  if (result.castMeta.inputSnapshot?.multiSentenceStrategy) lines.push(`- 取句方式: ${result.castMeta.inputSnapshot.multiSentenceStrategy === 'first' ? '首句' : '末句'}`);
  for (const item of result.castMeta.inputSummary) {
    lines.push(`- ${item}`);
  }
  for (const warning of result.warnings) {
    lines.push(`- 提示: ${warning}`);
  }

  lines.push('');
  lines.push('## 卦盘');
  lines.push(`- 本卦: ${result.mainHexagram.name}（上${result.mainHexagram.upperTrigram.name} / 下${result.mainHexagram.lowerTrigram.name}）`);
  if (result.mainHexagram.guaCi) lines.push(`- 本卦卦辞: ${result.mainHexagram.guaCi}`);
  if (result.mainHexagram.xiangCi) lines.push(`- 本卦象辞: ${result.mainHexagram.xiangCi}`);
  lines.push(`- 动爻: ${traditionalYaoName(result.movingLine, Number.parseInt(result.mainHexagram.code[result.movingLine - 1] ?? '0', 10))}`);
  if (result.changedHexagram) {
    lines.push(`- 变卦: ${result.changedHexagram.name}`);
    if (result.changedHexagram.guaCi) lines.push(`- 变卦卦辞: ${result.changedHexagram.guaCi}`);
    if (result.changedHexagram.xiangCi) lines.push(`- 变卦象辞: ${result.changedHexagram.xiangCi}`);
  }
  if (result.nuclearHexagram) lines.push(`- 互卦: ${result.nuclearHexagram.name}`);
  if (result.oppositeHexagram) lines.push(`- 错卦: ${result.oppositeHexagram.name}`);
  if (result.reversedHexagram) lines.push(`- 综卦: ${result.reversedHexagram.name}`);
  lines.push(`- 体卦: ${result.bodyTrigram.name}（${result.bodyTrigram.element}）`);
  lines.push(`- 用卦: ${result.useTrigram.name}（${result.useTrigram.element}）`);

  lines.push('');
  lines.push('## 干支时间');
  lines.push('| 柱 | 干支 |');
  lines.push('|------|------|');
  lines.push(`| 年 | ${result.ganZhiTime.year.gan}${result.ganZhiTime.year.zhi} |`);
  lines.push(`| 月 | ${result.ganZhiTime.month.gan}${result.ganZhiTime.month.zhi} |`);
  lines.push(`| 日 | ${result.ganZhiTime.day.gan}${result.ganZhiTime.day.zhi} |`);
  lines.push(`| 时 | ${result.ganZhiTime.hour.gan}${result.ganZhiTime.hour.zhi} |`);

  lines.push('');
  lines.push('## 体用分析');
  lines.push(`- 体用关系: ${result.bodyUseRelation.relation}`);
  lines.push(`- 判定: ${result.bodyUseRelation.summary}`);
  lines.push(`- 月令旺衰: 体卦${result.seasonalState.body} / 用卦${result.seasonalState.use}`);
  if (detailLevel === 'full') {
    if (result.seasonalState.bodyMutual) lines.push(`- 体互旺衰: ${result.seasonalState.bodyMutual}`);
    if (result.seasonalState.useMutual) lines.push(`- 用互旺衰: ${result.seasonalState.useMutual}`);
    if (result.seasonalState.changed) lines.push(`- 变卦旺衰: ${result.seasonalState.changed}`);
  }

  lines.push('');
  lines.push('## 克应层次');
  for (const item of result.interactionReadings) {
    lines.push(`- ${item.stageLabel}: ${item.summary}`);
  }

  lines.push('');
  lines.push('## 应期提示');
  for (const item of result.timingHints) {
    const phaseLabel = item.phase === 'early' ? '前段' : item.phase === 'middle' ? '中段' : '后段';
    lines.push(`- ${phaseLabel} / ${item.trigger}: ${item.summary}`);
  }

  lines.push('');
  lines.push('## 结论');
  lines.push(`- 结果: ${result.judgement.outcome}`);
  lines.push(`- 总结: ${result.judgement.summary}`);
  if (detailLevel === 'full') {
    for (const basis of result.judgement.basis) {
      lines.push(`- 依据: ${basis}`);
    }
  }

  return lines.join('\n').trimEnd();
}
