import test from 'node:test';
import assert from 'node:assert/strict';

import {
  renderBaziCanonicalText,
  renderBaziPillarsResolveCanonicalText,
  renderLiuyaoCanonicalText,
  renderZiweiFlyingStarCanonicalText,
  renderZiweiHoroscopeCanonicalText,
  renderZiweiCanonicalText,
} from '../../packages/core/src/text';
import { calculateBazi, generateBaziChartText } from '@/lib/divination/bazi';
import { calculateZiwei, generateZiweiChartText } from '@/lib/divination/ziwei';

test('specialized core canonical text renderers should cover non-mainline tools', () => {
  const pillarsText = renderBaziPillarsResolveCanonicalText({
    pillars: {
      yearPillar: '甲子',
      monthPillar: '乙丑',
      dayPillar: '丙寅',
      hourPillar: '丁卯',
    },
    count: 1,
    candidates: [{
      candidateId: 'cand-1',
      lunarText: '农历1990年正月初一',
      solarText: '1990-01-27',
      birthYear: 1990,
      birthMonth: 1,
      birthDay: 1,
      birthHour: 5,
      birthMinute: 30,
      isLeapMonth: false,
      nextCall: {
        tool: 'bazi_calculate',
        arguments: {
          birthYear: 1990,
          birthMonth: 1,
          birthDay: 1,
          birthHour: 5,
          birthMinute: 30,
          calendarType: 'lunar',
          isLeapMonth: false,
        },
        missing: ['gender'],
      },
    }],
  });
  assert.match(pillarsText, /四柱反推候选时间/u);
  assert.match(pillarsText, /候选 1/u);

  const horoscopeText = renderZiweiHoroscopeCanonicalText({
    solarDate: '1990-01-01',
    lunarDate: '1989-12-05',
    soul: '廉贞',
    body: '天相',
    fiveElement: '金四局',
    targetDate: '2026-03-22',
    decadal: { index: 0, name: '命宫', heavenlyStem: '甲', earthlyBranch: '子', mutagen: ['禄'], palaceNames: ['命宫'] },
    age: { index: 1, name: '兄弟', heavenlyStem: '乙', earthlyBranch: '丑', mutagen: [], palaceNames: ['兄弟'], nominalAge: 37 },
    yearly: { index: 2, name: '夫妻', heavenlyStem: '丙', earthlyBranch: '寅', mutagen: ['权'], palaceNames: ['夫妻'] },
    monthly: { index: 3, name: '子女', heavenlyStem: '丁', earthlyBranch: '卯', mutagen: [], palaceNames: ['子女'] },
    daily: { index: 4, name: '财帛', heavenlyStem: '戊', earthlyBranch: '辰', mutagen: [], palaceNames: ['财帛'] },
    hourly: { index: 5, name: '疾厄', heavenlyStem: '己', earthlyBranch: '巳', mutagen: [], palaceNames: ['疾厄'] },
    transitStars: [{ starName: '文昌', palaceName: '命宫' }],
    yearlyDecStar: { suiqian12: ['岁建'], jiangqian12: ['将星'] },
  });
  assert.match(horoscopeText, /紫微运限/u);
  assert.match(horoscopeText, /流年星曜|岁前十二星|将前十二星/u);

  const flyingStarText = renderZiweiFlyingStarCanonicalText({
    results: [
      { queryIndex: 0, type: 'fliesTo', result: true },
      { queryIndex: 1, type: 'mutagedPlaces', result: [{ mutagen: '禄', targetPalace: '财帛' }] },
    ],
  });
  assert.match(flyingStarText, /紫微飞星分析/u);
  assert.match(flyingStarText, /化禄|结果/u);
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

  const markdown = renderBaziCanonicalText({
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

test('ziwei full text should keep full age arrays instead of truncating them while default stays compact', () => {
  const markdown = renderZiweiCanonicalText({
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
  }, { detailLevel: 'full' });

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

  const defaultText = generateZiweiChartText(chart);
  assert.doesNotMatch(defaultText, /206/u, 'default web ziwei copy text should omit full liuNian age arrays');
  assert.doesNotMatch(defaultText, /106/u, 'default web ziwei copy text should omit full smallLimit age arrays');
  assert.doesNotMatch(defaultText, /时辰索引|真太阳时索引/u, 'default web ziwei copy text should keep true-solar detail compact');
  assert.doesNotMatch(defaultText, /跨日/u, 'default web ziwei copy text should keep true-solar detail compact');

  const text = generateZiweiChartText(chart, { detailLevel: 'full' });
  assert.match(text, /206/u, 'full web ziwei copy text should keep full liuNian ages');
  assert.match(text, /106/u, 'full web ziwei copy text should keep full smallLimit ages in dedicated column');
  assert.match(text, /时辰索引|真太阳时索引/u, 'full web ziwei copy text should expose trueTimeIndex');
  assert.match(text, /跨日/u, 'full web ziwei copy text should expose dayOffset');
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
  const markdown = renderLiuyaoCanonicalText({
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
