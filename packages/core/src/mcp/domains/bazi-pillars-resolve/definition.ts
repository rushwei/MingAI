import type { ToolDefinition } from '../../contract.js';

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
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
};
