import type { ToolDefinition } from '../shared/tool-types.js';

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
      seed: {
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
      { spreadType: 'love', question: '我和他的未来发展？', allowReversed: true },
      { spreadType: 'celtic-cross', question: '事业发展', birthYear: 1990, birthMonth: 5, birthDay: 15 },
    ],
  },
  outputSchema: {
    type: 'object',
    properties: {
      spreadId: { type: 'string', description: '牌阵ID' },
      spreadName: { type: 'string', description: '牌阵名称' },
      question: { type: 'string', description: '占卜问题' },
      seed: { type: 'string', description: '本次抽牌使用的随机种子' },
      cards: {
        type: 'array',
        description: '抽到的牌',
        items: {
          type: 'object',
          properties: {
            position: { type: 'string', description: '位置含义' },
            card: {
              type: 'object',
              description: '牌信息',
              properties: {
                name: { type: 'string', description: '英文名' },
                nameChinese: { type: 'string', description: '中文名' },
                keywords: { type: 'array', items: { type: 'string' }, description: '关键词' },
              },
            },
            orientation: { type: 'string', description: '正逆位(upright/reversed)' },
            meaning: { type: 'string', description: '牌义' },
            number: { type: 'number', description: '大阿卡纳编号(0-21)，仅大阿卡纳有此字段' },
            reversedKeywords: { type: 'array', items: { type: 'string' }, description: '逆位关键词' },
            element: { type: 'string', description: '元素（火/水/风/土）' },
            astrologicalCorrespondence: { type: 'string', description: '星象对应' },
          },
        },
      },
      numerology: {
        type: 'object',
        description: '塔罗数秘术（需传入生日信息）',
        properties: {
          personalityCard: {
            type: 'object',
            description: '人格牌（生日数字相加缩减到1-22）',
            properties: {
              number: { type: 'number', description: '大阿卡纳编号' },
              name: { type: 'string', description: '英文名' },
              nameChinese: { type: 'string', description: '中文名' },
            },
          },
          soulCard: {
            type: 'object',
            description: '灵魂牌（人格牌>9时各位再相加，否则等于人格牌）',
            properties: {
              number: { type: 'number', description: '大阿卡纳编号' },
              name: { type: 'string', description: '英文名' },
              nameChinese: { type: 'string', description: '中文名' },
            },
          },
          yearlyCard: {
            type: 'object',
            description: '年度牌（出生月日+当前年份数字相加缩减到1-22）',
            properties: {
              number: { type: 'number', description: '大阿卡纳编号' },
              name: { type: 'string', description: '英文名' },
              nameChinese: { type: 'string', description: '中文名' },
              year: { type: 'number', description: '计算年份' },
            },
          },
        },
      },
    },
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
};
