import type { ToolDefinition } from '../../contract.js';

export const xiaoliurenDefinition: ToolDefinition = {
  name: 'xiaoliuren',
  description: '小六壬占卜 - 根据农历月日时辰起课，通过大安、留连、速喜、赤口、小吉、空亡六种状态顺推结果。默认输出主证据：起课信息、推演链、最终落点；detailLevel=full 时补充释义与诗诀。',
  inputSchema: {
    type: 'object',
    properties: {
      lunarMonth: { type: 'number', description: '农历月（1-12）' },
      lunarDay: { type: 'number', description: '农历日（1-30）' },
      hour: { type: 'number', description: '时辰序号（子=1, 丑=2, ..., 亥=12）或0-23的小时数' },
      question: { type: 'string', description: '占问事项（可选）' },
      responseFormat: {
        type: 'string',
        enum: ['json', 'markdown'],
        description: '响应格式：json=结构化数据，markdown=人类可读文本',
        default: 'json',
      },
      detailLevel: {
        type: 'string',
        enum: ['default', 'full'],
        description: '输出细节级别：default=主证据；full=补充释义与诗诀。',
        default: 'default',
      },
    },
    required: ['lunarMonth', 'lunarDay', 'hour'],
    examples: [
      { lunarMonth: 3, lunarDay: 15, hour: 8, question: '今日运势如何' },
      { lunarMonth: 1, lunarDay: 1, hour: 1, responseFormat: 'markdown' },
    ],
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
};
