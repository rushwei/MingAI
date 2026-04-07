import type { ToolDefinition } from '../../contract.js';

export const tarotDefinition: ToolDefinition = {
  name: 'tarot',
description: '塔罗抽牌 - 塔罗牌抽牌占卜，支持多种牌阵。可选传入生日计算人格牌/灵魂牌/年度牌',
  inputSchema: {
    type: 'object',
    properties: {
      spreadType: {
        type: 'string',
        enum: ['single', 'three-card', 'love', 'celtic-cross', 'horseshoe', 'decision', 'mind-body-spirit', 'situation', 'yes-no'],
        description: '牌阵类型：single=单牌，three-card=三牌，love=爱情牌阵，celtic-cross=凯尔特十字，horseshoe=马蹄形(7牌)，decision=抉择(5牌)，mind-body-spirit=身心灵(3牌)，situation=处境/障碍/建议(3牌)，yes-no=是否(1牌)。默认 single',
      },
      question: {
        type: 'string',
        description: '占卜问题（可选）',
      },
      allowReversed: {
        type: 'boolean',
        description: '是否允许逆位，默认 true',
      },
      seed:{
        type: 'string',
        description: '随机种子（可选）。相同 seed + 输入将得到可复现结果',
      },
      birthYear: {
        type: 'number',
        description: '出生年（可选，用于计算人格牌/灵魂牌/年度牌）',
      },
      birthMonth: {
        type: 'number',
        description: '出生月（可选，1-12）',
      },
      birthDay: {
        type: 'number',
description: '出生日（可选，1-31）',
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
        description: '输出细节级别：default=精简黄历主证据；full=在默认基础上补充完整黄历细节',
        default: 'default',
      },
    },
    required: [],
    examples: [
      { spreadType: 'three-card', question: '本月运势如何？' },
      { spreadType:'love', question: '我和他的未来发展？', allowReversed: true },
      { spreadType: 'celtic-cross', question: '事业发展', birthYear: 1990, birthMonth: 5, birthDay: 15 },
    ],
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
};
