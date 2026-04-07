import type { ToolDefinition } from '../../contract.js';

export const ziweiCalculateDefinition: ToolDefinition = {
  name: 'ziwei_calculate',
  description: '紫微斗数排盘 - 根据出生时间计算紫微命盘，包含十二宫位、星曜（含亮度/四化/宫干自化）、大限、流年虚岁、斗君、四化分布、命主星、身主星、小限、博士十二星、三方四正。可选传入经度启用真太阳时校正',
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
        description: '出生年 (1900-2100)',
      },
      birthMonth: {
        type: 'number',
        description: '出生月 (1-12)',
      },
      birthDay: {
type: 'number',
        description: '出生日 (1-31)',
      },
      birthHour: {
        type: 'number',
        description: '出生时 (0-23)',
      },
      birthMinute: {
        type: 'number',
        description: '出生分 (0-59)，默认 0',
      },
      calendarType: {
        type:'string',
        enum: ['solar', 'lunar'],
        description: '历法类型，默认 solar (阳历)',
      },
      isLeapMonth: {
        type: 'boolean',
        description: '是否闰月（仅农历有效），默认 false',
      },
      longitude: {
        type: 'number',
        description: '出生地经度（东经为正，如北京116.4，上海 121.5）。提供后自动计算真太阳时校正时辰；农历输入会先换算为公历再校正。如果只有地点名，需要在调用方先做地理编码',
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
        description: '输出细节级别：default=精简命盘；full=完整命盘',
        default: 'default',
      },
    },
    required: ['gender', 'birthYear', 'birthMonth', 'birthDay', 'birthHour'],
    examples: [
      { gender: 'male', birthYear: 1990, birthMonth: 1, birthDay: 15, birthHour: 9 },
      { gender: 'female', birthYear: 1995, birthMonth: 6, birthDay: 20, birthHour: 23, calendarType: 'lunar' },
      { gender: 'male', birthYear: 1990, birthMonth: 1, birthDay: 15, birthHour: 9,longitude: 116.4 },
    ],
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
openWorldHint: false,
  },
};
export const ziweiDefinition = ziweiCalculateDefinition;
