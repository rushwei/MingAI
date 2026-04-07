import type { ToolDefinition } from '../../contract.js';

export const daliurenDefinition: ToolDefinition ={
  name: 'daliuren',
  description: '大六壬排盘 - 根据日期时间起课，计算天地盘、四课、三传、天将、遁干、神煞(49种)、课体判断、十二长生、五行旺衰、建除十二神',
  inputSchema: {
    type: 'object',
    properties: {
      date: { type: 'string', description: '公历日期 YYYY-MM-DD' },
      hour: { type: 'number',description: '时辰 0-23' },
      minute: { type: 'number', description: '分钟 0-59，默认 0' },
      timezone: { type: 'string', description: 'IANA 时区，默认 Asia/Shanghai。用于将输入的日期时刻解释为调用方本地时区时间' },
      question: { type: 'string', description: '占事（可选）' },
      birthYear: { type: 'number', description: '出生年（可选，用于计算本命和行年）' },
      gender: { type: 'string', enum: ['male', 'female'], description: '性别（可选，用于计算行年）' },
      responseFormat: {
        type:'string',
        enum: ['json', 'markdown'],
        description: '响应格式：json=结构化数据，markdown=人类可读文本',
        default: 'json',
      },
      detailLevel:{
        type: 'string',
        enum: ['default', 'full'],
        description: '输出细节级别：default=精简主证据；full=在默认基础上补充完整细节',
        default: 'default',
      },
    },
    required: ['date', 'hour'],
    examples: [
      { date: '2026-03-15', hour: 16, minute: 53, timezone: 'Asia/Shanghai', question: '今日运势如何'},
      { date: '2026-03-15', hour: 16, timezone: 'Asia/Shanghai', birthYear: 1990, gender: 'male' },
    ],
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
};
