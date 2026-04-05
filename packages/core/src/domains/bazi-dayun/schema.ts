import type { ToolDefinition } from '../shared/tool-types.js';

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
  outputSchema: {
    type: 'object',
    properties: {
      startAge: {
        type: 'number',
        description: '首步大运起运年龄',
      },
      startAgeDetail: {
        type: 'string',
        description: '精确起运描述（如 8年5月3天起运）',
      },
      xiaoYun: {
        type: 'array',
        description: '小运列表（起运前每年一步小运）',
        items: {
          type: 'object',
          properties: {
            age: { type: 'number', description: '虚岁' },
            ganZhi: { type: 'string', description: '小运干支' },
            tenGod: { type: 'string', description: '小运天干十神（相对日主）' },
          },
        },
      },
      list: {
        type: 'array',
        description: '大运列表',
        items: {
          type: 'object',
          properties: {
            startYear: { type: 'number', description: '起始年份' },
            startAge: { type: 'number', description: '该步大运的起运年龄' },
            ganZhi: { type: 'string', description: '干支' },
            stem: { type: 'string', description: '天干' },
            branch: { type: 'string', description: '地支' },
            tenGod: { type: 'string', description: '大运天干十神' },
            branchTenGod: { type: 'string', description: '大运地支主气十神' },
            hiddenStems: {
              type: 'array',
              description: '藏干明细',
              items: {
                type: 'object',
                properties: {
                  stem: { type: 'string', description: '藏干天干' },
                  qiType: { type: 'string', enum: ['本气', '中气', '余气'], description: '气性' },
                  tenGod: { type: 'string', description: '相对日主十神' },
                },
              },
            },
            naYin: { type: 'string', description: '纳音' },
            diShi: { type: 'string', description: '地势（十二长生）' },
            shenSha: { type: 'array', items: { type: 'string' }, description: '神煞' },
            branchRelations: {
              type: 'array',
              description: '大运地支与原局四柱地支的关系',
              items: {
                type: 'object',
                properties: {
                  type: { type: 'string', enum: ['六合', '六冲', '三合', '相刑', '相害'], description: '关系类型' },
                  branches: { type: 'array', items: { type: 'string' }, description: '涉及地支' },
                  description: { type: 'string', description: '关系描述' },
                },
              },
            },
            liunianList: {
              type: 'array',
              description: '该步大运内10年流年列表',
              items: {
                type: 'object',
                properties: {
                  year: { type: 'number', description: '公历年份' },
                  age: { type: 'number', description: '该流年对应年龄' },
                  ganZhi: { type: 'string', description: '流年干支' },
                  gan: { type: 'string', description: '流年天干' },
                  zhi: { type: 'string', description: '流年地支' },
                  tenGod: { type: 'string', description: '流年天干十神（相对日主）' },
                  nayin: { type: 'string', description: '流年纳音' },
                  hiddenStems: {
                    type: 'array',
                    description: '流年藏干明细',
                    items: {
                      type: 'object',
                      properties: {
                        stem: { type: 'string', description: '藏干天干' },
                        qiType: { type: 'string', enum: ['本气', '中气', '余气'], description: '气性' },
                        tenGod: { type: 'string', description: '相对日主十神' },
                      },
                    },
                  },
                  diShi: { type: 'string', description: '流年地势（十二长生）' },
                  shenSha: { type: 'array', items: { type: 'string' }, description: '流年神煞' },
                  branchRelations: {
                    type: 'array',
                    description: '流年地支与原局四柱及大运地支的关系',
                    items: {
                      type: 'object',
                      properties: {
                        type: { type: 'string', enum: ['六合', '六冲', '三合', '相刑', '相害'], description: '关系类型' },
                        branches: { type: 'array', items: { type: 'string' }, description: '涉及地支' },
                        description: { type: 'string', description: '关系描述' },
                      },
                    },
                  },
                  taiSui: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '太岁关系（值太岁/冲太岁/合太岁/刑太岁/害太岁/破太岁）',
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
};
