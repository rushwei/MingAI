import type{ ToolDefinition } from '../../contract.js';

export const qimenCalculateDefinition: ToolDefinition ={
  name: 'qimen_calculate',
  description: '奇门遁甲排盘 - 根据指定时间排出奇门遁甲盘，输出九宫（天盘/地盘天干、九星、八门、八神）、格局判断（吉凶格、伏吟反吟）、空亡、驿马、入墓、旺相休囚死等信息',
  inputSchema: {
    type: 'object',
    properties: {
      year: { type: 'number', description: '年 (1900-2100)' },
      month: { type: 'number', description: '月 (1-12)' },
      day: { type: 'number', description: '日 (1-31)' },
hour: { type: 'number', description: '时 (0-23)' },
      minute: { type: 'number', description: '分 (0-59)，默认 0' },
      timezone: { type: 'string', description: 'IANA 时区，默认 Asia/Shanghai。用于将输入的年月日时分解释为调用方本地时刻' },
      question: { type: 'string', description: '占问事项（可选）' },
      panType: { type: 'string', enum: ['zhuan'], description: '盘式：zhuan=转盘（默认）' },
      juMethod: { type: 'string', enum: ['chaibu', 'maoshan'], description: '定局法：chaibu=拆补法（默认），maoshan=茅山法' },
      zhiFuJiGong: { type: 'string', enum: ['ji_liuyi', 'ji_wugong'], description: '六甲直符寄宫：ji_liuyi=寄六仪（寄二八宫），ji_wugong=寄戊宫（寄坤二宫）' },
      responseFormat: {
        type: 'string',
        enum: ['json', 'markdown'],
        description: '响应格式：json=结构化数据，markdown=人类可读文本',
        default: 'json',
      },
      detailLevel: {
        type: 'string',
        enum: ['default', 'full'],
        description: '输出细节级别：default=精简排盘；full=在默认基础上补充完整细节',
        default: 'default',
      },
    },
    required: ['year', 'month', 'day', 'hour'],
    examples: [
      { year: 2026, month: 3, day: 15, hour: 16, minute: 51,timezone: 'Asia/Shanghai',question: '事业发展如何？' },
    ],
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
};
export const qimenDefinition = qimenCalculateDefinition;
