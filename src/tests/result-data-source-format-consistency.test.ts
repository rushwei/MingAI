import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-anon';

test('tarot data source formatForAI should reuse canonical reading text', async () => {
  const { tarotProvider } = await import('../lib/data-sources/tarot');
  const { generateTarotReadingText } = await import('../lib/divination/tarot');

  const row = {
    id: 'tarot-1',
    user_id: 'user-1',
    spread_id: 'three-card',
    question: '我该怎么做',
    cards: [
      { name: '愚者', orientation: 'upright', position: 1 },
      { name: '恋人', orientation: 'upright', position: 2 },
      { name: '力量', orientation: 'reversed', position: 3 },
    ],
    metadata: { seed: 'seed-1', birthDate: '1990-01-01', numerology: null },
    created_at: '2026-03-25T00:00:00.000Z',
    conversation_id: null,
  };

  assert.equal(
    tarotProvider.formatForAI(row as never),
    generateTarotReadingText({
      spreadName: '三牌阵',
      spreadId: 'three-card',
      question: row.question,
      cards: row.cards,
      seed: 'seed-1',
      numerology: null,
      birthDate: '1990-01-01',
    }),
  );
});

test('qimen data source formatForAI should reuse canonical qimen text', async () => {
  const { qimenProvider } = await import('../lib/data-sources/qimen');
  const { generateQimenResultText } = await import('../lib/divination/qimen-shared');

  const row = {
    id: 'qimen-1',
    user_id: 'user-1',
    question: '项目会顺利吗',
    dun_type: 'yang',
    ju_number: 3,
    chart_data: {
      solarDate: '2026-03-25 10:00',
      lunarDate: '二月初七',
      fourPillars: { year: '甲辰', month: '丁卯', day: '己亥', hour: '己巳' },
      dunType: 'yang',
      juNumber: 3,
      xunShou: '甲子',
      yuan: '上元',
      zhiFu: '天蓬',
      zhiFuPalace: 1,
      zhiShi: '休门',
      zhiShiPalace: 1,
      solarTerm: '春分',
      solarTermRange: '2026-03-20 ~ 2026-04-03',
      panTypeLabel: '转盘',
      juMethodLabel: '拆补',
      palaces: [],
      monthPhase: {},
      kongWang: {
        dayKong: { branches: ['辰', '巳'], palaces: [4, 9] },
        hourKong: { branches: ['午', '未'], palaces: [2, 7] },
      },
      yiMa: { branch: '申', palace: 6 },
      globalFormations: [],
    },
    created_at: '2026-03-25T00:00:00.000Z',
  };

  assert.equal(
    qimenProvider.formatForAI(row as never),
    generateQimenResultText({
      ...row.chart_data,
      question: row.question,
    } as never),
  );
});

test('daliuren data source formatForAI should reuse canonical daliuren text', async () => {
  const { daliurenProvider } = await import('../lib/data-sources/daliuren');
  const { generateDaliurenResultText } = await import('../lib/divination/daliuren');

  const row = {
    id: 'daliuren-1',
    user_id: 'user-1',
    question: '出行如何',
    solar_date: '2026-03-25',
    day_ganzhi: '甲子',
    hour_ganzhi: '丙寅',
    yue_jiang: '申',
    result_data: {
      dateInfo: {
        solarDate: '2026-03-25 09:00',
        lunarDate: '二月初七',
        bazi: '甲辰 丁卯 己亥 甲子',
        ganZhi: { year: '甲辰', month: '丁卯', day: '己亥', hour: '甲子' },
        yueJiang: '申',
        yueJiangName: '传送',
        xun: '甲子旬',
        kongWang: ['戌', '亥'],
        yiMa: '申',
        dingMa: '未',
        tianMa: '午',
        diurnal: true,
      },
      tianDiPan: {
        diPan: {},
        tianPan: {},
        tianJiang: {},
      },
      siKe: {
        yiKe: ['子', '贵'],
        erKe: ['丑', '蛇'],
        sanKe: ['寅', '雀'],
        siKe: ['卯', '合'],
      },
      sanChuan: {
        chu: ['子', '贵', '兄弟', '甲'],
        zhong: ['丑', '蛇', '子孙', '乙'],
        mo: ['寅', '雀', '妻财', '丙'],
        method: '涉害',
      },
      keTi: {
        method: '涉害',
        subTypes: ['见机'],
        extraTypes: [],
      },
      keName: '涉害课',
      shenSha: [],
      gongInfos: [],
      dunGan: {},
      jianChu: {},
      question: '出行如何',
    },
    settings: null,
    conversation_id: null,
    created_at: '2026-03-25T00:00:00.000Z',
  };

  assert.equal(
    daliurenProvider.formatForAI(row as never),
    generateDaliurenResultText(row.result_data as never),
  );
});

