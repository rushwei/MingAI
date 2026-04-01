/**
 * CanonicalJSON 渲染层
 * 与 text.ts 的 render*CanonicalText() 平行，输出结构化 JSON 对象。
 */

import type {
  BaziOutput,
  BaziPillarsResolveOutput,
  DetailLevel,
  DayunOutput,
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
import { Solar } from 'lunar-javascript';
import type {
  BaziCanonicalJSON,
  BaziPillarsResolveCanonicalJSON,
  BranchRelationJSON,
  DaliurenCanonicalJSON,
  DayunCanonicalJSON,
  DayunItemJSON,
  FortuneCanonicalJSON,
  HiddenStemJSON,
  LiunianItemJSON,
  LiuyaoAISafeCombinationJSON,
  LiuyaoAISafeJSON,
  LiuyaoAISafeLineJSON,
  LiuyaoAISafeParticipantJSON,
  LiuyaoCanonicalJSON,
  LiuyaoYaoJSON,
  QimenCanonicalJSON,
  TarotCanonicalJSON,
  TrueSolarTimeJSON,
  ZiweiCanonicalJSON,
  ZiweiFlyingStarCanonicalJSON,
  ZiweiFlyingStarResultJSON,
  ZiweiHoroscopeCanonicalJSON,
  ZiweiStarJSON,
} from './json-types.js';
import type { BaziCanonicalTextOptions, DaliurenCanonicalTextOptions, QimenCanonicalTextOptions, TarotCanonicalTextOptions, ZiweiCanonicalTextOptions, ZiweiHoroscopeCanonicalTextOptions } from './text.js';
import { sortZiweiPalaces } from './text.js';
import {
  formatGuaLevelLines,
  KONG_WANG_LABELS,
  sortYaosDescending,
  traditionalYaoName,
  WANG_SHUAI_LABELS,
  YONG_SHEN_STATUS_LABELS,
} from './liuyao-core.js';
import { GAN_WUXING } from './utils.js';

export type * from './json-types.js';

// ===== 内部工具函数 =====

function buildTrueSolarTimeJSON(info: {
  clockTime: string; trueSolarTime: string; longitude: number; correctionMinutes: number;
}): TrueSolarTimeJSON {
  return {
    钟表时间: info.clockTime,
    真太阳时: info.trueSolarTime,
    经度: info.longitude,
    校正分钟: info.correctionMinutes,
  };
}

function buildStarJSON(star: {
  name: string; brightness?: string; mutagen?: string; selfMutagen?: string; oppositeMutagen?: string;
}): ZiweiStarJSON {
  return buildZiweiStarJSON(star);
}

function buildShenSystemMap<T extends { targetLiuQin: string }>(systems: T[]): Map<string, T> {
  return new Map(systems.map((system) => [system.targetLiuQin, system] as const));
}

function buildShenSystemJSON(
  system: ShenSystemInfo | undefined,
): { yuanShen?: string; jiShen?: string; chouShen?: string } | undefined {
  if (!system) return undefined;
  const result: { yuanShen?: string; jiShen?: string; chouShen?: string } = {};
  if (system.yuanShen) result.yuanShen = `${system.yuanShen.liuQin}（${system.yuanShen.wuXing}）`;
  if (system.jiShen) result.jiShen = `${system.jiShen.liuQin}（${system.jiShen.wuXing}）`;
  if (system.chouShen) result.chouShen = `${system.chouShen.liuQin}（${system.chouShen.wuXing}）`;
  return Object.keys(result).length > 0 ? result : undefined;
}

function buildHiddenStemJSON(item: { stem: string; tenGod: string; qiType?: string }): HiddenStemJSON {
  return {
    天干: item.stem,
    十神: item.tenGod,
    ...(item.qiType ? { 气性: item.qiType } : {}),
  };
}

function buildBranchRelationJSON(item: { type: string; branches: string[]; description: string }): BranchRelationJSON {
  return {
    类型: item.type,
    地支: [...item.branches],
    描述: item.description,
  };
}

function buildLiunianItemJSON(item: {
  year: number;
  age: number;
  ganZhi: string;
  gan: string;
  zhi: string;
  tenGod: string;
  nayin?: string;
  hiddenStems?: Array<{ stem: string; tenGod: string; qiType?: string }>;
  diShi?: string;
  shenSha?: string[];
  branchRelations?: Array<{ type: string; branches: string[]; description: string }>;
  taiSui?: string[];
}): LiunianItemJSON {
  return {
    流年: item.year,
    年龄: item.age,
    干支: item.ganZhi,
    天干: item.gan,
    地支: item.zhi,
    十神: item.tenGod || '-',
    ...(item.nayin ? { 纳音: item.nayin } : {}),
    藏干: item.hiddenStems?.length
      ? item.hiddenStems.map(buildHiddenStemJSON)
      : [],
    ...(item.diShi ? { 地势: item.diShi } : {}),
    ...(item.shenSha?.length ? { 神煞: [...item.shenSha] } : {}),
    ...(item.branchRelations?.length ? { 原局关系: item.branchRelations.map(buildBranchRelationJSON) } : {}),
    ...(item.taiSui?.length ? { 太岁关系: [...item.taiSui] } : {}),
  };
}

function buildLeanHiddenStemItems(items: Array<{ stem: string; tenGod: string; qiType?: string }> | undefined) {
  return items?.map((item) => ({ stem: item.stem, tenGod: item.tenGod })) || [];
}

function buildDayunItemJSON(item: {
  startYear: number;
  startAge?: number;
  ganZhi: string;
  stem?: string;
  branch?: string;
  tenGod: string;
  branchTenGod?: string;
  hiddenStems?: Array<{ stem: string; tenGod: string; qiType?: string }>;
  naYin?: string;
  diShi?: string;
  shenSha?: string[];
  branchRelations?: Array<{ type: string; branches: string[]; description: string }>;
  liunianList?: Array<{
    year: number;
    age: number;
    ganZhi: string;
    gan: string;
    zhi: string;
    tenGod: string;
    nayin?: string;
    hiddenStems?: Array<{ stem: string; tenGod: string; qiType?: string }>;
    diShi?: string;
    shenSha?: string[];
    branchRelations?: Array<{ type: string; branches: string[]; description: string }>;
    taiSui?: string[];
  }>;
}): DayunItemJSON {
  return {
    起运年份: item.startYear,
    ...(typeof item.startAge === 'number' ? { 起运年龄: item.startAge } : {}),
    干支: item.ganZhi,
    ...(item.stem ? { 天干: item.stem } : {}),
    ...(item.branch ? { 地支: item.branch } : {}),
    十神: item.tenGod || '-',
    ...(item.branchTenGod ? { 地支主气十神: item.branchTenGod } : {}),
    藏干: item.hiddenStems?.length
      ? item.hiddenStems.map(buildHiddenStemJSON)
      : [],
    ...(item.diShi ? { 地势: item.diShi } : {}),
    ...(item.naYin ? { 纳音: item.naYin } : {}),
    ...(item.shenSha?.length ? { 神煞: [...item.shenSha] } : {}),
    ...(item.branchRelations?.length ? { 原局关系: item.branchRelations.map(buildBranchRelationJSON) } : {}),
    ...(item.liunianList?.length ? { 流年列表: item.liunianList.map(buildLiunianItemJSON) } : {}),
  };
}

function buildBaziCanonicalPillarShenSha(item: { shenSha?: string[] }): string[] {
  return item.shenSha?.length ? [...item.shenSha] : [];
}

function normalizeDetailLevel(detailLevel?: DetailLevel | 'safe' | 'facts' | 'debug'): DetailLevel {
  if (detailLevel === 'more' || detailLevel === 'facts') return 'more';
  if (detailLevel === 'full' || detailLevel === 'debug') return 'full';
  return 'default';
}

function normalizeBaziDetailLevel(detailLevel?: BaziCanonicalTextOptions['detailLevel']): 'default' | 'full' {
  if (detailLevel === 'full' || detailLevel === 'more' || detailLevel === 'facts' || detailLevel === 'debug') {
    return 'full';
  }
  return 'default';
}

function normalizeZiweiDetailLevel(detailLevel?: ZiweiCanonicalTextOptions['detailLevel']): 'default' | 'full' {
  if (detailLevel === 'full' || detailLevel === 'more' || detailLevel === 'facts' || detailLevel === 'debug') {
    return 'full';
  }
  return 'default';
}

function normalizeQimenDetailLevel(detailLevel?: QimenCanonicalTextOptions['detailLevel']): 'default' | 'full' {
  if (detailLevel === 'full' || detailLevel === 'more' || detailLevel === 'facts' || detailLevel === 'debug') {
    return 'full';
  }
  return 'default';
}

function normalizeDaliurenDetailLevel(detailLevel?: DaliurenCanonicalTextOptions['detailLevel']): 'default' | 'full' {
  if (detailLevel === 'full' || detailLevel === 'more' || detailLevel === 'facts' || detailLevel === 'debug') {
    return 'full';
  }
  return 'default';
}

function normalizeZiweiHoroscopeDetailLevel(detailLevel?: ZiweiHoroscopeCanonicalTextOptions['detailLevel']): 'default' | 'full' {
  if (detailLevel === 'full' || detailLevel === 'more' || detailLevel === 'facts' || detailLevel === 'debug') {
    return 'full';
  }
  return 'default';
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

function buildZiweiTrueSolarTimeJSON(info: NonNullable<ZiweiOutput['trueSolarTimeInfo']>): NonNullable<ZiweiCanonicalJSON['基本信息']['真太阳时']> {
  const 跨日偏移 = info.dayOffset > 0
    ? `后${info.dayOffset}日`
    : info.dayOffset < 0
      ? `前${Math.abs(info.dayOffset)}日`
      : '当日';

  return {
    钟表时间: info.clockTime,
    真太阳时: info.trueSolarTime,
    经度: info.longitude,
    校正分钟: info.correctionMinutes,
    真太阳时索引: info.trueTimeIndex,
    跨日偏移,
  };
}

function buildZiweiStarJSON(star: {
  name: string; brightness?: string; mutagen?: string; selfMutagen?: string; oppositeMutagen?: string;
}): ZiweiStarJSON {
  const result: ZiweiStarJSON = { 星名: star.name };
  if (star.brightness) result.亮度 = star.brightness;
  if (star.mutagen) result.四化 = star.mutagen;
  if (star.selfMutagen) result.离心自化 = star.selfMutagen;
  if (star.oppositeMutagen) result.向心自化 = star.oppositeMutagen;
  return result;
}

function buildZiweiBirthYearMutagensJSON(result: ZiweiOutput): ZiweiCanonicalJSON['基本信息']['生年四化'] | undefined {
  if (!result.mutagenSummary?.length) return undefined;
  const order = new Map([
    ['禄', 0],
    ['权', 1],
    ['科', 2],
    ['忌', 3],
  ]);
  return {
    天干: result.fourPillars.year.gan,
    四化星曜: [...result.mutagenSummary]
      .sort((left, right) => {
        const leftOrder = order.get(left.mutagen) ?? Number.MAX_SAFE_INTEGER;
        const rightOrder = order.get(right.mutagen) ?? Number.MAX_SAFE_INTEGER;
        return leftOrder - rightOrder;
      })
      .map((item) => ({
        四化: item.mutagen,
        星曜: item.starName,
        宫位: item.palaceName,
      })),
  };
}

function mapLiuyaoRelationLabel(label: string | undefined): string | undefined {
  if (!label) return undefined;
  return label === '平' ? undefined : label;
}

function buildLiuyaoPositionLabel(
  position: number | undefined,
  fullYaos: LiuyaoOutput['fullYaos'],
): string | undefined {
  if (!position) return undefined;
  const attached = fullYaos.find((yao) => yao.position === position);
  return attached ? `${traditionalYaoName(position, attached.type)}爻` : `${position}爻`;
}

function buildLiuyaoInteractionSources(result: LiuyaoOutput): LiuyaoAISafeParticipantJSON[] {
  const participants: LiuyaoAISafeParticipantJSON[] = [];
  for (const yao of result.fullYaos || []) {
    if (yao.isChanging) {
      participants.push({
        来源: '动爻',
        地支: yao.naJia,
        位置: buildLiuyaoPositionLabel(yao.position, result.fullYaos),
      });
    }
    if (yao.changedYao) {
      participants.push({
        来源: '变爻',
        地支: yao.changedYao.naJia,
        位置: buildLiuyaoPositionLabel(yao.position, result.fullYaos),
      });
    }
  }

  participants.push({ 来源: '月建', 地支: result.ganZhiTime.month.zhi });
  participants.push({ 来源: '日建', 地支: result.ganZhiTime.day.zhi });

  return participants;
}

function buildBanHeParticipants(
  branches: string[],
  sources: LiuyaoAISafeParticipantJSON[],
): LiuyaoAISafeParticipantJSON[] {
  const priority = {
    变爻: 0,
    动爻: 1,
    月建: 2,
    日建: 3,
  } as const;

  return branches.map((branch) => {
    const matches = sources.filter((source) => source.地支 === branch);
    matches.sort((left, right) => priority[left.来源] - priority[right.来源]);
    return matches[0] || { 来源: '日建', 地支: branch };
  });
}

function buildLiuyaoAISafeBoardLines(
  result: LiuyaoOutput,
  detailLevel: DetailLevel,
): LiuyaoAISafeJSON['六爻全盘']['爻列表'] {
  return sortYaosDescending(result.fullYaos || []).map((yao) => {
    const line: LiuyaoAISafeJSON['六爻全盘']['爻列表'][number] = {
      爻位: traditionalYaoName(yao.position, yao.type),
      六神: yao.liuShen,
      ...(detailLevel !== 'default' && yao.shenSha?.length ? { 神煞: [...yao.shenSha] } : {}),
      本爻: {
        六亲: yao.liuQin,
        纳甲: yao.naJia,
        五行: yao.wuXing,
        ...(detailLevel === 'full' ? { 旺衰: WANG_SHUAI_LABELS[yao.strength.wangShuai] } : {}),
      },
      ...(detailLevel === 'full' ? { 动静: yao.movementLabel } : {}),
      ...(detailLevel === 'full' && yao.kongWangState && yao.kongWangState !== 'not_kong'
        ? { 空亡: KONG_WANG_LABELS[yao.kongWangState] || yao.kongWangState }
        : {}),
    };

    if (yao.fuShen) {
      line.伏神 = {
        六亲: yao.fuShen.liuQin,
        纳甲: yao.fuShen.naJia,
        五行: yao.fuShen.wuXing,
      };
    }

    if (yao.changedYao) {
      line.变爻 = {
        六亲: yao.changedYao.liuQin,
        纳甲: yao.changedYao.naJia,
        五行: yao.changedYao.wuXing,
      };
      if (detailLevel === 'full' && mapLiuyaoRelationLabel(yao.changedYao.relation)) {
        line.化变 = mapLiuyaoRelationLabel(yao.changedYao.relation);
      }
    }

    if (yao.isShiYao) line.世应 = '世';
    else if (yao.isYingYao) line.世应 = '应';

    return line;
  });
}

function buildBaziCanonicalRelations(result: Pick<BaziOutput, 'fourPillars' | 'relations' | 'tianGanChongKe' | 'tianGanWuHe' | 'diZhiBanHe' | 'diZhiSanHui'>): string[] {
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
  for (const item of result.tianGanChongKe) {
    pushUnique(`${item.stemA}${item.stemB}冲克`);
  }
  for (const item of result.tianGanWuHe) {
    pushUnique(`${item.stemA}${item.stemB}合${item.resultElement}`);
  }
  for (const item of result.diZhiBanHe) {
    pushUnique(`${item.branches.join('')}半合${item.resultElement}`);
  }
  for (const item of result.diZhiSanHui) {
    pushUnique(`${item.branches.join('')}三会${item.resultElement}`);
  }

  return relationParts;
}

// ===== 八字 =====

export function renderBaziCanonicalJSON(
  chart: BaziOutput,
  options: BaziCanonicalTextOptions = {},
): BaziCanonicalJSON {
  const detailLevel = normalizeBaziDetailLevel(options.detailLevel);
  const { dayun } = options;
  const basicInfo: BaziCanonicalJSON['基本信息'] = {
    性别: chart.gender === 'male' ? '男' : '女',
    日主: chart.dayMaster,
    ...(detailLevel === 'full' ? { 命主五行: `${chart.dayMaster}${GAN_WUXING[chart.dayMaster.charAt(0)] || ''}` } : {}),
  };
  if (detailLevel === 'full' && chart.kongWang?.kongZhi?.length) basicInfo.空亡 = [...chart.kongWang.kongZhi];
  if (chart.birthPlace) basicInfo.出生地 = chart.birthPlace;
  if (chart.trueSolarTimeInfo) basicInfo.真太阳时 = buildTrueSolarTimeJSON(chart.trueSolarTimeInfo);
  if (detailLevel === 'full' && chart.taiYuan) basicInfo.胎元 = chart.taiYuan;
  if (detailLevel === 'full' && chart.mingGong) basicInfo.命宫 = chart.mingGong;

  const fourPillars = ([
    ['年柱', chart.fourPillars.year],
    ['月柱', chart.fourPillars.month],
    ['日柱', chart.fourPillars.day],
    ['时柱', chart.fourPillars.hour],
  ] as const).map(([label, pillar]) => {
    const entry: BaziCanonicalJSON['四柱'][number] = {
      柱: label,
      干支: `${pillar.stem}${pillar.branch}`,
      天干十神: pillar.tenGod || '-',
      藏干: pillar.hiddenStems.map((item) => buildHiddenStemJSON({
        stem: item.stem,
        tenGod: item.tenGod || '-',
        ...(detailLevel === 'full' ? { qiType: item.qiType } : {}),
      })),
      地势: pillar.diShi || '-',
      ...(detailLevel === 'full' && pillar.naYin ? { 纳音: pillar.naYin } : {}),
      ...(detailLevel === 'full' && pillar.shenSha?.length ? { 神煞: buildBaziCanonicalPillarShenSha(pillar) } : {}),
    };
    if (pillar.kongWang?.isKong) entry.空亡 = '是';
    return entry;
  });

  const relations = buildBaziCanonicalRelations(chart);

  const json: BaziCanonicalJSON = { 基本信息: basicInfo, 四柱: fourPillars, 干支关系: relations };

  if (dayun) {
    json.大运 = {
      起运信息: `${dayun.startAge}岁（${dayun.startAgeDetail}）`,
      大运列表: dayun.list.map((item) => buildDayunItemJSON({
        startYear: item.startYear,
        startAge: item.startAge,
        ganZhi: item.ganZhi,
        stem: detailLevel === 'full' ? item.stem : undefined,
        branch: detailLevel === 'full' ? item.branch : undefined,
        tenGod: item.tenGod,
        branchTenGod: detailLevel === 'full' ? item.branchTenGod : undefined,
        hiddenStems: detailLevel === 'full' ? item.hiddenStems : buildLeanHiddenStemItems(item.hiddenStems),
        diShi: detailLevel === 'full' ? item.diShi : undefined,
        naYin: detailLevel === 'full' ? item.naYin : undefined,
        shenSha: detailLevel === 'full' ? item.shenSha : undefined,
        branchRelations: detailLevel === 'full' ? item.branchRelations : undefined,
        liunianList: detailLevel === 'full' ? item.liunianList : undefined,
      })),
    };
  }

  return json;
}

// ===== 六爻 =====

export function renderLiuyaoCanonicalJSON(result: LiuyaoOutput): LiuyaoCanonicalJSON {
  const hexagramInfo: LiuyaoCanonicalJSON['卦盘'] = {
    本卦: {
      卦名: result.hexagramName,
      卦宫: result.hexagramGong,
      五行: result.hexagramElement,
    },
  };
  if (result.question) hexagramInfo.问题 = result.question;
  if (result.guaCi) hexagramInfo.本卦.卦辞 = result.guaCi;
  if (result.xiangCi) hexagramInfo.本卦.象辞 = result.xiangCi;

  if (result.changedHexagramName) {
    const changed: NonNullable<typeof hexagramInfo.变卦> = {
      卦名: result.changedHexagramName,
    };
    if (result.changedHexagramGong) changed.卦宫 = result.changedHexagramGong;
    if (result.changedHexagramElement) changed.五行 = result.changedHexagramElement;
    if (result.changedGuaCi) changed.卦辞 = result.changedGuaCi;
    if (result.changedXiangCi) changed.象辞 = result.changedXiangCi;
    const changingYaoCi = (result.fullYaos || [])
      .filter((item) => item.isChanging && item.yaoCi)
      .map((yao) => ({ 爻名: traditionalYaoName(yao.position, yao.type), 爻辞: yao.yaoCi! }));
    if (changingYaoCi.length > 0) changed.动爻爻辞 = changingYaoCi;
    hexagramInfo.变卦 = changed;
  }

  if (result.nuclearHexagram) {
    hexagramInfo.互卦 = {
      卦名: result.nuclearHexagram.name,
      卦辞: result.nuclearHexagram.guaCi,
      象辞: result.nuclearHexagram.xiangCi,
    };
  }
  if (result.oppositeHexagram) {
    hexagramInfo.错卦 = {
      卦名: result.oppositeHexagram.name,
      卦辞: result.oppositeHexagram.guaCi,
      象辞: result.oppositeHexagram.xiangCi,
    };
  }
  if (result.reversedHexagram) {
    hexagramInfo.综卦 = {
      卦名: result.reversedHexagram.name,
      卦辞: result.reversedHexagram.guaCi,
      象辞: result.reversedHexagram.xiangCi,
    };
  }

  if (result.guaShen) {
    const guaShenYao = (result.fullYaos || []).find((y) => y.position === result.guaShen!.linePosition);
    const posLabel = typeof result.guaShen.linePosition === 'number'
      ? (guaShenYao ? `${traditionalYaoName(result.guaShen.linePosition, guaShenYao.type)}爻` : `${result.guaShen.linePosition}爻`)
      : undefined;
    hexagramInfo.卦身 = {
      地支: result.guaShen.branch,
    };
    if (posLabel) hexagramInfo.卦身.位置 = posLabel;
    if (result.guaShen.absent) hexagramInfo.卦身.状态 = '飞伏';
  }

  // 干支时间
  const gz = result.ganZhiTime;
  const ganZhiTime = [
    { 柱: '年', 干支: `${gz.year.gan}${gz.year.zhi}`, 空亡: [...result.kongWangByPillar.year.kongDizhi] },
    { 柱: '月', 干支: `${gz.month.gan}${gz.month.zhi}`, 空亡: [...result.kongWangByPillar.month.kongDizhi] },
    { 柱: '日', 干支: `${gz.day.gan}${gz.day.zhi}`, 空亡: [...result.kongWang.kongDizhi] },
    { 柱: '时', 干支: `${gz.hour.gan}${gz.hour.zhi}`, 空亡: [...result.kongWangByPillar.hour.kongDizhi] },
  ];

  // 六爻
  const sortedYaos = sortYaosDescending(result.fullYaos || []);
  const globalShenShaSet = new Set(result.globalShenSha || []);

  const yaos: LiuyaoYaoJSON[] = sortedYaos.map((yao) => {
    const yaoJSON: LiuyaoYaoJSON = {
      爻位: traditionalYaoName(yao.position, yao.type),
      六亲: yao.liuQin,
      六神: yao.liuShen,
      纳甲: yao.naJia,
      五行: yao.wuXing,
      旺衰: WANG_SHUAI_LABELS[yao.strength.wangShuai],
      动静状态: yao.movementState,
      动静: yao.movementLabel,
    };
    if (yao.isShiYao) yaoJSON.世应 = '世';
    else if (yao.isYingYao) yaoJSON.世应 = '应';

    if (yao.kongWangState && yao.kongWangState !== 'not_kong') {
      const kl = KONG_WANG_LABELS[yao.kongWangState];
      if (kl) yaoJSON.空亡 = kl;
    }
    if (yao.changSheng?.stage) yaoJSON.长生 = yao.changSheng.stage;

    const localShenSha = yao.shenSha?.filter((s) => !globalShenShaSet.has(s)) || [];
    if (localShenSha.length > 0) yaoJSON.神煞 = localShenSha;

    if (yao.isChanging && yao.changedYao) {
      yaoJSON.变爻 = {
        六亲: yao.changedYao.liuQin,
        纳甲: yao.changedYao.naJia,
        五行: yao.changedYao.wuXing,
        关系: yao.changedYao.relation,
      };
    }
    if (yao.fuShen) {
      yaoJSON.伏神 = {
        六亲: yao.fuShen.liuQin,
        纳甲: yao.fuShen.naJia,
        五行: yao.fuShen.wuXing,
        关系: yao.fuShen.relation,
      };
    }

    return yaoJSON;
  });

  // 用神分析
  const yaoNameMap = new Map<number, string>();
  for (const yao of sortedYaos) yaoNameMap.set(yao.position, traditionalYaoName(yao.position, yao.type));
  const posLabel = (pos?: number) => (pos ? `${yaoNameMap.get(pos) || pos}爻` : undefined);

  const shenSystemMap = buildShenSystemMap(result.shenSystemByYongShen || []);
  const timeRecMap = new Map<string, typeof result.timeRecommendations>();
  for (const item of result.timeRecommendations || []) {
    const list = timeRecMap.get(item.targetLiuQin) || [];
    list.push(item);
    timeRecMap.set(item.targetLiuQin, list);
  }

  const yongShenAnalysis: LiuyaoCanonicalJSON['用神分析'] = result.yongShen.map((group) => {
    const selected = group.selected;
    const entry: LiuyaoCanonicalJSON['用神分析'][number] = {
      目标六亲: group.targetLiuQin,
      取用状态: YONG_SHEN_STATUS_LABELS[group.selectionStatus] || group.selectionStatus,
      已选用神: {
        六亲: selected.liuQin,
        强弱: selected.strengthLabel,
        动静: selected.movementLabel,
      },
    };
    const selectedPos = posLabel(selected.position);
    if (selectedPos) entry.已选用神.爻位 = selectedPos;
    if (selected.naJia) entry.已选用神.纳甲 = selected.naJia;
    if (selected.changedNaJia) entry.已选用神.变爻纳甲 = selected.changedNaJia;
    if (selected.huaType) entry.已选用神.化变类型 = selected.huaType;
    if (selected.element) entry.已选用神.五行 = selected.element;
    if (selected.source) entry.已选用神.来源 = selected.source;
    if (selected.movementState) entry.已选用神.动静状态 = selected.movementState;
    if (selected.isShiYao) entry.已选用神.是否世爻 = '是';
    if (selected.isYingYao) entry.已选用神.是否应爻 = '是';
    if (selected.kongWangState) entry.已选用神.空亡状态 = selected.kongWangState;
    if (selected.evidence?.length) entry.已选用神.依据 = selected.evidence;

    if (group.selectionNote && group.selectionStatus !== 'resolved') {
      entry.取用说明 = group.selectionNote;
    }

    if (group.candidates?.length) {
      entry.候选用神 = group.candidates.map((candidate) => {
        const c: NonNullable<typeof entry.候选用神>[number] = { 六亲: candidate.liuQin };
        const cPos = posLabel(candidate.position);
        if (cPos) c.爻位 = cPos;
        if (candidate.naJia) c.纳甲 = candidate.naJia;
        if (candidate.changedNaJia) c.变爻纳甲 = candidate.changedNaJia;
        if (candidate.huaType) c.化变类型 = candidate.huaType;
        if (candidate.element) c.五行 = candidate.element;
        if (candidate.source) c.来源 = candidate.source;
        if (candidate.movementState) c.动静状态 = candidate.movementState;
        if (candidate.isShiYao) c.是否世爻 = '是';
        if (candidate.isYingYao) c.是否应爻 = '是';
        if (candidate.kongWangState) c.空亡状态 = candidate.kongWangState;
        if (candidate.evidence?.length) c.依据 = candidate.evidence;
        return c;
      });
    }

    const shenSystem = buildShenSystemJSON(shenSystemMap.get(group.targetLiuQin));
    if (shenSystem) {
      entry.神煞系统 = {
        ...(shenSystem.yuanShen ? { 原神: shenSystem.yuanShen } : {}),
        ...(shenSystem.jiShen ? { 忌神: shenSystem.jiShen } : {}),
        ...(shenSystem.chouShen ? { 仇神: shenSystem.chouShen } : {}),
      };
    }

    const recs = timeRecMap.get(group.targetLiuQin);
    if (recs?.length) {
      entry.应期提示 = recs.map((item) => ({
        触发: item.trigger,
        依据: item.basis || [],
        说明: item.description,
      }));
    }

    return entry;
  });

  return {
    卦盘: hexagramInfo,
    干支时间: ganZhiTime,
    六爻: yaos,
    用神分析: yongShenAnalysis,
    卦级分析: formatGuaLevelLines(result),
    提示: result.warnings || [],
    全局神煞: result.globalShenSha || [],
  };
}

export function renderLiuyaoAISafeJSON(
  result: LiuyaoOutput,
  options?: { detailLevel?: DetailLevel | 'safe' | 'facts' | 'debug' },
): LiuyaoAISafeJSON {
  const detailLevel = normalizeDetailLevel(options?.detailLevel);
  const raw = renderLiuyaoCanonicalJSON(result);

  const interactionSources = buildLiuyaoInteractionSources(result);
  const combinations: LiuyaoAISafeCombinationJSON[] = [];
  if (result.sanHeAnalysis?.banHe?.length) {
    for (const item of result.sanHeAnalysis.banHe) {
      combinations.push({
        类型: '半合',
        结果五行: item.result,
        参与者: buildBanHeParticipants(item.branches, interactionSources),
      });
    }
  }
  if (result.sanHeAnalysis?.fullSanHeList?.length) {
    for (const item of result.sanHeAnalysis.fullSanHeList) {
      combinations.push({
        类型: '三合',
        结果五行: item.result,
        名称: item.name,
        位置: item.positions?.map((position) => buildLiuyaoPositionLabel(position, result.fullYaos) || `${position}爻`) || [],
      });
    }
  }

  const transitions: LiuyaoAISafeJSON['全局互动']['冲合转换'] = [];
  if (result.chongHeTransition && (result.chongHeTransition.type === 'chong_to_he' || result.chongHeTransition.type === 'he_to_chong')) {
    transitions.push({ 类型: result.chongHeTransition.type === 'chong_to_he' ? '冲转合' : '合转冲' });
  }

  const resonances: LiuyaoAISafeJSON['全局互动']['反伏信息'] = [];
  if (result.guaFanFuYin?.isFuYin) resonances.push({ 类型: '伏吟' });
  if (result.guaFanFuYin?.isFanYin) resonances.push({ 类型: '反吟' });

  const payload: LiuyaoAISafeJSON = {
    卦盘: {
      ...(result.question ? { 问题: result.question } : {}),
      本卦: {
        卦名: result.hexagramName,
        卦宫: result.hexagramGong,
        五行: result.hexagramElement,
        ...(result.guaCi ? { 卦辞: result.guaCi } : {}),
      },
      ...(result.changedHexagramName
        ? {
            变卦: {
              卦名: result.changedHexagramName,
              ...(result.changedHexagramGong ? { 卦宫: result.changedHexagramGong } : {}),
              ...(result.changedHexagramElement ? { 五行: result.changedHexagramElement } : {}),
              ...(result.changedGuaCi ? { 卦辞: result.changedGuaCi } : {}),
              动爻: (result.fullYaos || [])
                .filter((item) => item.isChanging)
                .map((yao) => traditionalYaoName(yao.position, yao.type)),
              ...(((result.fullYaos || [])
                .filter((item) => item.isChanging && item.yaoCi)
                .map((yao) => ({ 爻名: traditionalYaoName(yao.position, yao.type), 爻辞: yao.yaoCi! }))).length > 0
                ? {
                    动爻爻辞: (result.fullYaos || [])
                      .filter((item) => item.isChanging && item.yaoCi)
                      .map((yao) => ({ 爻名: traditionalYaoName(yao.position, yao.type), 爻辞: yao.yaoCi! })),
                  }
                : {}),
            },
          }
        : {}),
      干支时间: raw.干支时间,
    },
    六爻全盘: {
      爻列表: buildLiuyaoAISafeBoardLines(result, detailLevel),
    },
    全局互动: {
      组合关系: combinations,
      ...(detailLevel === 'full' && transitions.length > 0 ? { 冲合转换: transitions } : {}),
      ...(detailLevel === 'full' && resonances.length > 0 ? { 反伏信息: resonances } : {}),
      ...(detailLevel === 'full' ? { 是否六冲卦: result.liuChongGuaInfo?.isLiuChongGua ? '是' : '否' } : {}),
      ...(detailLevel === 'full' ? { 是否六合卦: result.liuHeGuaInfo?.isLiuHeGua ? '是' : '否' } : {}),
      ...(detailLevel === 'full' && result.chongHeTransition && result.chongHeTransition.type !== 'none'
        ? { 冲合趋势: result.chongHeTransition.type === 'chong_to_he' ? '冲转合' : '合转冲' }
        : {}),
    },
    元信息: {
      细节级别: detailLevel === 'default' ? '默认' : detailLevel === 'more' ? '扩展' : '完整',
    },
  };

  if (detailLevel === 'more' || detailLevel === 'full') {
    if (result.guaShen) {
      payload.卦盘.卦身 = {
        地支: result.guaShen.branch,
        ...(result.guaShen.linePosition ? { 位置: buildLiuyaoPositionLabel(result.guaShen.linePosition, result.fullYaos) } : {}),
        ...(result.guaShen.absent ? { 状态: '飞伏' } : {}),
      };
    }
    if (result.nuclearHexagram || result.oppositeHexagram || result.reversedHexagram) {
      payload.卦盘.衍生卦 = {
        ...(result.nuclearHexagram ? { 互卦: { 卦名: result.nuclearHexagram.name } } : {}),
        ...(result.oppositeHexagram ? { 错卦: { 卦名: result.oppositeHexagram.name } } : {}),
        ...(result.reversedHexagram ? { 综卦: { 卦名: result.reversedHexagram.name } } : {}),
      };
    }
    if (result.globalShenSha?.length) {
      payload.卦盘.全局神煞 = [...result.globalShenSha];
    }
  }

  return payload;
}

// ===== 塔罗 =====

export function renderTarotCanonicalJSON(
  result: TarotOutput,
  options: TarotCanonicalTextOptions = {},
): TarotCanonicalJSON {
  const basicInfo: TarotCanonicalJSON['basicInfo'] = { spreadName: result.spreadName };
  if (result.question) basicInfo.question = result.question;
  if (options.birthDate?.trim()) basicInfo.birthDate = options.birthDate.trim();

  const cards = result.cards.map((card) => {
    const isReversed = card.orientation === 'reversed';
    const entry: TarotCanonicalJSON['cards'][number] = {
      position: card.position,
      cardName: card.card.nameChinese,
      direction: isReversed ? '逆位' : '正位',
      keywords: isReversed && card.reversedKeywords?.length ? card.reversedKeywords : card.card.keywords,
      meaning: card.meaning,
    };
    if (card.element) entry.element = card.element;
    if (card.astrologicalCorrespondence) entry.astrologicalCorrespondence = card.astrologicalCorrespondence;
    return entry;
  });

  const json: TarotCanonicalJSON = { basicInfo, cards };

  if (result.numerology) {
    json.numerology = {
      personalityCard: {
        name: result.numerology.personalityCard.nameChinese,
        keywords: result.numerology.personalityCard.keywords || [],
        element: result.numerology.personalityCard.element,
        astrologicalCorrespondence: result.numerology.personalityCard.astrologicalCorrespondence,
      },
      soulCard: {
        name: result.numerology.soulCard.nameChinese,
        keywords: result.numerology.soulCard.keywords || [],
        element: result.numerology.soulCard.element,
        astrologicalCorrespondence: result.numerology.soulCard.astrologicalCorrespondence,
      },
      yearlyCard: {
        year: result.numerology.yearlyCard.year!,
        name: result.numerology.yearlyCard.nameChinese,
        keywords: result.numerology.yearlyCard.keywords || [],
        element: result.numerology.yearlyCard.element,
        astrologicalCorrespondence: result.numerology.yearlyCard.astrologicalCorrespondence,
      },
    };
  }

  return json;
}

// ===== 紫微 =====

export function renderZiweiCanonicalJSON(
  result: ZiweiOutput,
  options: ZiweiCanonicalTextOptions = {},
): ZiweiCanonicalJSON {
  const detailLevel = normalizeZiweiDetailLevel(options.detailLevel);
  const basicInfo: ZiweiCanonicalJSON['基本信息'] = {
    阳历: result.solarDate,
    农历: formatZiweiCanonicalLunarDate(result) || result.lunarDate,
    四柱: `${result.fourPillars.year.gan}${result.fourPillars.year.zhi} ${result.fourPillars.month.gan}${result.fourPillars.month.zhi} ${result.fourPillars.day.gan}${result.fourPillars.day.zhi} ${result.fourPillars.hour.gan}${result.fourPillars.hour.zhi}`,
    命主: result.soul,
    身主: result.body,
    五行局: result.fiveElement,
  };
  if (result.gender === 'male' || result.gender === 'female') {
    basicInfo.性别 = result.gender === 'male' ? '男' : '女';
  }
  const birthYearMutagens = buildZiweiBirthYearMutagensJSON(result);
  if (birthYearMutagens) basicInfo.生年四化 = birthYearMutagens;
  if (detailLevel === 'full') {
    if (result.time) basicInfo.时辰 = result.time + (result.timeRange ? `（${result.timeRange}）` : '');
    if (result.douJun) basicInfo.斗君 = result.douJun;
    if (result.lifeMasterStar) basicInfo.命主星 = result.lifeMasterStar;
    if (result.bodyMasterStar) basicInfo.身主星 = result.bodyMasterStar;
    if (result.trueSolarTimeInfo) basicInfo.真太阳时 = buildZiweiTrueSolarTimeJSON(result.trueSolarTimeInfo);
  }

  const palaces = sortZiweiPalaces(result.palaces).map((palace) => {
    const base = {
      宫位: palace.name,
      干支: `${palace.heavenlyStem}${palace.earthlyBranch}`,
      是否身宫: palace.isBodyPalace ? '是' as const : '否' as const,
      是否来因宫: palace.isOriginalPalace ? '是' as const : '否' as const,
      主星及四化: palace.majorStars.map(buildZiweiStarJSON),
      辅星: palace.minorStars.map(buildZiweiStarJSON),
      大限: palace.decadalRange ? `${palace.decadalRange[0]}~${palace.decadalRange[1]}` : undefined,
    };
    if (detailLevel !== 'full') {
      return base;
    }
    const shensha = [palace.changsheng12, palace.boshi12, palace.jiangqian12, palace.suiqian12].filter(Boolean) as string[];
    return {
      ...base,
      宫位索引: palace.index,
      杂曜: (palace.adjStars || []).map(buildZiweiStarJSON),
      神煞: shensha,
      流年虚岁: palace.liuNianAges || [],
      小限虚岁: palace.ages || [],
    };
  });

  const json: ZiweiCanonicalJSON = { 基本信息: basicInfo, 十二宫位: palaces };
  if (detailLevel === 'full' && result.smallLimit?.length) {
    json.小限 = result.smallLimit.map((item) => ({
      宫位: item.palaceName,
      虚岁: item.ages,
    }));
  }
  return json;
}

// ===== 奇门遁甲 =====

function buildQimenPalaceStatusList(palace: QimenOutput['palaces'][number], dayKongPalaces: Set<number>, hourKongPalaces: Set<number>): string[] {
  if (palace.palaceIndex === 5) return ['寄宫参看对应宫位'];
  return [
    dayKongPalaces.has(palace.palaceIndex) ? '日空' : null,
    hourKongPalaces.has(palace.palaceIndex) ? '时空' : null,
    palace.isYiMa ? '驿马' : null,
    palace.isRuMu ? '入墓' : null,
  ].filter((value): value is string => !!value);
}

function buildQimenPalaceRef(result: QimenOutput, index: number): string {
  const palace = result.palaces[index - 1];
  return palace ? `${palace.palaceName}${index}` : String(index);
}

export function renderQimenCanonicalJSON(result: QimenOutput, options: { detailLevel?: QimenCanonicalTextOptions['detailLevel'] } = {}): QimenCanonicalJSON {
  const detailLevel = normalizeQimenDetailLevel(options.detailLevel);
  const dunText = result.dunType === 'yang' ? '阳遁' : '阴遁';
  const basicInfo: QimenCanonicalJSON['基本信息'] = {
    四柱: `${result.siZhu.year} ${result.siZhu.month} ${result.siZhu.day} ${result.siZhu.hour}`,
    节气: result.dateInfo.solarTerm,
    局式: `${dunText}${result.juNumber}局`,
    三元: result.yuan,
    旬首: result.xunShou,
    值符: result.zhiFu.star,
    值使: result.zhiShi.gate,
  };
  if (result.question) basicInfo.占问 = result.question;
  if (detailLevel === 'full') {
    basicInfo.公历 = result.dateInfo.solarDate;
    basicInfo.农历 = result.dateInfo.lunarDate;
    if (result.dateInfo.solarTermRange) basicInfo.节气范围 = result.dateInfo.solarTermRange;
    basicInfo.盘式 = result.panType;
    basicInfo.定局法 = result.juMethod;
  }

  const dayKongPalaces = new Set(result.kongWang.dayKong.palaces);
  const hourKongPalaces = new Set(result.kongWang.hourKong.palaces);

  const palaces = result.palaces.map((palace) => {
    const item: QimenCanonicalJSON['九宫盘'][number] = {
      宫名: palace.palaceName,
      宫位序号: palace.palaceIndex,
      宫位: `${palace.palaceName}${palace.palaceIndex}`,
      宫位五行: palace.element || '-',
      八神: palace.deity || '-',
      九星: palace.star || '-',
      ...(palace.starElement ? { 九星五行: palace.starElement } : {}),
      八门: palace.gate || '-',
      ...(palace.gateElement ? { 八门五行: palace.gateElement } : {}),
      天盘天干: palace.heavenStem || '-',
      地盘天干: palace.earthStem || '-',
      宫位状态: buildQimenPalaceStatusList(palace, dayKongPalaces, hourKongPalaces),
    };
    if (detailLevel === 'full') {
      item.方位 = palace.direction || '-';
      if (palace.formations.length > 0) item.格局 = [...palace.formations];
      if (palace.elementState) item.宫旺衰 = palace.elementState;
      if (palace.heavenStemElement) item.天盘天干五行 = palace.heavenStemElement;
      if (palace.earthStemElement) item.地盘天干五行 = palace.earthStemElement;
    }
    return item;
  });

  const json: QimenCanonicalJSON = {
    基本信息: basicInfo,
    九宫盘: palaces,
  };
  if (detailLevel === 'full') {
    json.空亡信息 = {
      日空: {
        地支: [...result.kongWang.dayKong.branches],
        宫位: result.kongWang.dayKong.palaces.map((index) => buildQimenPalaceRef(result, index)),
      },
      时空: {
        地支: [...result.kongWang.hourKong.branches],
        宫位: result.kongWang.hourKong.palaces.map((index) => buildQimenPalaceRef(result, index)),
      },
    };
    if (result.yiMa.branch && result.yiMa.palace) {
      json.驿马 = {
        地支: result.yiMa.branch,
        宫位: buildQimenPalaceRef(result, result.yiMa.palace),
      };
    }
    if (result.monthPhase && Object.keys(result.monthPhase).length > 0) {
      json.十干月令旺衰 = { ...result.monthPhase };
    }
    if (result.globalFormations.length > 0) {
      json.全局格局 = [...result.globalFormations];
    }
  }

  return json;
}

// ===== 大六壬 =====

export function renderDaliurenCanonicalJSON(result: DaliurenOutput, options: { detailLevel?: DaliurenCanonicalTextOptions['detailLevel'] } = {}): DaliurenCanonicalJSON {
  const detailLevel = normalizeDaliurenDetailLevel(options.detailLevel);
  const basicInfo: DaliurenCanonicalJSON['基本信息'] = {
    占测时间: result.dateInfo.solarDate,
    昼夜: result.dateInfo.diurnal ? '昼占' : '夜占',
    四柱: result.dateInfo.bazi,
    课式: `${result.keName} / ${result.keTi.method}课`,
    月将: result.dateInfo.yueJiang,
    关键状态: {
      空亡: [...result.dateInfo.kongWang],
      驿马: result.dateInfo.yiMa,
      丁马: result.dateInfo.dingMa,
      天马: result.dateInfo.tianMa,
    },
  };
  if (result.question) basicInfo.占事 = result.question;
  if (detailLevel === 'full') {
    if (result.dateInfo.lunarDate) basicInfo.农历 = result.dateInfo.lunarDate;
    basicInfo.月将名称 = result.dateInfo.yueJiangName;
    if (result.benMing) basicInfo.本命 = result.benMing;
    if (result.xingNian) basicInfo.行年 = result.xingNian;
    if (result.keTi.extraTypes.length > 0) basicInfo.附加课体 = [...result.keTi.extraTypes];
  }

  const keLabels = ['一课 (干上)', '二课 (干阴)', '三课 (支上)', '四课 (支阴)'] as const;
  const keData = [result.siKe.yiKe, result.siKe.erKe, result.siKe.sanKe, result.siKe.siKe];
  const siKe = keLabels.map((label, i) => ({
    课别: label,
    乘将: keData[i][1] || '-',
    上神: keData[i][0]?.[0] || '-',
    下神: keData[i][0]?.[1] || '-',
  }));

  const chuanLabels = ['初传 (发端)', '中传 (移易)', '末传 (归计)'] as const;
  const chuanData = [result.sanChuan.chu, result.sanChuan.zhong, result.sanChuan.mo];
  const sanChuan = chuanLabels.map((label, i) => ({
    传序: label,
    地支: chuanData[i][0] || '-',
    天将: chuanData[i][1] || '-',
    六亲: chuanData[i][2] || '-',
    遁干: chuanData[i][3] || '-',
  }));

  const gongInfos = result.gongInfos.map((item) => ({
    地盘: item.diZhi,
    ...(item.wuXing ? { 五行: item.wuXing } : {}),
    ...(item.wangShuai ? { 旺衰: item.wangShuai } : {}),
    天盘: item.tianZhi,
    天将: item.tianJiang,
    遁干: item.dunGan || '-',
    长生十二神: item.changSheng || '-',
    ...(detailLevel === 'full' ? { 建除: item.jianChu || '-' } : {}),
  }));

  return {
    基本信息: basicInfo,
    四课: siKe,
    三传: sanChuan,
    天地盘: gongInfos,
  };
}

// ===== 每日运势 =====

export function renderFortuneCanonicalJSON(result: FortuneOutput): FortuneCanonicalJSON {
  const { date, dayInfo, tenGod, almanac } = result;

  const json: FortuneCanonicalJSON = {
    basicInfo: {
      date,
      dayGanZhi: dayInfo.ganZhi,
      tenGod: tenGod ?? '-',
    },
    almanac: {
      lunarDate: almanac.lunarDate || `${almanac.lunarMonth}${almanac.lunarDay}`,
      zodiac: almanac.zodiac,
      suitable: almanac.suitable,
      avoid: almanac.avoid,
      jishen: almanac.jishen || [],
      xiongsha: almanac.xiongsha || [],
    },
  };

  if (almanac.solarTerm) json.almanac.solarTerm = almanac.solarTerm;
  if (almanac.chongSha) json.almanac.chongSha = almanac.chongSha;
  if (almanac.pengZuBaiJi) json.almanac.pengZuBaiJi = almanac.pengZuBaiJi;
  if (almanac.taiShen) json.almanac.taiShen = almanac.taiShen;
  if (almanac.dayNineStar) {
    json.almanac.dayNineStar = {
      description: almanac.dayNineStar.description,
      position: almanac.dayNineStar.position,
    };
  }

  return json;
}

// ===== 大运 =====

export function renderDayunCanonicalJSON(result: DayunOutput, options: { detailLevel?: BaziCanonicalTextOptions['detailLevel'] } = {}): DayunCanonicalJSON {
  const detailLevel = normalizeBaziDetailLevel(options.detailLevel);
  const json: DayunCanonicalJSON = {
    起运信息: {
      起运年龄: result.startAge,
      起运详情: result.startAgeDetail,
    },
    大运列表: result.list.map((item) => buildDayunItemJSON({
      startYear: item.startYear,
      startAge: item.startAge,
      ganZhi: item.ganZhi,
      stem: detailLevel === 'full' ? item.stem : undefined,
      branch: detailLevel === 'full' ? item.branch : undefined,
      tenGod: item.tenGod,
      branchTenGod: detailLevel === 'full' ? item.branchTenGod : undefined,
      hiddenStems: detailLevel === 'full' ? item.hiddenStems : buildLeanHiddenStemItems(item.hiddenStems),
      diShi: detailLevel === 'full' ? item.diShi : undefined,
      naYin: detailLevel === 'full' ? item.naYin : undefined,
      shenSha: detailLevel === 'full' ? item.shenSha : undefined,
      branchRelations: detailLevel === 'full' ? item.branchRelations : undefined,
      liunianList: detailLevel === 'full' ? item.liunianList : undefined,
    })),
  };

  if (detailLevel === 'full' && result.xiaoYun.length > 0) {
    json.小运 = result.xiaoYun.map((item) => ({
      年龄: item.age,
      干支: item.ganZhi,
      十神: item.tenGod,
    }));
  }

  return json;
}

// ===== 四柱反推 =====

export function renderBaziPillarsResolveCanonicalJSON(
  result: BaziPillarsResolveOutput,
): BaziPillarsResolveCanonicalJSON {
  return {
    originalPillars: { ...result.pillars },
    count: result.count,
    candidates: result.candidates.map((c) => ({
      candidateId: c.candidateId,
      lunarText: c.lunarText,
      solarText: c.solarText,
      birthTime: `${c.birthHour}:${String(c.birthMinute).padStart(2, '0')}`,
      isLeapMonth: c.isLeapMonth,
    })),
  };
}

// ===== 紫微运限 =====

export function renderZiweiHoroscopeCanonicalJSON(
  result: ZiweiHoroscopeOutput,
  options: { detailLevel?: ZiweiHoroscopeCanonicalTextOptions['detailLevel'] } = {},
): ZiweiHoroscopeCanonicalJSON {
  const detailLevel = normalizeZiweiHoroscopeDetailLevel(options.detailLevel);
  const parsedTargetDate = (() => {
    const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/u.exec(result.targetDate.trim());
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    return {
      year,
      month,
      day,
      lunarMonthLabel: `农历${Solar.fromYmd(year, month, day).getLunar().getMonthInChinese()}月`,
    };
  })();
  const zodiacMap: Record<string, string> = {
    子: '鼠', 丑: '牛', 寅: '虎', 卯: '兔', 辰: '龙', 巳: '蛇',
    午: '马', 未: '羊', 申: '猴', 酉: '鸡', 戌: '狗', 亥: '猪',
  };
  const mutagenOrder = ['禄', '权', '科', '忌'] as const;
  const formatTimeNote = (layer: '大限' | '流年' | '小限' | '流月' | '流日' | '流时'): string => {
    switch (layer) {
      case '大限':
        if (typeof result.decadal.startAge === 'number' && typeof result.decadal.endAge === 'number') {
          return `虚岁 ${result.decadal.startAge}~${result.decadal.endAge}`;
        }
        return '-';
      case '流年': {
        const fallbackYear = Number(result.targetDate.slice(0, 4));
        const year = typeof parsedTargetDate?.year === 'number'
          ? parsedTargetDate.year
          : (Number.isFinite(fallbackYear) ? fallbackYear : 0);
        const zodiac = zodiacMap[result.yearly.earthlyBranch] || '';
        return zodiac ? `${year}年 (${zodiac}年)` : `${year}年`;
      }
      case '小限':
        return `虚岁 ${result.age.nominalAge}`;
      case '流月':
        return parsedTargetDate?.lunarMonthLabel || '-';
      case '流日':
        return parsedTargetDate ? `${parsedTargetDate.day}日` : '-';
      case '流时':
        return result.hourly.earthlyBranch ? `${result.hourly.earthlyBranch}时` : '-';
      default:
        return '-';
    }
  };
  const formatMutagen = (stars: string[]) => mutagenOrder
    .map((mutagen, index) => stars[index] ? `${stars[index]}[化${mutagen}]` : null)
    .filter((value): value is string => !!value);
  const transitGroups = (() => {
    const entries = result.transitStars || [];
    const formatPalace = (palaceName: string) => palaceName.endsWith('宫') ? palaceName : `${palaceName}宫`;
    const pick = (names: string[]) => entries.filter((entry) => names.includes(entry.starName)).map((entry) => `${entry.starName}(${formatPalace(entry.palaceName)})`);
    return {
      吉星分布: pick(['流禄', '流魁', '流钺', '流马']),
      煞星分布: pick(['流羊', '流陀']),
      '桃花/文星': pick(['流昌', '流曲', '流鸾', '流喜']),
    };
  })();
  const periodEntries = [
    { layer: '大限' as const, data: result.decadal },
    { layer: '流年' as const, data: result.yearly },
    { layer: '小限' as const, data: result.age },
    { layer: '流月' as const, data: result.monthly },
    { layer: '流日' as const, data: result.daily },
    ...(detailLevel === 'full' && result.hasExplicitTargetTime && result.hourly.heavenlyStem && result.hourly.earthlyBranch
      ? [{ layer: '流时' as const, data: result.hourly }]
      : []),
  ];

  const json: ZiweiHoroscopeCanonicalJSON = {
    基本信息: {
      目标日期: result.targetDate,
      五行局: result.fiveElement,
    },
    运限叠宫: periodEntries.map(({ layer, data }) => {
      const entry: ZiweiHoroscopeCanonicalJSON['运限叠宫'][number] = {
        层次: layer,
        时间段备注: formatTimeNote(layer),
        宫位索引: data.index,
        干支: `${data.heavenlyStem}${data.earthlyBranch}`,
        落入本命宫位: data.palaceNames[0] ? `${data.palaceNames[0]}宫` : '-',
        运限四化: formatMutagen(data.mutagen),
      };
      if (detailLevel === 'full' && data.palaceNames.length > 0) entry.十二宫重排 = [...data.palaceNames];
      return entry;
    }),
  };
  if (detailLevel === 'full') {
    json.基本信息.阳历 = result.solarDate;
    json.基本信息.农历 = result.lunarDate;
    json.基本信息.命主 = result.soul;
    json.基本信息.身主 = result.body;
  }

  if (transitGroups.吉星分布.length || transitGroups.煞星分布.length || transitGroups['桃花/文星'].length) {
    json.流年星曜 = transitGroups;
  }

  if (detailLevel === 'full' && result.yearlyDecStar) {
    if (result.yearlyDecStar.suiqian12.length) json.岁前十二星 = result.yearlyDecStar.suiqian12;
    if (result.yearlyDecStar.jiangqian12.length) json.将前十二星 = result.yearlyDecStar.jiangqian12;
  }

  return json;
}

// ===== 紫微飞星 =====

function mapZiweiFlyingStarQueryType(type: string): string {
  switch (type) {
    case 'fliesTo':
      return '飞化判断';
    case 'selfMutaged':
      return '自化判断';
    case 'mutagedPlaces':
      return '四化落宫';
    case 'surroundedPalaces':
      return '三方四正';
    default:
      return type;
  }
}

export function renderZiweiFlyingStarCanonicalJSON(
  result: ZiweiFlyingStarOutput,
): ZiweiFlyingStarCanonicalJSON {
  const formatPalace = (name: string | null | undefined) => {
    if (!name) return null;
    return name.endsWith('宫') ? name : `${name}宫`;
  };

  return {
    查询结果: result.results.map((r) => {
      const entry: ZiweiFlyingStarResultJSON = {
        查询序号: r.queryIndex + 1,
        查询类型: mapZiweiFlyingStarQueryType(r.type),
      };

      if (r.type === 'fliesTo') {
        if (r.queryTarget?.fromPalace && r.queryTarget?.toPalace && r.queryTarget?.mutagens?.length) {
          entry.判断目标 = `${formatPalace(r.queryTarget.fromPalace)} -> ${formatPalace(r.queryTarget.toPalace)} [${r.queryTarget.mutagens.join('、')}]`;
        }
        entry.结果 = (r.result as boolean) ? '是' : '否';
        if (r.actualFlights?.length) {
          entry.实际飞化 = r.actualFlights.map((item) => ({
            四化: item.mutagen,
            宫位: formatPalace(item.targetPalace),
            ...(item.starName ? { 星曜: item.starName } : {}),
          }));
        }
      } else if (r.type === 'selfMutaged') {
        if (r.queryTarget?.palace && r.queryTarget?.mutagens?.length) {
          entry.判断目标 = `${formatPalace(r.queryTarget.palace)} [${r.queryTarget.mutagens.join('、')}]`;
        }
        entry.结果 = (r.result as boolean) ? '是' : '否';
      } else if (r.type === 'mutagedPlaces') {
        if (r.queryTarget?.palace) entry.发射宫位 = formatPalace(r.queryTarget.palace);
        if (r.sourcePalaceGanZhi) entry.发射宫干支 = r.sourcePalaceGanZhi;
        const flights = r.actualFlights || (r.result as MutagedPlaceInfo[]).map((item) => ({
          mutagen: item.mutagen,
          targetPalace: item.targetPalace,
          starName: null,
        }));
        entry.四化落宫 = flights.map((p) => ({
          四化: p.mutagen,
          宫位: formatPalace(p.targetPalace),
          ...(p.starName ? { 星曜: p.starName } : {}),
        }));
      } else if (r.type === 'surroundedPalaces') {
        const s = r.result as SurroundedPalaceInfo;
        entry.本宫 = formatPalace(s.target.name);
        entry.矩阵宫位 = {
          对宫: formatPalace(s.opposite.name) || '-',
          三合1: formatPalace(s.wealth.name) || '-',
          三合2: formatPalace(s.career.name) || '-',
        };
      }

      return entry;
    }),
  };
}
