import type { ToolDefinition } from '../shared/tool-types.js';

export const almanacDefinition: ToolDefinition = {
  name: 'almanac',
  description: '黄历查询 - 查询指定日期的干支、宜忌、冲煞、吉神凶煞、财喜福贵方位、建除十二值星、黄道黑道日(天神)、二十八星宿、日柱纳音、九宫飞星、彭祖百忌、胎神占方、十二时辰吉凶等完整黄历信息，可选传入日主计算流日十神',
  inputSchema: {
    type: 'object',
    properties: {
      dayMaster: {
        type: 'string',
        enum: ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'],
        description: '日主天干（如已知）',
      },
      birthYear: {
        type: 'number',
        description: '出生年（用于计算日主）',
      },
      birthMonth: {
        type: 'number',
        description: '出生月',
      },
      birthDay: {
        type: 'number',
        description: '出生日',
      },
      birthHour: {
        type: 'number',
        description: '出生时',
      },
      date: {
        type: 'string',
        description: '目标日期 (YYYY-MM-DD)，默认今天',
      },
      responseFormat: {
        type: 'string',
        enum: ['json', 'markdown'],
        description: '响应格式：json=结构化数据，markdown=人类可读文本',
        default: 'json',
      },
    },
    required: [],
    examples: [
      { birthYear: 1990, birthMonth: 1, birthDay: 15, birthHour: 9, date: '2026-02-14' },
      { dayMaster: '丙', date: '2026-02-14' },
    ],
  },
  outputSchema: {
    type: 'object',
    properties: {
      date: { type: 'string', description: '日期' },
      dayInfo: {
        type: 'object',
        description: '日干支',
        properties: {
          stem: { type: 'string', description: '天干' },
          branch: { type: 'string', description: '地支' },
          ganZhi: { type: 'string', description: '干支' },
        },
      },
      tenGod: { type: 'string', description: '流日十神' },
      almanac: {
        type: 'object',
        description: '黄历',
        properties: {
          lunarDate: { type: 'string', description: '农历日期' },
          lunarMonth: { type: 'string', description: '农历月份' },
          lunarDay: { type: 'string', description: '农历日' },
          zodiac: { type: 'string', description: '生肖' },
          solarTerm: { type: 'string', description: '节气（如有）' },
          suitable: { type: 'array', items: { type: 'string' }, description: '宜' },
          avoid: { type: 'array', items: { type: 'string' }, description: '忌' },
          chongSha: { type: 'string', description: '冲煞' },
          pengZuBaiJi: { type: 'string', description: '彭祖百忌' },
          jishen: { type: 'array', items: { type: 'string' }, description: '吉神宜趋' },
          xiongsha: { type: 'array', items: { type: 'string' }, description: '凶煞宜忌' },
          directions: {
            type: 'object',
            description: '方位',
            properties: {
              caiShen: { type: 'string', description: '财神方位' },
              xiShen: { type: 'string', description: '喜神方位' },
              fuShen: { type: 'string', description: '福神方位' },
              yangGui: { type: 'string', description: '阳贵人方位' },
              yinGui: { type: 'string', description: '阴贵人方位' },
            },
          },
          dayOfficer: { type: 'string', description: '建除十二值星' },
          tianShen: { type: 'string', description: '天神' },
          tianShenType: { type: 'string', description: '黄道/黑道' },
          tianShenLuck: { type: 'string', description: '吉/凶' },
          lunarMansion: { type: 'string', description: '二十八星宿' },
          lunarMansionLuck: { type: 'string', description: '星宿吉凶' },
          lunarMansionSong: { type: 'string', description: '星宿歌诀' },
          nayin: { type: 'string', description: '日柱纳音' },
          dayNineStar: {
            type: 'object',
            description: '日九宫飞星',
            properties: {
              number: { type: 'number', description: '飞星数字 (1-9)' },
              description: { type: 'string', description: '完整描述' },
              color: { type: 'string', description: '颜色' },
              wuXing: { type: 'string', description: '五行' },
              position: { type: 'string', description: '方位' },
            },
          },
          taiShen: { type: 'string', description: '胎神占方' },
          hourlyFortune: {
            type: 'array',
            description: '十二时辰吉凶',
            items: {
              type: 'object',
              properties: {
                ganZhi: { type: 'string', description: '时辰干支' },
                tianShen: { type: 'string', description: '时辰天神' },
                tianShenType: { type: 'string', description: '黄道/黑道' },
                tianShenLuck: { type: 'string', description: '吉/凶' },
                chong: { type: 'string', description: '冲' },
                sha: { type: 'string', description: '煞' },
                suitable: { type: 'array', items: { type: 'string' }, description: '宜' },
                avoid: { type: 'array', items: { type: 'string' }, description: '忌' },
              },
            },
          },
        },
      },
    },
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
};
export const fortuneDefinition = almanacDefinition;
