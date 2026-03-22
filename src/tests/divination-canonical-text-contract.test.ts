import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  formatBaziAsMarkdown,
  formatLiuyaoAsMarkdown,
  formatTarotAsMarkdown,
  formatZiweiAsMarkdown,
} from '../../packages/core/src/formatters';
import { calculateBazi, generateBaziChartText } from '@/lib/divination/bazi';
import { calculateZiwei, generateZiweiChartText } from '@/lib/divination/ziwei';
import { generateTarotReadingText } from '@/lib/divination/tarot';

const corePackagePath = resolve(process.cwd(), 'packages/core/package.json');
const coreTextPath = resolve(process.cwd(), 'packages/core/src/text.ts');
const coreFormatterPath = resolve(process.cwd(), 'packages/core/src/formatters.ts');
const baziLibPath = resolve(process.cwd(), 'src/lib/divination/bazi.ts');
const ziweiLibPath = resolve(process.cwd(), 'src/lib/divination/ziwei.ts');
const liuyaoTextPath = resolve(process.cwd(), 'src/lib/divination/liuyao-format-utils.ts');
const qimenTextPath = resolve(process.cwd(), 'src/lib/divination/qimen-shared.ts');
const daliurenTextPath = resolve(process.cwd(), 'src/lib/divination/daliuren.ts');
const tarotTextPath = resolve(process.cwd(), 'src/lib/divination/tarot.ts');

test('core should expose a browser-safe canonical text module for cross-end reuse', async () => {
  const [packageSource, textSource] = await Promise.all([
    readFile(corePackagePath, 'utf-8'),
    readFile(coreTextPath, 'utf-8'),
  ]);

  assert.match(packageSource, /"\.\/text"/u, 'core package should export a dedicated text subpath');
  assert.match(textSource, /renderBaziCanonicalText/u);
  assert.match(textSource, /renderZiweiCanonicalText/u);
  assert.match(textSource, /renderLiuyaoCanonicalText/u);
  assert.match(textSource, /renderDaliurenCanonicalText/u);
  assert.match(textSource, /renderQimenCanonicalText/u);
  assert.match(textSource, /renderTarotCanonicalText/u);
});

test('mcp markdown and web text helpers should delegate to the same core canonical text module', async () => {
  const [formatterSource, baziSource, ziweiSource, liuyaoSource, qimenSource, daliurenSource, tarotSource] = await Promise.all([
    readFile(coreFormatterPath, 'utf-8'),
    readFile(baziLibPath, 'utf-8'),
    readFile(ziweiLibPath, 'utf-8'),
    readFile(liuyaoTextPath, 'utf-8'),
    readFile(qimenTextPath, 'utf-8'),
    readFile(daliurenTextPath, 'utf-8'),
    readFile(tarotTextPath, 'utf-8'),
  ]);

  assert.match(formatterSource, /from '\.\/text\.js'/u);
  assert.match(baziSource, /@mingai\/core\/text/u);
  assert.match(ziweiSource, /@mingai\/core\/text/u);
  assert.match(liuyaoSource, /@mingai\/core\/text/u);
  assert.match(qimenSource, /@mingai\/core\/text/u);
  assert.match(daliurenSource, /@mingai\/core\/text/u);
  assert.match(tarotSource, /@mingai\/core\/text/u);
});

