import type { ToolDefinition } from '../../contract.js';

export const baziDayunDefinition: ToolDefinition = {
  name: 'bazi_dayun',
  description: '八字大运计算 - 根据出生时间计算完整大运列表，输出起运详情、各步大运干支/十神、大运与原局地支关系（六合/六冲/三合/相刑/相害）、每步大运10年流年干支/十神/纳音/太岁关系、流年与原局及大运地支关系、小运排列',
  inputSchema: {
    type: 'object',
    properties: {
      gender: { type: 'string', enum: ['male', 'female'], description: '性别' },
      birthYear: { type: 'number', description: '出生年 (1900-2100)' },
      birthMonth: { type: 'number', description: '出生月 (1-12)' },
      birthDay: { type: 'number', description: '出生日 (1-31)' },
      birthHour: { type: 'number', description: '出生时 (0-23)' },
      birthMinute: { type: 'number', description: '出生分 (0-59)，默认 0' },
      calendarType: { type: 'string', enum: ['solar', 'lunar'], description: '历法类型，默认 solar (阳历)' },
      isLeapMonth: { type: 'boolean', description: '是否闰月（仅农历有效），默认 false' },
      responseFormat: { type: 'string', enum: ['json', 'markdown'], description: '响应格式：json=结构化数据，markdown=人类可读文本', default: 'json' },
      detailLevel: {
        type: 'string',
        enum: ['default', 'full'],
        description: '输出细节级别：default=精简输出；full=完整输出',
        default: 'default',
      },
    },
    required: ['gender', 'birthYear', 'birthMonth', 'birthDay', 'birthHour'],
    examples: [
      { gender: 'male', birthYear: 1990, birthMonth: 1, birthDay: 15, birthHour: 9 },
      { gender: 'female', birthYear: 1995, birthMonth: 6, birthDay: 20, birthHour: 23, calendarType: 'lunar' },
    ],
  },
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
};
