import type { ToolDefinition } from '../../contract.js';

export const taiyiDefinition: ToolDefinition = {
  name: 'taiyi',
  description: '太乙九星观测 - 聚焦太乙九星视角，输出问卜时空底盘、外部时空环境、九星阵列、核心五行关系与古典参考。',
  inputSchema: {
    type: 'object',
    properties: {
      mode: {
        type: 'string',
        enum: ['year', 'month', 'day', 'hour', 'minute'],
        description: '观测尺度：year=年盘，month=月盘，day=日盘，hour=时盘，minute=时盘基础上的分钟细化',
      },
      date: {
        type: 'string',
        description: '日期 (YYYY-MM-DD)',
      },
      hour: {
        type: 'number',
        description: '小时 (0-23)。hour/minute 模式必填，其他模式默认 12',
      },
      minute: {
        type: 'number',
        description: '分钟 (0-59)。minute 模式必填，其他模式默认 0',
      },
      timezone: {
        type: 'string',
        description: 'IANA 时区，默认 Asia/Shanghai',
      },
      question: {
        type: 'string',
        description: '占问事项（可选）',
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
        description: '输出细节级别：当前 default/full 保持一致，参数仅为兼容统一渲染接口保留。',
        default: 'default',
      },
    },
    required: ['mode', 'date'],
    examples: [
      { mode: 'day', date: '2026-04-10', timezone: 'Asia/Shanghai', question: '此事能否顺利推进？' },
      { mode: 'minute', date: '2026-04-10', hour: 13, minute: 37, timezone: 'Asia/Shanghai' },
    ],
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
};