test('core and web bazi text should surface full true-solar metadata details', () => {
  const trueSolarTimeInfo = {
    clockTime: '23:40',
    trueSolarTime: '23:29',
    longitude: 73,
    correctionMinutes: -11,
    trueTimeIndex: 12,
    dayOffset: -1,
  };

  const markdown = formatBaziAsMarkdown({
    gender: 'male',
    birthPlace: '新疆',
    dayMaster: '甲',
    kongWang: { xun: '甲子', kongZhi: ['戌', '亥'] },
    fourPillars: {
      year: { stem: '甲', branch: '子', tenGod: '比肩', hiddenStems: [], naYin: '海中金', diShi: '沐浴', shenSha: [], kongWang: { isKong: false } },
      month: { stem: '乙', branch: '丑', tenGod: '劫财', hiddenStems: [], naYin: '海中金', diShi: '冠带', shenSha: [], kongWang: { isKong: false } },
      day: { stem: '甲', branch: '寅', hiddenStems: [], naYin: '大溪水', diShi: '临官', shenSha: [], kongWang: { isKong: false } },
      hour: { stem: '丙', branch: '子', tenGod: '食神', hiddenStems: [], naYin: '涧下水', diShi: '沐浴', shenSha: [], kongWang: { isKong: false } },
    },
    relations: [],
    tianGanWuHe: [],
    tianGanChongKe: [],
    diZhiBanHe: [],
    diZhiSanHui: [],
    trueSolarTimeInfo,
  });

  assert.match(markdown, /时辰索引|真太阳时索引/u, 'mcp bazi markdown should expose trueTimeIndex');
  assert.match(markdown, /跨日/u, 'mcp bazi markdown should expose dayOffset');

  const chart = calculateBazi({
    name: '测试',
    gender: 'male',
    birthYear: 1990,
    birthMonth: 1,
    birthDay: 1,
    birthHour: 12,
    birthMinute: 0,
    calendarType: 'solar',
  });
  chart.trueSolarTimeInfo = trueSolarTimeInfo;

  const text = generateBaziChartText(chart);
  assert.match(text, /时辰索引|真太阳时索引/u, 'web bazi copy text should expose trueTimeIndex');
  assert.match(text, /跨日/u, 'web bazi copy text should expose dayOffset');
});

test('core and web ziwei text should keep full age arrays instead of truncating them', () => {
  const markdown = formatZiweiAsMarkdown({
    solarDate: '1990-1-1',
    lunarDate: '1989-12-5',
    fourPillars: {
      year: { gan: '己', zhi: '巳' },
      month: { gan: '丙', zhi: '子' },
      day: { gan: '甲', zhi: '子' },
      hour: { gan: '甲', zhi: '子' },
    },
    soul: '廉贞',
    body: '天相',
    fiveElement: '金四局',
    zodiac: '蛇',
    sign: '摩羯座',
    palaces: [{
      name: '命宫',
      heavenlyStem: '甲',
      earthlyBranch: '子',
      isBodyPalace: false,
      majorStars: [],
      minorStars: [],
      ages: [101, 102, 103, 104, 105, 106],
      liuNianAges: [201, 202, 203, 204, 205, 206],
      sanFangSiZheng: ['财帛', '官禄', '迁移'],
    }],
    decadalList: [],
    time: '子时',
    timeRange: '23:00-00:59',
    trueSolarTimeInfo: {
      clockTime: '23:40',
      trueSolarTime: '23:29',
      longitude: 73,
      correctionMinutes: -11,
      trueTimeIndex: 12,
      dayOffset: -1,
    },
    smallLimit: [{ palaceName: '命宫', ages: [301, 302, 303, 304, 305, 306] }],
  });

  assert.match(markdown, /206/u, 'mcp ziwei markdown should keep full liuNian ages');
  assert.match(markdown, /106/u, 'mcp ziwei markdown should keep full smallLimit ages in dedicated column');
  assert.doesNotMatch(markdown, /\.\.\./u, 'mcp ziwei markdown should not use truncation markers');
  assert.match(markdown, /时辰索引|真太阳时索引/u, 'mcp ziwei markdown should expose trueTimeIndex');
  assert.match(markdown, /跨日/u, 'mcp ziwei markdown should expose dayOffset');

  const chart = calculateZiwei({
    name: '测试',
    gender: 'male',
    birthYear: 1990,
    birthMonth: 1,
    birthDay: 1,
    birthHour: 12,
    birthMinute: 0,
    calendarType: 'solar',
  });

  chart.trueSolarTimeInfo = {
    clockTime: '23:40',
    trueSolarTime: '23:29',
    longitude: 73,
    correctionMinutes: -11,
    trueTimeIndex: 12,
    dayOffset: -1,
  };
  chart.palaces[0].ages = [101, 102, 103, 104, 105, 106];
  chart.palaces[0].liuNianAges = [201, 202, 203, 204, 205, 206];
  chart.smallLimit = [{ palaceName: '命宫', ages: [301, 302, 303, 304, 305, 306] }];

  const text = generateZiweiChartText(chart);
  assert.match(text, /206/u, 'web ziwei copy text should keep full liuNian ages');
  assert.match(text, /106/u, 'web ziwei copy text should keep full smallLimit ages in dedicated column');
  assert.match(text, /时辰索引|真太阳时索引/u, 'web ziwei copy text should expose trueTimeIndex');
  assert.match(text, /跨日/u, 'web ziwei copy text should expose dayOffset');
});

