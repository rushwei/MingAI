import type { ToolDefinition } from '../../contract.js';

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
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
};