test('liuyao data source formatForAI should reuse traditional copy text path when analysis data is complete', async () => {
  const { liuyaoProvider } = await import('../lib/data-sources/liuyao');
  const { buildTraditionalInfo } = await import('../lib/divination/liuyao-format-utils');
  const { findHexagram } = await import('../lib/divination/liuyao');

  const row = {
    id: 'liuyao-1',
    user_id: 'user-1',
    question: '工作会顺利吗',
    hexagram_code: '101010',
    changed_hexagram_code: '101110',
    changed_lines: [3],
    yongshen_targets: ['官鬼'],
    created_at: '2026-03-25T00:00:00.000Z',
    conversation_id: null,
  };

  const yaos = row.hexagram_code.split('').map((value, index) => ({
    type: parseInt(value, 10) as 0 | 1,
    change: row.changed_lines.includes(index + 1) ? 'changing' as const : 'stable' as const,
    position: index + 1,
  }));

  assert.equal(
    liuyaoProvider.formatForAI(row as never),
    buildTraditionalInfo(
      yaos,
      row.hexagram_code,
      row.changed_hexagram_code,
      row.question,
      new Date(row.created_at),
      ['官鬼'],
      findHexagram(row.hexagram_code)!,
      findHexagram(row.changed_hexagram_code)!,
    ),
  );
});

test('hepan data source formatForAI should match saved analysis structure instead of raw JSON dump', async () => {
  const { hepanProvider } = await import('../lib/data-sources/hepan');

  const row = {
    id: 'hepan-1',
    user_id: 'user-1',
    type: 'love',
    person1_name: '甲',
    person1_birth: {},
    person2_name: '乙',
    person2_birth: {},
    compatibility_score: 86,
    created_at: '2026-03-25T00:00:00.000Z',
    conversation_id: null,
    result_data: {
      type: 'love',
      overallScore: 86,
      person1: { name: '甲', year: 1990, month: 1, day: 1 },
      person2: { name: '乙', year: 1991, month: 2, day: 2 },
      dimensions: [
        { name: '沟通', score: 90, description: '交流顺畅' },
      ],
      conflicts: [
        { severity: 'medium', title: '节奏差异', description: '需要多磨合' },
      ],
    },
  };

  const text = hepanProvider.formatForAI(row as never);
  assert.ok(text.includes('合盘类型：情侣合婚'));
  assert.ok(text.includes('综合契合度：86分'));
  assert.ok(text.includes('沟通: 90分 - 交流顺畅'));
  assert.ok(text.includes('[medium] 节奏差异: 需要多磨合'));
  assert.ok(!text.includes('结构化结果'));
});

test('mbti data source formatForAI should match saved analysis structure instead of raw percentage dump', async () => {
  const { mbtiProvider } = await import('../lib/data-sources/mbti');

  const row = {
    id: 'mbti-1',
    user_id: 'user-1',
    mbti_type: 'INTJ',
    scores: { I: 12, N: 15, T: 14, J: 13 },
    percentages: {
      EI: { E: 30, I: 70 },
      SN: { S: 20, N: 80 },
      TF: { T: 65, F: 35 },
      JP: { J: 60, P: 40 },
    },
    created_at: '2026-03-25T00:00:00.000Z',
    conversation_id: null,
  };

  const text = mbtiProvider.formatForAI(row as never);
  assert.ok(text.includes('类型名称：策略家'));
  assert.ok(text.includes('外向(E) 30% vs 内向(I) 70%'));
  assert.ok(text.includes('实感(S) 20% vs 直觉(N) 80%'));
  assert.ok(text.includes('思考(T) 65% vs 情感(F) 35%'));
  assert.ok(text.includes('判断(J) 60% vs 知觉(P) 40%'));
  assert.ok(!text.includes('比例：'));
});
