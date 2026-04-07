import type {
  MeihuaCanonicalJSON
} from './json-types.js';
import {
  traditionalYaoName
} from '../liuyao/calculate.js';
import {
  normalizeDetailLevelBinary
} from '../../shared/render-utils.js';
import type {
  MeihuaOutput
} from './types.js';
import type {
  MeihuaCanonicalTextOptions
} from '../shared/text-options.js';

export function renderMeihuaCanonicalJSON(
  result: MeihuaOutput,
  options: MeihuaCanonicalTextOptions = {},
): MeihuaCanonicalJSON {
  const detailLevel = normalizeDetailLevelBinary(options.detailLevel);
  const bodyPosition = result.movingLine <= 3 ? '上卦' : '下卦';
  const usePosition = result.movingLine <= 3 ? '下卦' : '上卦';
  const inputSnapshot = result.castMeta.inputSnapshot;
  const sentenceStrategyLabel = inputSnapshot?.multiSentenceStrategy === 'first'
    ? '首句'
    : inputSnapshot?.multiSentenceStrategy === 'last'
      ? '末句'
      : undefined;
  const rawInput: MeihuaCanonicalJSON['起卦信息']['原始输入'] = inputSnapshot
    ? {
      日期: inputSnapshot.date,
      ...(typeof inputSnapshot.count === 'number' ? { 数量: inputSnapshot.count } : {}),
      ...(inputSnapshot.countCategory ? { 数量类别: inputSnapshot.countCategory } : {}),
      ...(inputSnapshot.text ? { 文本: inputSnapshot.text } : {}),
      ...(inputSnapshot.sentences?.length ? { 分句: [...inputSnapshot.sentences] } : {}),
      ...(inputSnapshot.selectedText ? { 取用文本: inputSnapshot.selectedText } : {}),
      ...(sentenceStrategyLabel ? { 取句方式: sentenceStrategyLabel } : {}),
      ...(typeof inputSnapshot.leftStrokeCount === 'number' ? { 左半笔画: inputSnapshot.leftStrokeCount } : {}),
      ...(typeof inputSnapshot.rightStrokeCount === 'number' ? { 右半笔画: inputSnapshot.rightStrokeCount } : {}),
      ...(inputSnapshot.measureKind ? { 量法: inputSnapshot.measureKind } : {}),
      ...(typeof inputSnapshot.majorValue === 'number' ? { 大单位: inputSnapshot.majorValue } : {}),
      ...(typeof inputSnapshot.minorValue === 'number' ? { 小单位: inputSnapshot.minorValue } : {}),
      ...(inputSnapshot.upperCue ? { 上卦类象: inputSnapshot.upperCue } : {}),
      ...(inputSnapshot.upperCueCategory ? { 上卦类象类别: inputSnapshot.upperCueCategory } : {}),
      ...(inputSnapshot.lowerCue ? { 下卦类象: inputSnapshot.lowerCue } : {}),
      ...(inputSnapshot.lowerCueCategory ? { 下卦类象类别: inputSnapshot.lowerCueCategory } : {}),
      ...(inputSnapshot.hexagramName ? { 指定卦名: inputSnapshot.hexagramName } : {}),
      ...(inputSnapshot.upperTrigram ? { 指定上卦: inputSnapshot.upperTrigram } : {}),
      ...(inputSnapshot.lowerTrigram ? { 指定下卦: inputSnapshot.lowerTrigram } : {}),
      ...(typeof inputSnapshot.movingLine === 'number' ? { 指定动爻: inputSnapshot.movingLine } : {}),
      ...(inputSnapshot.numbers?.length ? { 数字序列: [...inputSnapshot.numbers] } : {}),
    }
    : undefined;

  return {
    起卦信息: {
      问题: result.question,
      方法: result.castMeta.methodLabel,
      方法系: result.castMeta.methodFamily === 'classical' ? '经典' : '扩展',
      ...(result.castMeta.resolvedMode ? { 实际子方式: result.castMeta.resolvedMode } : {}),
      ...(result.castMeta.inputSnapshot?.date ? { 起卦时间: result.castMeta.inputSnapshot.date } : {}),
      ...(result.castMeta.inputSnapshot?.text ? { 原始文本: result.castMeta.inputSnapshot.text } : {}),
      ...(result.castMeta.inputSnapshot?.sentences?.length ? { 分句: [...result.castMeta.inputSnapshot.sentences] } : {}),
      ...(result.castMeta.inputSnapshot?.selectedText ? { 取用文本: result.castMeta.inputSnapshot.selectedText } : {}),
      ...(sentenceStrategyLabel ? { 取句方式: sentenceStrategyLabel } : {}),
      ...(rawInput ? { 原始输入: rawInput } : {}),
      输入摘要: [...result.castMeta.inputSummary],
      ...(result.warnings.length > 0 ? { 警告: [...result.warnings] } : {}),
    },
    卦盘: {
      本卦: {
        卦名: result.mainHexagram.name,
        上卦: result.mainHexagram.upperTrigram.name,
        下卦: result.mainHexagram.lowerTrigram.name,
        五行: result.mainHexagram.element,
        ...(result.mainHexagram.guaCi ? { 卦辞: result.mainHexagram.guaCi } : {}),
        ...(result.mainHexagram.xiangCi ? { 象辞: result.mainHexagram.xiangCi } : {}),
      },
      动爻: traditionalYaoName(result.movingLine, Number.parseInt(result.mainHexagram.code[result.movingLine - 1] ?? '0', 10)),
      变卦: {
        卦名: result.changedHexagram?.name || '',
        ...(result.changedHexagram?.guaCi ? { 卦辞: result.changedHexagram.guaCi } : {}),
        ...(result.changedHexagram?.xiangCi ? { 象辞: result.changedHexagram.xiangCi } : {}),
      },
      ...(result.nuclearHexagram ? { 互卦: { 卦名: result.nuclearHexagram.name, 卦辞: result.nuclearHexagram.guaCi, 象辞: result.nuclearHexagram.xiangCi } } : {}),
      ...(result.oppositeHexagram ? { 错卦: { 卦名: result.oppositeHexagram.name, 卦辞: result.oppositeHexagram.guaCi, 象辞: result.oppositeHexagram.xiangCi } } : {}),
      ...(result.reversedHexagram ? { 综卦: { 卦名: result.reversedHexagram.name, 卦辞: result.reversedHexagram.guaCi, 象辞: result.reversedHexagram.xiangCi } } : {}),
      体卦: {
        卦名: result.bodyTrigram.name,
        五行: result.bodyTrigram.element,
        所属: bodyPosition,
      },
      用卦: {
        卦名: result.useTrigram.name,
        五行: result.useTrigram.element,
        所属: usePosition,
      },
    },
    干支时间: [
      { 柱: '年', 干支: `${result.ganZhiTime.year.gan}${result.ganZhiTime.year.zhi}` },
      { 柱: '月', 干支: `${result.ganZhiTime.month.gan}${result.ganZhiTime.month.zhi}` },
      { 柱: '日', 干支: `${result.ganZhiTime.day.gan}${result.ganZhiTime.day.zhi}` },
      { 柱: '时', 干支: `${result.ganZhiTime.hour.gan}${result.ganZhiTime.hour.zhi}` },
    ],
    体用分析: {
      关系: result.bodyUseRelation.relation,
      判定: result.bodyUseRelation.summary,
      月令旺衰: {
        月支: result.seasonalState.monthBranch,
        体卦: result.seasonalState.body,
        用卦: result.seasonalState.use,
        ...(detailLevel === 'full' && result.seasonalState.bodyMutual ? { 体互: result.seasonalState.bodyMutual } : {}),
        ...(detailLevel === 'full' && result.seasonalState.useMutual ? { 用互: result.seasonalState.useMutual } : {}),
        ...(detailLevel === 'full' && result.seasonalState.changed ? { 变卦: result.seasonalState.changed } : {}),
      },
    },
    克应分析: result.interactionReadings.map((item) => ({
      层级: item.stageLabel,
      关系: item.relation,
      吉凶: item.favorable ? '吉' : '凶',
      说明: item.summary,
    })),
    应期提示: result.timingHints.map((item) => ({
      阶段: item.phase === 'early' ? '前段' : item.phase === 'middle' ? '中段' : '后段',
      触发: item.trigger,
      说明: item.summary,
    })),
    结论: {
      结果: result.judgement.outcome,
      总结: result.judgement.summary,
      依据: [...result.judgement.basis],
    },
  };
}

// ===== 塔罗 =====
