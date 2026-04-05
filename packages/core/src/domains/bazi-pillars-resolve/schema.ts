import type { ToolDefinition } from '../shared/tool-types.js';

export const baziPillarsResolveDefinition: ToolDefinition = {
  name: 'bazi_pillars_resolve',
  description: '四柱反推候选时间 - 输入年/月/日/时四柱，返回1900-2100范围内全部候选时间（候选主字段为农历，可直接用于农历排盘）',
  inputSchema: {
    type: 'object',
    properties: {
      yearPillar: { type: 'string', description: '年柱，2字干支（如“甲子”）' },
      monthPillar: { type: 'string', description: '月柱，2字干支（如“乙丑”）' },
      dayPillar: { type: 'string', description: '日柱，2字干支（如“丙寅”）' },
      hourPillar: { type: 'string', description: '时柱，2字干支（如“丁卯”）' },
      responseFormat: {
        type: 'string',
        enum: ['json', 'markdown'],
        description: '响应格式：json=结构化数据，markdown=人类可读文本',
        default: 'json',
      },
    },
    required: ['yearPillar', 'monthPillar', 'dayPillar', 'hourPillar'],
    examples: [
      { yearPillar: '甲子', monthPillar: '乙丑', dayPillar: '丙寅', hourPillar: '丁卯' },
      { yearPillar: '戊子', monthPillar: '庚丑', dayPillar: '辛卯', hourPillar: '癸巳' },
    ],
  },
  outputSchema: {
    type: 'object',
    properties: {
      pillars: {
        type: 'object',
        description: '原始四柱输入',
        properties: {
          yearPillar: { type: 'string' },
          monthPillar: { type: 'string' },
          dayPillar: { type: 'string' },
          hourPillar: { type: 'string' },
        },
      },
      count: { type: 'number', description: '候选总数' },
      candidates: {
        type: 'array',
        description: '候选出生时间',
        items: {
          type: 'object',
          properties: {
            candidateId: { type: 'string', description: '候选ID' },
            birthYear: { type: 'number', description: '农历出生年' },
            birthMonth: { type: 'number', description: '农历出生月' },
            birthDay: { type: 'number', description: '农历出生日' },
            birthHour: { type: 'number', description: '出生时' },
            birthMinute: { type: 'number', description: '出生分' },
            isLeapMonth: { type: 'boolean', description: '是否农历闰月' },
            solarText: { type: 'string', description: '公历可读文本' },
            lunarText: { type: 'string', description: '农历可读文本' },
            nextCall: {
              type: 'object',
              description: '下一步调用 bazi_calculate 的农历建议参数（需补 gender）',
              properties: {
                tool: { type: 'string', description: '工具名' },
                arguments: {
                  type: 'object',
                  properties: {
                    birthYear: { type: 'number', description: '农历出生年' },
                    birthMonth: { type: 'number', description: '农历出生月' },
                    birthDay: { type: 'number', description: '农历出生日' },
                    birthHour: { type: 'number' },
                    birthMinute: { type: 'number' },
                    calendarType: { type: 'string', enum: ['lunar'] },
                    isLeapMonth: { type: 'boolean', description: '是否农历闰月' },
                  },
                },
                missing: { type: 'array', items: { type: 'string' } },
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
