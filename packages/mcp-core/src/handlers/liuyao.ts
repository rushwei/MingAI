import type { LiuyaoInput, LiuyaoOutput } from '../types.js';
import { createSeededRng, resolveSeed } from '../seeded-rng.js';
import { GUA_CI, XIANG_CI, YAO_CI } from '../hexagram-texts.js';
import {
  findHexagram,
  getPalaceInfo,
  hasInvalidYongShenTargets,
  normalizeYongShenTargets,
  performFullAnalysis,
  type YaoInput,
  type YaoType,
} from '../liuyao-core.js';

function calculateChangedLines(mainCode: string, changedCode: string): number[] {
  const lines: number[] = [];
  for (let index = 0; index < 6; index += 1) {
    if (mainCode[index] !== changedCode[index]) {
      lines.push(index + 1);
    }
  }
  return lines;
}

function calculateChangedHexagram(code: string, changedLines: number[]): string {
  const chars = code.split('');
  for (const line of changedLines) {
    const index = line - 1;
    chars[index] = chars[index] === '1' ? '0' : '1';
  }
  return chars.join('');
}

function divine(rng: () => number): { yaos: YaoInput[]; hexagramCode: string; changedLines: number[] } {
  const yaos: YaoInput[] = [];
  const changedLines: number[] = [];

  for (let index = 0; index < 6; index += 1) {
    const coins = [
      rng() > 0.5 ? 3 : 2,
      rng() > 0.5 ? 3 : 2,
      rng() > 0.5 ? 3 : 2,
    ];
    const sum = coins.reduce((left, right) => left + right, 0);

    let type: YaoType;
    let change: 'stable' | 'changing' = 'stable';

    if (sum === 6) {
      type = 0;
      change = 'changing';
    } else if (sum === 7) {
      type = 1;
    } else if (sum === 8) {
      type = 0;
    } else {
      type = 1;
      change = 'changing';
    }

    if (change === 'changing') {
      changedLines.push(index + 1);
    }

    yaos.push({
      type,
      change,
      position: index + 1,
    });
  }

  return {
    yaos,
    hexagramCode: yaos.map((item) => item.type).join(''),
    changedLines,
  };
}

function toLiuyaoOutput(params: {
  seed: string;
  question: string;
  hexagramCode: string;
  changedCode?: string;
  analysisDate: Date;
  yaos: YaoInput[];
  changedLines: number[];
  selectedTargets: ReturnType<typeof normalizeYongShenTargets>;
}): LiuyaoOutput {
  const { seed, question, hexagramCode, changedCode, analysisDate, yaos } = params;
  const baseHexagram = findHexagram(hexagramCode);
  const changedHexagram = changedCode ? findHexagram(changedCode) : undefined;
  const basePalace = getPalaceInfo(hexagramCode);
  const changedPalace = changedCode ? getPalaceInfo(changedCode) : undefined;

  if (!baseHexagram) {
    throw new Error(`未找到卦象：${hexagramCode}`);
  }

  const analysis = performFullAnalysis(
    yaos,
    hexagramCode,
    changedCode,
    question,
    analysisDate,
    { yongShenTargets: params.selectedTargets }
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fullYaos: LiuyaoOutput['fullYaos'] = analysis.fullYaos.map(({ change: _change, ...yao }) => ({
    ...yao,
    yaoCi: YAO_CI[baseHexagram.name]?.[yao.position - 1],
  }));

  return {
    seed,
    question,
    hexagramName: baseHexagram.name,
    hexagramGong: basePalace?.name || '',
    hexagramElement: baseHexagram.element,
    hexagramBrief: baseHexagram.nature,
    guaCi: GUA_CI[baseHexagram.name],
    xiangCi: XIANG_CI[baseHexagram.name],
    changedHexagramName: changedHexagram?.name,
    changedHexagramGong: changedPalace?.name,
    changedHexagramElement: changedHexagram?.element,
    changedGuaCi: changedHexagram ? GUA_CI[changedHexagram.name] : undefined,
    changedXiangCi: changedHexagram ? XIANG_CI[changedHexagram.name] : undefined,
    ganZhiTime: analysis.ganZhiTime,
    kongWang: analysis.kongWang,
    kongWangByPillar: analysis.kongWangByPillar,
    fullYaos,
    yongShen: analysis.yongShen,
    fuShen: analysis.fuShen,
    shenSystemByYongShen: analysis.shenSystemByYongShen,
    globalShenSha: analysis.globalShenSha,
    liuChongGuaInfo: analysis.liuChongGuaInfo,
    liuHeGuaInfo: analysis.liuHeGuaInfo,
    chongHeTransition: analysis.chongHeTransition,
    guaFanFuYin: analysis.guaFanFuYin,
    sanHeAnalysis: analysis.sanHeAnalysis,
    warnings: analysis.warnings,
    timeRecommendations: analysis.timeRecommendations,
  };
}

export async function handleLiuyaoAnalyze(input: LiuyaoInput): Promise<LiuyaoOutput> {
  const question = typeof input.question === 'string' ? input.question.trim() : '';
  if (!question) {
    throw new Error('请先明确问题后再解卦');
  }
  if (hasInvalidYongShenTargets(input.yongShenTargets)) {
    throw new Error('yongShenTargets 含非法值');
  }
  const selectedTargets = normalizeYongShenTargets(input.yongShenTargets);
  if (selectedTargets.length === 0) {
    throw new Error('请至少选择一个分析目标');
  }

  const {
    method = 'auto',
    hexagramName,
    changedHexagramName,
    date,
  } = input;

  let analysisDate = new Date();
  if (date) {
    analysisDate = date.includes('T')
      ? new Date(date)
      : new Date(`${date}T12:00:00`);
  }

  const dateKey = `${analysisDate.getFullYear()}-${String(analysisDate.getMonth() + 1).padStart(2, '0')}-${String(analysisDate.getDate()).padStart(2, '0')}`;
  const seed = resolveSeed(
    input.seed,
    `${question}|${method}|${dateKey}|${hexagramName || ''}|${changedHexagramName || ''}`,
    input.seedScope
  );
  const rng = createSeededRng(seed);

  let yaos: YaoInput[];
  let hexagramCode: string;
  let changedCode: string | undefined;
  let changedLines: number[] = [];

  if (method === 'select') {
    if (!hexagramName) {
      throw new Error('select 模式必须提供 hexagramName');
    }
    const baseHexagram = findHexagram(hexagramName);
    if (!baseHexagram) {
      throw new Error(`未找到卦象：${hexagramName}`);
    }
    hexagramCode = baseHexagram.code;
    if (changedHexagramName) {
      const changedHexagram = findHexagram(changedHexagramName);
      if (!changedHexagram) {
        throw new Error(`未找到变卦：${changedHexagramName}`);
      }
      changedCode = changedHexagram.code;
      changedLines = calculateChangedLines(hexagramCode, changedCode);
    }
    yaos = hexagramCode.split('').map((char, index) => ({
      type: parseInt(char, 10) as YaoType,
      change: changedLines.includes(index + 1) ? 'changing' : 'stable',
      position: index + 1,
    }));
  } else {
    const result = divine(rng);
    yaos = result.yaos;
    hexagramCode = result.hexagramCode;
    changedLines = result.changedLines;
    if (changedLines.length > 0) {
      changedCode = calculateChangedHexagram(hexagramCode, changedLines);
    }
  }

  const output = toLiuyaoOutput({
    seed,
    question,
    hexagramCode,
    changedCode,
    analysisDate,
    yaos,
    changedLines,
    selectedTargets,
  });
  return output;
}
