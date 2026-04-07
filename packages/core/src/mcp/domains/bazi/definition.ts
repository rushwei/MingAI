import type {ToolDefinition } from '../../contract.js';

export const baziCalculateDefinition: ToolDefinition = {
  name: 'bazi',
  description: '八字计算- 根据出生时间计算八字命盘，输出四柱、藏干气性/十神、分柱神煞（30+种）、分柱空亡、地支刑害合冲关系、天干五合、天干冲克、地支半合、地支三会、胎元、命宫',
  inputSchema: {
    type: 'object',
    properties: {
      gender: {
        type: 'string',
        enum: ['male', 'female'],
        description: '性别',
      },
      birthYear: {
        type: 'number',
        description: '出生年 (1900-2100)。calendarType=lunar 时表示农历年',
      },
      birthMonth: {
        type: 'number',
        description: '出生月 (1-12)。calendarType=lunar 时表示农历月',
      },
      birthDay: {
        type: 'number',
        description: '出生日。calendarType=lunar 时会按农历月天数校验',
      },
      birthHour: {
        type: 'number',
        description: '出生时 (0-23)',
      },
      birthMinute: {
        type: 'number',
        description: '出生分 (0-59)，默认0',
      },
      calendarType: {
        type: 'string',
        enum: ['solar', 'lunar'],
        description: '历法类型，默认 solar。lunar 表示按农历输入 birthYear/month/day',
      },
      isLeapMonth: {
        type: 'boolean',
        description: '是否闰月（仅 calendarType=lunar 有效，且会校验该年该月是否真为闰月）',
      },
      birthPlace: {
        type: 'string',
        description:'出生地点（可选，仅用于展示/存档，不会自动换算为经度）',
      },
longitude: {
        type: 'number',
        description: '出生地经度（东经为正，如北京 116.4，上海 121.5）。提供后自动计算真太阳时校正时辰；农历输入会先换算为公历再校正。如果只有地点名，需要在调用方先做地理编码',
      },
      responseFormat: {
        type: 'string',
        enum: ['json', 'markdown'],
        description: '响应格式：json=结构化数据，markdown=人类可读文本',
        default: 'json',
      },
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
  annotations: {
    readOnlyHint: true,
destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
};
export const baziDefinition = baziCalculateDefinition;
