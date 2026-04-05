import type { ToolDefinition } from '../shared/tool-types.js';

export const daliurenDefinition: ToolDefinition = {
  name: 'daliuren',
  description: '大六壬排盘 - 根据日期时间起课，计算天地盘、四课、三传、天将、遁干、神煞(49种)、课体判断、十二长生、五行旺衰、建除十二神',
  inputSchema: {
    type: 'object',
    properties: {
      date: { type: 'string', description: '公历日期 YYYY-MM-DD' },
      hour: { type: 'number', description: '时辰 0-23' },
      minute: { type: 'number', description: '分钟 0-59，默认 0' },
      timezone: { type: 'string', description: 'IANA 时区，默认 Asia/Shanghai。用于将输入的日期时刻解释为调用方本地时区时间' },
      question: { type: 'string', description: '占事（可选）' },
      birthYear: { type: 'number', description: '出生年（可选，用于计算本命和行年）' },
      gender: { type: 'string', enum: ['male', 'female'], description: '性别（可选，用于计算行年）' },
      responseFormat: {
        type: 'string',
        enum: ['json', 'markdown'],
        description: '响应格式：json=结构化数据，markdown=人类可读文本',
        default: 'json',
      },
      detailLevel: {
        type: 'string',
        enum: ['default', 'full'],
        description: '输出细节级别：default=精简主证据；full=在默认基础上补充完整细节',
        default: 'default',
      },
    },
    required: ['date', 'hour'],
    examples: [
      { date: '2026-03-15', hour: 16, minute: 53, timezone: 'Asia/Shanghai', question: '今日运势如何' },
      { date: '2026-03-15', hour: 16, timezone: 'Asia/Shanghai', birthYear: 1990, gender: 'male' },
    ],
  },
  outputSchema: {
    type: 'object',
    properties: {
      dateInfo: {
        type: 'object',
        description: '日期与基础信息',
        properties: {
          solarDate: { type: 'string', description: '公历日期时间' },
          lunarDate: { type: 'string', description: '农历日期' },
          bazi: { type: 'string', description: '四柱八字' },
          ganZhi: {
            type: 'object',
            properties: {
              year: { type: 'string' },
              month: { type: 'string' },
              day: { type: 'string' },
              hour: { type: 'string' },
            },
          },
          yueJiang: { type: 'string', description: '月将地支' },
          yueJiangName: { type: 'string', description: '月将名' },
          xun: { type: 'string', description: '旬' },
          kongWang: { type: 'array', items: { type: 'string' }, description: '空亡' },
          yiMa: { type: 'string', description: '驿马' },
          dingMa: { type: 'string', description: '丁马' },
          tianMa: { type: 'string', description: '天马' },
          diurnal: { type: 'boolean', description: '昼夜标记' },
        },
      },
      tianDiPan: {
        type: 'object',
        properties: {
          diPan: { type: 'object', description: '地盘' },
          tianPan: { type: 'object', description: '天盘' },
          tianJiang: { type: 'object', description: '天将' },
        },
      },
      siKe: {
        type: 'object',
        properties: {
          yiKe: { type: 'array', items: { type: 'string' } },
          erKe: { type: 'array', items: { type: 'string' } },
          sanKe: { type: 'array', items: { type: 'string' } },
          siKe: { type: 'array', items: { type: 'string' } },
        },
      },
      sanChuan: {
        type: 'object',
        properties: {
          chu: { type: 'array', items: { type: 'string' } },
          zhong: { type: 'array', items: { type: 'string' } },
          mo: { type: 'array', items: { type: 'string' } },
          method: { type: 'string', description: '取传方法' },
        },
      },
      keTi: {
        type: 'object',
        properties: {
          method: { type: 'string', description: '课体大类' },
          subTypes: { type: 'array', items: { type: 'string' } },
          extraTypes: { type: 'array', items: { type: 'string' } },
        },
      },
      keName: { type: 'string', description: '课名' },
      shenSha: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            value: { type: 'string' },
            description: { type: 'string' },
          },
        },
      },
      gongInfos: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            diZhi: { type: 'string' },
            tianZhi: { type: 'string' },
            tianJiang: { type: 'string' },
            tianJiangShort: { type: 'string' },
            dunGan: { type: 'string' },
            changSheng: { type: 'string' },
            wuXing: { type: 'string' },
            wangShuai: { type: 'string' },
            jianChu: { type: 'string' },
          },
        },
      },
      dunGan: { type: 'object', description: '遁干表' },
      jianChu: { type: 'object', description: '建除表' },
      benMing: { type: 'string', description: '本命干支' },
      xingNian: { type: 'string', description: '行年干支' },
      question: { type: 'string', description: '占事' },
    },
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
};