test('web ziwei text should include horoscope block when caller explicitly requests it', () => {
  const chart = calculateZiwei({
    name: '测试',
    gender: 'male',
    birthYear: 1990,
    birthMonth: 1,
    birthDay: 1,
    birthHour: 12,
    birthMinute: 0,
    calendarType: 'solar',
  });

  const text = generateZiweiChartText(chart, { includeHoroscope: true });

  assert.match(text, /## 当前运限/u, 'web ziwei text should preserve the explicit horoscope block');
  assert.match(text, /当前大限|流年宫位|流月宫位|流日宫位/u, 'web ziwei text should surface current horoscope details');
});

test('core liuyao markdown should surface changedNaJia and huaType in yongshen analysis text', () => {
  const markdown = formatLiuyaoAsMarkdown({
    question: '测试问题',
    hexagramName: '乾为天',
    hexagramGong: '乾',
    hexagramElement: '金',
    ganZhiTime: {
      year: { gan: '甲', zhi: '子' },
      month: { gan: '乙', zhi: '丑' },
      day: { gan: '丙', zhi: '寅' },
      hour: { gan: '丁', zhi: '卯' },
      xun: '甲子',
    },
    kongWang: { xun: '甲子', kongDizhi: ['戌', '亥'] },
    kongWangByPillar: {
      year: { xun: '甲子', kongDizhi: ['戌', '亥'] },
      month: { xun: '甲子', kongDizhi: ['戌', '亥'] },
      day: { xun: '甲子', kongDizhi: ['戌', '亥'] },
      hour: { xun: '甲子', kongDizhi: ['戌', '亥'] },
    },
    fullYaos: [],
    yongShen: [{
      targetLiuQin: '官鬼',
      selectionStatus: 'from_changed',
      selectionNote: '变出取用',
      selected: {
        liuQin: '官鬼',
        naJia: '子',
        changedNaJia: '酉',
        huaType: '回头生',
        element: '水',
        position: 3,
        source: 'changed',
        strength: 'strong',
        strengthLabel: '旺相',
        movementState: 'changing',
        movementLabel: '明动',
        isShiYao: false,
        isYingYao: false,
        evidence: ['测试证据'],
      },
      candidates: [{
        liuQin: '官鬼',
        naJia: '子',
        changedNaJia: '酉',
        huaType: '回头生',
        element: '水',
        position: 3,
        source: 'changed',
        strength: 'strong',
        strengthLabel: '旺相',
        movementState: 'changing',
        movementLabel: '明动',
        isShiYao: false,
        isYingYao: false,
        evidence: ['测试证据'],
      }],
    }],
    shenSystemByYongShen: [],
    globalShenSha: [],
  });

  assert.match(markdown, /酉/u, 'mcp liuyao markdown should expose changedNaJia');
  assert.match(markdown, /回头生/u, 'mcp liuyao markdown should expose huaType');
});
