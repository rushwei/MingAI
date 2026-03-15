/**
 * MCP 工具定义
 */

import type {
  BaziInput,
  BaziPillarsResolveInput,
  ZiweiInput,
  ZiweiHoroscopeInput,
  ZiweiFlyingStarInput,
  LiuyaoInput,
  TarotInput,
  FortuneInput,
  DayunInput,
} from './types.js';

export interface ToolAnnotation {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
    examples?: unknown[];
  };
  outputDescription?: string;
  outputSchema?: {
    type: 'object';
    properties: Record<string, unknown>;
  };
  annotations?: ToolAnnotation;
}

export const tools: ToolDefinition[] = [
  {
    name: 'bazi_calculate',
    description: '八字计算 - 根据出生时间计算八字命盘，输出四柱、藏干气性/十神、分柱神煞、分柱空亡、地支刑害合冲关系',
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
          description: '出生分 (0-59)，默认 0',
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
          description: '出生地点（可选）',
        },
        longitude: {
          type: 'number',
          description: '出生地经度（东经为正，如北京 116.4，上海 121.5）。提供后自动计算真太阳时校正时辰（仅公历有效）',
        },
        responseFormat: {
          type: 'string',
          enum: ['json', 'markdown'],
          description: '响应格式：json=结构化数据，markdown=人类可读文本',
          default: 'json',
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
        gender: {
          type: 'string',
          description: '性别',
        },
        birthPlace: {
          type: 'string',
          description: '出生地点',
        },
        dayMaster: {
          type: 'string',
          description: '日主天干（甲乙丙丁戊己庚辛壬癸）',
        },
        kongWang: {
          type: 'object',
          description: '全局空亡（按日柱查空亡，四柱共用）',
          properties: {
            xun: { type: 'string', description: '旬名' },
            kongZhi: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 2, description: '空亡地支' },
          },
        },
        fourPillars: {
          type: 'object',
          description: '四柱信息',
          properties: {
            year: {
              type: 'object',
              description: '年柱',
              properties: {
                stem: { type: 'string', description: '天干' },
                branch: { type: 'string', description: '地支' },
                tenGod: { type: 'string', description: '十神' },
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
                shenSha: { type: 'array', items: { type: 'string' }, description: '本柱神煞' },
                kongWang: {
                  type: 'object',
                  description: '本柱空亡',
                  properties: {
                    isKong: { type: 'boolean', description: '本柱地支是否入空亡' },
                  },
                },
              },
            },
            month: {
              type: 'object',
              description: '月柱',
              properties: {
                stem: { type: 'string', description: '天干' },
                branch: { type: 'string', description: '地支' },
                tenGod: { type: 'string', description: '十神' },
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
                shenSha: { type: 'array', items: { type: 'string' }, description: '本柱神煞' },
                kongWang: {
                  type: 'object',
                  description: '本柱空亡',
                  properties: {
                    isKong: { type: 'boolean', description: '本柱地支是否入空亡' },
                  },
                },
              },
            },
            day: {
              type: 'object',
              description: '日柱（日柱无十神）',
              properties: {
                stem: { type: 'string', description: '天干' },
                branch: { type: 'string', description: '地支' },
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
                shenSha: { type: 'array', items: { type: 'string' }, description: '本柱神煞' },
                kongWang: {
                  type: 'object',
                  description: '本柱空亡',
                  properties: {
                    isKong: { type: 'boolean', description: '本柱地支是否入空亡' },
                  },
                },
              },
            },
            hour: {
              type: 'object',
              description: '时柱',
              properties: {
                stem: { type: 'string', description: '天干' },
                branch: { type: 'string', description: '地支' },
                tenGod: { type: 'string', description: '十神' },
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
                shenSha: { type: 'array', items: { type: 'string' }, description: '本柱神煞' },
                kongWang: {
                  type: 'object',
                  description: '本柱空亡',
                  properties: {
                    isKong: { type: 'boolean', description: '本柱地支是否入空亡' },
                  },
                },
              },
            },
          },
        },
        relations: {
          type: 'array',
          description: '地支刑害合冲关系',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['合', '冲', '刑', '害'], description: '关系类型' },
              pillars: {
                type: 'array',
                items: { type: 'string', enum: ['年支', '月支', '日支', '时支'] },
                description: '涉及柱位',
              },
              description: { type: 'string', description: '关系描述' },
            },
          },
        },
        trueSolarTimeInfo: {
          type: 'object',
          description: '真太阳时校正信息（仅在提供 longitude 且 calendarType=solar 时返回）',
          properties: {
            clockTime: { type: 'string', description: '钟表时间 (HH:MM)' },
            trueSolarTime: { type: 'string', description: '真太阳时 (HH:MM)' },
            longitude: { type: 'number', description: '出生地经度' },
            correctionMinutes: { type: 'number', description: '总校正量（分钟）' },
            trueTimeIndex: { type: 'number', description: '真太阳时对应的时辰索引 (0-12)' },
            dayOffset: { type: 'number', description: '跨日偏移（-1/0/1）' },
          },
        },
      },
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'bazi_pillars_resolve',
    description: '四柱反推候选时间 - 输入年/月/日/时四柱，返回1900-2100范围内全部候选时间（候选主字段为农历，可直接用于农历排盘）',
    inputSchema: {
      type: 'object',
      properties: {
        yearPillar: { type: 'string', description: '年柱，2字干支（如“甲子”）' },
        monthPillar: { type: 'string', description: '月柱，2字干支（如“乙丑”）' },
        dayPillar: { type: 'string', description: '日柱，2字干支（如“丙寅”）' },
        hourPillar: { type: 'string', description: '时柱，2字干支（如“丁卯”）' },
        responseFormat: {
          type: 'string',
          enum: ['json', 'markdown'],
          description: '响应格式：json=结构化数据，markdown=人类可读文本',
          default: 'json',
        },
      },
      required: ['yearPillar', 'monthPillar', 'dayPillar', 'hourPillar'],
      examples: [
        { yearPillar: '甲子', monthPillar: '乙丑', dayPillar: '丙寅', hourPillar: '丁卯' },
        { yearPillar: '戊子', monthPillar: '庚丑', dayPillar: '辛卯', hourPillar: '癸巳' },
      ],
    },
    outputSchema: {
      type: 'object',
      properties: {
        pillars: {
          type: 'object',
          description: '原始四柱输入',
          properties: {
            yearPillar: { type: 'string' },
            monthPillar: { type: 'string' },
            dayPillar: { type: 'string' },
            hourPillar: { type: 'string' },
          },
        },
        count: { type: 'number', description: '候选总数' },
        candidates: {
          type: 'array',
          description: '候选出生时间',
          items: {
            type: 'object',
            properties: {
              candidateId: { type: 'string', description: '候选ID' },
              birthYear: { type: 'number', description: '农历出生年' },
              birthMonth: { type: 'number', description: '农历出生月' },
              birthDay: { type: 'number', description: '农历出生日' },
              birthHour: { type: 'number', description: '出生时' },
              birthMinute: { type: 'number', description: '出生分' },
              isLeapMonth: { type: 'boolean', description: '是否农历闰月' },
              solarText: { type: 'string', description: '公历可读文本' },
              lunarText: { type: 'string', description: '农历可读文本' },
              nextCall: {
                type: 'object',
                description: '下一步调用 bazi_calculate 的农历建议参数（需补 gender）',
                properties: {
                  tool: { type: 'string', description: '工具名' },
                  arguments: {
                    type: 'object',
                    properties: {
                      birthYear: { type: 'number', description: '农历出生年' },
                      birthMonth: { type: 'number', description: '农历出生月' },
                      birthDay: { type: 'number', description: '农历出生日' },
                      birthHour: { type: 'number' },
                      birthMinute: { type: 'number' },
                      calendarType: { type: 'string', enum: ['lunar'] },
                      isLeapMonth: { type: 'boolean', description: '是否农历闰月' },
                    },
                  },
                  missing: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'bazi_dayun',
    description: '八字大运计算 - 根据出生时间计算完整大运列表，输出起运详情与各步大运干支、十神',
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
        list: {
          type: 'array',
          description: '大运列表',
          items: {
            type: 'object',
            properties: {
              startYear: { type: 'number', description: '起始年份' },
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
            },
          },
        },
      },
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'ziwei_calculate',
    description: '紫微斗数排盘 - 根据出生时间计算紫微命盘，包含十二宫位、星曜（含亮度/四化/宫干自化）、大限、流年虚岁、斗君、四化分布。可选传入经度启用真太阳时校正',
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
          type: 'string',
          enum: ['solar', 'lunar'],
          description: '历法类型，默认 solar (阳历)',
        },
        isLeapMonth: {
          type: 'boolean',
          description: '是否闰月（仅农历有效），默认 false',
        },
        longitude: {
          type: 'number',
          description: '出生地经度（东经为正，如北京 116.4，上海 121.5）。提供后自动计算真太阳时校正时辰',
        },
        responseFormat: {
          type: 'string',
          enum: ['json', 'markdown'],
          description: '响应格式：json=结构化数据，markdown=人类可读文本',
          default: 'json',
        },
      },
      required: ['gender', 'birthYear', 'birthMonth', 'birthDay', 'birthHour'],
      examples: [
        { gender: 'male', birthYear: 1990, birthMonth: 1, birthDay: 15, birthHour: 9 },
        { gender: 'female', birthYear: 1995, birthMonth: 6, birthDay: 20, birthHour: 23, calendarType: 'lunar' },
        { gender: 'male', birthYear: 1990, birthMonth: 1, birthDay: 15, birthHour: 9, longitude: 116.4 },
      ],
    },
    outputSchema: {
      type: 'object',
      properties: {
        solarDate: { type: 'string', description: '阳历日期' },
        lunarDate: { type: 'string', description: '农历日期' },
        fourPillars: {
          type: 'object',
          description: '四柱',
          properties: {
            year: { type: 'string', description: '年柱干支' },
            month: { type: 'string', description: '月柱干支' },
            day: { type: 'string', description: '日柱干支' },
            hour: { type: 'string', description: '时柱干支' },
          },
        },
        soul: { type: 'string', description: '命主' },
        body: { type: 'string', description: '身主' },
        fiveElement: { type: 'string', description: '五行局' },
        zodiac: { type: 'string', description: '属相' },
        sign: { type: 'string', description: '星座' },
        palaces: {
          type: 'array',
          description: '十二宫位',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: '宫名' },
              heavenlyStem: { type: 'string', description: '天干' },
              earthlyBranch: { type: 'string', description: '地支' },
              isBodyPalace: { type: 'boolean', description: '是否身宫' },
              index: { type: 'number', description: '宫位索引(0-11)' },
              isOriginalPalace: { type: 'boolean', description: '是否来因宫' },
              changsheng12: { type: 'string', description: '长生12神' },
              boshi12: { type: 'string', description: '博士12神' },
              jiangqian12: { type: 'string', description: '将前12神' },
              suiqian12: { type: 'string', description: '岁前12神' },
              ages: { type: 'array', items: { type: 'number' }, description: '小限年龄' },
              majorStars: {
                type: 'array',
                description: '主星',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: '星名' },
                    brightness: { type: 'string', description: '亮度（庙/旺/得/利/平/不/陷）' },
                    mutagen: { type: 'string', description: '四化（禄/权/科/忌）' },
                    selfMutagen: { type: 'string', description: '离心自化↓（本宫宫干四化落回本宫星曜）' },
                    oppositeMutagen: { type: 'string', description: '向心自化↑（对宫宫干四化飞入本宫星曜）' },
                  },
                },
              },
              minorStars: {
                type: 'array',
                description: '辅星',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: '星名' },
                    brightness: { type: 'string', description: '亮度' },
                    mutagen: { type: 'string', description: '四化（禄/权/科/忌）' },
                    selfMutagen: { type: 'string', description: '离心自化↓' },
                    oppositeMutagen: { type: 'string', description: '向心自化↑' },
                  },
                },
              },
              adjStars: {
                type: 'array',
                description: '杂曜',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', description: '星名' },
                    type: { type: 'string', description: '星耀类型（adjective/flower/helper/lucun/tianma等）' },
                    brightness: { type: 'string', description: '亮度' },
                    mutagen: { type: 'string', description: '四化（禄/权/科/忌）' },
                    selfMutagen: { type: 'string', description: '离心自化↓' },
                    oppositeMutagen: { type: 'string', description: '向心自化↑' },
                  },
                },
              },
              decadalRange: {
                type: 'array',
                description: '大限虚岁范围 [起始, 结束]',
                items: { type: 'number' },
              },
              liuNianAges: {
                type: 'array',
                description: '流年虚岁列表',
                items: { type: 'number' },
              },
            },
          },
        },
        decadalList: {
          type: 'array',
          description: '大限列表',
          items: {
            type: 'object',
            properties: {
              startAge: { type: 'number', description: '起始年龄' },
              endAge: { type: 'number', description: '结束年龄' },
              heavenlyStem: { type: 'string', description: '天干' },
              palace: {
                type: 'object',
                description: '宫位',
                properties: {
                  earthlyBranch: { type: 'string', description: '地支' },
                  name: { type: 'string', description: '宫名' },
                },
              },
            },
          },
        },
        earthlyBranchOfSoulPalace: { type: 'string', description: '命宫地支' },
        earthlyBranchOfBodyPalace: { type: 'string', description: '身宫地支' },
        time: { type: 'string', description: '时辰名' },
        timeRange: { type: 'string', description: '时辰范围' },
        mutagenSummary: {
          type: 'array',
          description: '四化分布',
          items: {
            type: 'object',
            properties: {
              mutagen: { type: 'string', enum: ['禄', '权', '科', '忌'], description: '四化类型' },
              starName: { type: 'string', description: '星曜名' },
              palaceName: { type: 'string', description: '所在宫位' },
            },
          },
        },
        gender: { type: 'string', description: '性别回显（male/female）' },
        douJun: { type: 'string', description: '子年斗君地支' },
        trueSolarTimeInfo: {
          type: 'object',
          description: '真太阳时校正信息（仅在提供 longitude 时返回）',
          properties: {
            clockTime: { type: 'string', description: '钟表时间 (HH:MM)' },
            trueSolarTime: { type: 'string', description: '真太阳时 (HH:MM)' },
            longitude: { type: 'number', description: '出生地经度' },
            correctionMinutes: { type: 'number', description: '总校正量（分钟）' },
            trueTimeIndex: { type: 'number', description: '真太阳时对应的时辰索引 (0-12)' },
            dayOffset: { type: 'number', description: '跨日偏移（-1/0/1）' },
          },
        },
      },
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'ziwei_horoscope',
    description: '紫微斗数运限 - 根据出生时间和目标日期计算大限、小限、流年、流月、流日、流时运限信息',
    inputSchema: {
      type: 'object',
      properties: {
        gender: { type: 'string', enum: ['male', 'female'], description: '性别' },
        birthYear: { type: 'number', description: '出生年 (1900-2100)' },
        birthMonth: { type: 'number', description: '出生月 (1-12)' },
        birthDay: { type: 'number', description: '出生日 (1-31)' },
        birthHour: { type: 'number', description: '出生时 (0-23)' },
        birthMinute: { type: 'number', description: '出生分 (0-59)，默认 0' },
        calendarType: { type: 'string', enum: ['solar', 'lunar'], description: '历法类型，默认 solar' },
        isLeapMonth: { type: 'boolean', description: '是否闰月（仅农历有效），默认 false' },
        targetDate: { type: 'string', description: '目标日期 (YYYY-MM-DD)，默认今天' },
        targetTimeIndex: { type: 'number', description: '目标时辰索引 (0-12)，默认当前时辰' },
        responseFormat: {
          type: 'string',
          enum: ['json', 'markdown'],
          description: '响应格式：json=结构化数据，markdown=人类可读文本',
          default: 'json',
        },
      },
      required: ['gender', 'birthYear', 'birthMonth', 'birthDay', 'birthHour'],
      examples: [
        { gender: 'male', birthYear: 1990, birthMonth: 1, birthDay: 15, birthHour: 9, targetDate: '2026-03-13' },
      ],
    },
    outputSchema: {
      type: 'object',
      properties: {
        solarDate: { type: 'string', description: '阳历出生日期' },
        lunarDate: { type: 'string', description: '农历出生日期' },
        soul: { type: 'string', description: '命主' },
        body: { type: 'string', description: '身主' },
        fiveElement: { type: 'string', description: '五行局' },
        targetDate: { type: 'string', description: '目标日期' },
        decadal: { type: 'object', description: '大限', properties: { index: { type: 'number' }, name: { type: 'string' }, heavenlyStem: { type: 'string' }, earthlyBranch: { type: 'string' }, palaceNames: { type: 'array', items: { type: 'string' } }, mutagen: { type: 'array', items: { type: 'string' } } } },
        age: { type: 'object', description: '小限', properties: { index: { type: 'number' }, name: { type: 'string' }, heavenlyStem: { type: 'string' }, earthlyBranch: { type: 'string' }, palaceNames: { type: 'array', items: { type: 'string' } }, mutagen: { type: 'array', items: { type: 'string' } }, nominalAge: { type: 'number', description: '虚岁' } } },
        yearly: { type: 'object', description: '流年' },
        monthly: { type: 'object', description: '流月' },
        daily: { type: 'object', description: '流日' },
        hourly: { type: 'object', description: '流时' },
      },
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'ziwei_flying_star',
    description: '紫微斗数飞星分析 - 分析宫位间四化飞布关系，支持飞化判断、自化检测、四化落宫查询、三方四正查询',
    inputSchema: {
      type: 'object',
      properties: {
        gender: { type: 'string', enum: ['male', 'female'], description: '性别' },
        birthYear: { type: 'number', description: '出生年 (1900-2100)' },
        birthMonth: { type: 'number', description: '出生月 (1-12)' },
        birthDay: { type: 'number', description: '出生日 (1-31)' },
        birthHour: { type: 'number', description: '出生时 (0-23)' },
        birthMinute: { type: 'number', description: '出生分 (0-59)，默认 0' },
        calendarType: { type: 'string', enum: ['solar', 'lunar'], description: '历法类型，默认 solar' },
        isLeapMonth: { type: 'boolean', description: '是否闰月（仅农历有效），默认 false' },
        queries: {
          type: 'array',
          description: '查询列表',
          minItems: 1,
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['fliesTo', 'selfMutaged', 'mutagedPlaces', 'surroundedPalaces'], description: '查询类型' },
              from: { type: 'string', description: '起飞宫位（fliesTo 用）' },
              to: { type: 'string', description: '目标宫位（fliesTo 用）' },
              palace: { type: 'string', description: '目标宫位（selfMutaged/mutagedPlaces/surroundedPalaces 用）' },
              mutagens: { type: 'array', items: { type: 'string', enum: ['禄', '权', '科', '忌'] }, description: '四化类型（fliesTo/selfMutaged 用）' },
            },
            required: ['type'],
          },
        },
        responseFormat: {
          type: 'string',
          enum: ['json', 'markdown'],
          description: '响应格式：json=结构化数据，markdown=人类可读文本',
          default: 'json',
        },
      },
      required: ['gender', 'birthYear', 'birthMonth', 'birthDay', 'birthHour', 'queries'],
      examples: [
        {
          gender: 'male', birthYear: 1990, birthMonth: 1, birthDay: 15, birthHour: 9,
          queries: [
            { type: 'mutagedPlaces', palace: '命宫' },
            { type: 'surroundedPalaces', palace: '命宫' },
          ],
        },
      ],
    },
    outputSchema: {
      type: 'object',
      properties: {
        results: {
          type: 'array',
          description: '查询结果',
          items: {
            type: 'object',
            properties: {
              queryIndex: { type: 'number', description: '对应查询索引' },
              type: { type: 'string', description: '查询类型' },
              result: { description: '查询结果（boolean/数组/对象，取决于查询类型）' },
            },
          },
        },
      },
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: 'liuyao',
    description: '六爻分析 - 六爻卦象占卜分析，支持自动起卦或选卦。输出包含：本卦/变卦信息、六亲六神、旺衰状态（旺/相/休/囚/死）、空亡状态、用神/原神/忌神/仇神、三合局、六冲卦、定性应期线索、风险提示等。调用方/AI 需先根据问题语义选择目标六亲再调用；未明确问题时不应正式解卦。',
    inputSchema: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          minLength: 1,
          description: '占卜问题。必须是明确、非空的问题；空问题不进行正式解卦。',
        },
        yongShenTargets: {
          type: 'array',
          minItems: 1,
          description: '指定用神目标（必填），请由调用方/AI先判断语义再传入：父母=合同文书/证件/学业/房屋车辆/长辈；官鬼=功名求官/工作事业/规则/压力/风险/疾病，婚恋可作女问对象线索；兄弟=同辈/合作/竞争；妻财=钱财/交易/资源，婚恋可作男问对象线索；子孙=子女后辈/医药/技艺。',
          items: {
            type: 'string',
            enum: ['父母', '兄弟', '子孙', '妻财', '官鬼'],
          },
        },
        method: {
          type: 'string',
          enum: ['auto', 'select'],
          description: '起卦方式：auto=自动起卦，select=选卦。默认 auto',
        },
        hexagramName: {
          type: 'string',
          description: '选卦模式：卦名（如"天火同人"）或6位卦码（如"101111"）',
        },
        changedHexagramName: {
          type: 'string',
          description: '选卦模式：变卦名或卦码（可选，提供后自动计算变爻）',
        },
        date: {
          type: 'string',
          description: '占卜日期时间，格式 "YYYY-MM-DDTHH:MM" 或 "YYYY-MM-DD HH:MM:SS"，必须包含时间',
        },
        responseFormat: {
          type: 'string',
          enum: ['json', 'markdown'],
          description: '响应格式：json=结构化数据，markdown=人类可读文本',
          default: 'json',
        },
      },
      required: ['question', 'yongShenTargets', 'date'],
      examples: [
        { question: '本月事业运势如何？', yongShenTargets: ['官鬼'], method: 'auto' },
        { question: '财运怎么样？', yongShenTargets: ['妻财'], hexagramName: '天火同人' },
      ],
    },
    outputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: '占卜问题' },
        hexagramName: { type: 'string', description: '本卦名' },
        hexagramGong: { type: 'string', description: '卦宫' },
        hexagramElement: { type: 'string', description: '卦五行' },
        hexagramBrief: { type: 'string', description: '卦辞简介' },
        guaCi: { type: 'string', description: '卦辞（周易原文）' },
        xiangCi: { type: 'string', description: '象辞' },
        changedHexagramName: { type: 'string', description: '变卦名' },
        changedHexagramGong: { type: 'string', description: '变卦宫' },
        changedHexagramElement: { type: 'string', description: '变卦五行' },
        changedGuaCi: { type: 'string', description: '变卦卦辞' },
        changedXiangCi: { type: 'string', description: '变卦象辞' },
        ganZhiTime: {
          type: 'object',
          description: '干支时间',
          properties: {
            year: {
              type: 'object',
              properties: {
                gan: { type: 'string', description: '天干' },
                zhi: { type: 'string', description: '地支' },
              },
            },
            month: {
              type: 'object',
              properties: {
                gan: { type: 'string', description: '天干' },
                zhi: { type: 'string', description: '地支' },
              },
            },
            day: {
              type: 'object',
              properties: {
                gan: { type: 'string', description: '天干' },
                zhi: { type: 'string', description: '地支' },
              },
            },
            hour: {
              type: 'object',
              properties: {
                gan: { type: 'string', description: '天干' },
                zhi: { type: 'string', description: '地支' },
              },
            },
            xun: { type: 'string', description: '日柱所属旬' },
          },
        },
        kongWang: {
          type: 'object',
          description: '旬空',
          properties: {
            xun: { type: 'string', description: '旬名' },
            kongDizhi: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 2, description: '空亡地支（两个）' },
          },
        },
        kongWangByPillar: {
          type: 'object',
          description: '四柱旬空',
          properties: {
            year: { type: 'object', properties: { xun: { type: 'string' }, kongDizhi: { type: 'array', items: { type: 'string' } } } },
            month: { type: 'object', properties: { xun: { type: 'string' }, kongDizhi: { type: 'array', items: { type: 'string' } } } },
            day: { type: 'object', properties: { xun: { type: 'string' }, kongDizhi: { type: 'array', items: { type: 'string' } } } },
            hour: { type: 'object', properties: { xun: { type: 'string' }, kongDizhi: { type: 'array', items: { type: 'string' } } } },
          },
        },
        fullYaos: {
          type: 'array',
          description: '六爻详情',
          items: {
            type: 'object',
            properties: {
              position: { type: 'number', description: '爻位(1-6)' },
              type: { type: 'number', description: '爻类型(0阴/1阳)' },
              isChanging: { type: 'boolean', description: '是否变爻' },
              movementState: {
                type: 'string',
                enum: ['static', 'changing', 'hidden_moving', 'day_break'],
                description: '动静状态（静/明动/暗动/日破）',
              },
              movementLabel: { type: 'string', description: '动静状态中文标签' },
              liuQin: { type: 'string', description: '六亲' },
              liuShen: { type: 'string', description: '六神' },
              naJia: { type: 'string', description: '纳甲地支' },
              wuXing: { type: 'string', description: '五行' },
              isShiYao: { type: 'boolean', description: '是否世爻' },
              isYingYao: { type: 'boolean', description: '是否应爻' },
              kongWangState: { type: 'string', description: '空亡状态' },
              strength: {
                type: 'object',
                description: '定性旺衰证据',
                properties: {
                  wangShuai: { type: 'string', description: '旺衰(wang/xiang/xiu/qiu/si)' },
                  isStrong: { type: 'boolean', description: '是否旺相' },
                  specialStatus: { type: 'string', description: '特殊状态(none/anDong/riPo)' },
                  evidence: { type: 'array', items: { type: 'string' }, description: '判定证据' },
                },
              },
              changSheng: {
                type: 'object',
                description: '十二长生',
                properties: {
                  stage: { type: 'string', description: '长生阶段' },
                  strength: { type: 'string', description: '长生强弱标签' },
                },
              },
              shenSha: { type: 'array', items: { type: 'string' }, description: '本爻神煞' },
              yaoCi: { type: 'string', description: '本卦该爻位爻辞' },
              changedYao: {
                type: ['object', 'null'],
                description: '变出之爻（仅动爻有值）',
                properties: {
                  type: { type: 'number', description: '变爻类型(0阴/1阳)' },
                  liuQin: { type: 'string', description: '变爻六亲' },
                  naJia: { type: 'string', description: '变爻纳甲地支' },
                  wuXing: { type: 'string', description: '变爻五行' },
                  liuShen: { type: 'string', description: '变爻六神' },
                  yaoCi: { type: 'string', description: '对应变爻爻辞' },
                  relation: { type: 'string', description: '变爻关系（如回头克/回头生/化进/化退）' },
                },
              },
            },
          },
        },
        yongShen: {
          type: 'array',
          description: '用神分组列表（按目标六亲，保留主用神、候选与取用说明，不使用数值评分）',
          items: {
            type: 'object',
            properties: {
              targetLiuQin: { type: 'string', enum: ['父母', '兄弟', '子孙', '妻财', '官鬼'], description: '目标六亲' },
              selected: {
                type: 'object',
                description: '当前主用神',
                properties: {
                  liuQin: { type: 'string', description: '六亲' },
                  naJia: { type: 'string', description: '纳甲地支' },
                  changedNaJia: { type: 'string', description: '变出地支（动爻时）' },
                  huaType: { type: 'string', description: '化变类型（如回头生/回头克/化进/化退）' },
                  element: { type: 'string', description: '五行' },
                  position: { type: 'number', description: '位置' },
                  source: { type: 'string', enum: ['visible', 'changed', 'temporal', 'fushen'], description: '来源（明现/变出/月日代用/伏神）' },
                  strength: { type: 'string', enum: ['strong', 'moderate', 'weak', 'unknown'], description: '定性强弱' },
                  strengthLabel: { type: 'string', description: '强弱标签' },
                  movementState: { type: 'string', enum: ['static', 'changing', 'hidden_moving', 'day_break'], description: '动静状态' },
                  movementLabel: { type: 'string', description: '动静状态中文标签' },
                  isShiYao: { type: 'boolean', description: '是否世爻' },
                  isYingYao: { type: 'boolean', description: '是否应爻' },
                  kongWangState: { type: 'string', description: '空亡状态' },
                  evidence: { type: 'array', items: { type: 'string' }, description: '证据项' },
                },
              },
              candidates: {
                type: 'array',
                description: '用神候选列表（用于并看和校核，不代表数值高低）',
                items: {
                  type: 'object',
                  properties: {
                    liuQin: { type: 'string', description: '六亲' },
                    naJia: { type: 'string', description: '纳甲地支' },
                    changedNaJia: { type: 'string', description: '变出地支（动爻时）' },
                    huaType: { type: 'string', description: '化变类型（如回头生/回头克/化进/化退）' },
                    element: { type: 'string', description: '五行' },
                    position: { type: 'number', description: '位置' },
                    source: { type: 'string', enum: ['visible', 'changed', 'temporal', 'fushen'], description: '来源（明现/变出/月日代用/伏神）' },
                    strength: { type: 'string', enum: ['strong', 'moderate', 'weak', 'unknown'], description: '定性强弱' },
                    strengthLabel: { type: 'string', description: '强度标签' },
                    movementState: { type: 'string', enum: ['static', 'changing', 'hidden_moving', 'day_break'], description: '动静状态' },
                    movementLabel: { type: 'string', description: '动静状态中文标签' },
                    isShiYao: { type: 'boolean', description: '是否世爻' },
                    isYingYao: { type: 'boolean', description: '是否应爻' },
                    kongWangState: { type: 'string', description: '空亡状态' },
                    evidence: { type: 'array', items: { type: 'string' }, description: '证据项' },
                  },
                },
              },
              selectionStatus: { type: 'string', enum: ['resolved', 'ambiguous', 'from_changed', 'from_temporal', 'from_fushen', 'missing'], description: '取用状态' },
              selectionNote: { type: 'string', description: '取用说明' },
            },
          },
        },
        shenSystemByYongShen: {
          type: 'array',
          description: '按目标用神输出的神系',
          items: {
            type: 'object',
            properties: {
              targetLiuQin: { type: 'string', enum: ['父母', '兄弟', '子孙', '妻财', '官鬼'], description: '目标六亲' },
              yuanShen: {
                type: 'object',
                description: '原神',
                properties: {
                  liuQin: { type: 'string', description: '六亲' },
                  wuXing: { type: 'string', description: '五行' },
                  positions: { type: 'array', items: { type: 'number' }, description: '位置' },
                },
              },
              jiShen: {
                type: 'object',
                description: '忌神',
                properties: {
                  liuQin: { type: 'string', description: '六亲' },
                  wuXing: { type: 'string', description: '五行' },
                  positions: { type: 'array', items: { type: 'number' }, description: '位置' },
                },
              },
              chouShen: {
                type: 'object',
                description: '仇神',
                properties: {
                  liuQin: { type: 'string', description: '六亲' },
                  wuXing: { type: 'string', description: '五行' },
                  positions: { type: 'array', items: { type: 'number' }, description: '位置' },
                },
              },
            },
          },
        },
        globalShenSha: {
          type: 'array',
          description: '整盘级神煞',
          items: { type: 'string' },
        },
        fuShen: {
          type: 'array',
          description: '伏神',
          items: {
            type: 'object',
            properties: {
              liuQin: { type: 'string', description: '六亲' },
              wuXing: { type: 'string', description: '五行' },
              naJia: { type: 'string', description: '纳甲地支' },
              feiShenPosition: { type: 'number', description: '飞神位置' },
              feiShenLiuQin: { type: 'string', description: '飞神六亲' },
              availabilityStatus: { type: 'string', enum: ['available', 'conditional', 'blocked'], description: '可取状态' },
              availabilityReason: { type: 'string', description: '可用原因' },
            },
          },
        },
        liuChongGuaInfo: {
          type: 'object',
          description: '六冲卦信息',
          properties: {
            isLiuChongGua: { type: 'boolean', description: '是否六冲卦' },
            description: { type: 'string', description: '描述' },
          },
        },
        sanHeAnalysis: {
          type: 'object',
          description: '三合局分析',
          properties: {
            hasFullSanHe: { type: 'boolean', description: '是否有完整三合' },
            fullSanHe: {
              type: 'object',
              description: '完整三合',
              properties: {
                name: { type: 'string', description: '三合名' },
                result: { type: 'string', description: '结果' },
                positions: { type: 'array', items: { type: 'number' }, description: '位置' },
                description: { type: 'string', description: '成局说明' },
              },
            },
            fullSanHeList: {
              type: 'array',
              description: '命中的完整三合/三合迹象列表',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string', description: '三合名' },
                  result: { type: 'string', description: '结果' },
                  positions: { type: 'array', items: { type: 'number' }, description: '位置' },
                  description: { type: 'string', description: '成局说明' },
                },
              },
            },
            hasBanHe: { type: 'boolean', description: '是否有半合' },
            banHe: {
              type: 'array',
              description: '半合列表',
              items: {
                type: 'object',
                properties: {
                  branches: { type: 'array', items: { type: 'string' }, description: '地支' },
                  result: { type: 'string', description: '结果' },
                  type: { type: 'string', description: '类型' },
                  positions: { type: 'array', items: { type: 'number' }, description: '位置' },
                },
              },
            },
          },
        },
        warnings: { type: 'array', items: { type: 'string' }, description: '凶吉警告' },
        timeRecommendations: {
          type: 'array',
          description: '应期建议（定性触发线索）',
          items: {
            type: 'object',
            properties: {
              targetLiuQin: { type: 'string', enum: ['父母', '兄弟', '子孙', '妻财', '官鬼'], description: '目标六亲' },
              type: { type: 'string', description: '类型(favorable/unfavorable/critical)' },
              trigger: { type: 'string', description: '触发条件' },
              earthlyBranch: { type: 'string', description: '地支' },
              basis: { type: 'array', items: { type: 'string' }, description: '判定依据' },
              description: { type: 'string', description: '描述' },
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
  },
  {
    name: 'tarot',
    description: '塔罗抽牌 - 塔罗牌抽牌占卜，支持多种牌阵',
    inputSchema: {
      type: 'object',
      properties: {
        spreadType: {
          type: 'string',
          enum: ['single', 'three-card', 'love', 'celtic-cross'],
          description: '牌阵类型：single=单牌，three-card=三牌，love=爱情牌阵，celtic-cross=凯尔特十字。默认 single',
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
        responseFormat: {
          type: 'string',
          enum: ['json', 'markdown'],
          description: '响应格式：json=结构化数据，markdown=人类可读文本',
          default: 'json',
        },
      },
      required: [],
      examples: [
        { spreadType: 'three-card', question: '本月运势如何？' },
        { spreadType: 'love', question: '我和他的未来发展？', allowReversed: true },
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
  },
  {
    name: 'almanac',
    description: '黄历查询 - 查询指定日期的干支、宜忌、冲煞、吉神凶煞等黄历信息，可选传入日主计算流日十神',
    inputSchema: {
      type: 'object',
      properties: {
        dayMaster: {
          type: 'string',
          enum: ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'],
          description: '日主天干（如已知）',
        },
        birthYear: {
          type: 'number',
          description: '出生年（用于计算日主）',
        },
        birthMonth: {
          type: 'number',
          description: '出生月',
        },
        birthDay: {
          type: 'number',
          description: '出生日',
        },
        birthHour: {
          type: 'number',
          description: '出生时',
        },
        date: {
          type: 'string',
          description: '目标日期 (YYYY-MM-DD)，默认今天',
        },
        responseFormat: {
          type: 'string',
          enum: ['json', 'markdown'],
          description: '响应格式：json=结构化数据，markdown=人类可读文本',
          default: 'json',
        },
      },
      required: [],
      examples: [
        { birthYear: 1990, birthMonth: 1, birthDay: 15, birthHour: 9, date: '2026-02-14' },
        { dayMaster: '丙', date: '2026-02-14' },
      ],
    },
    outputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: '日期' },
        dayInfo: {
          type: 'object',
          description: '日干支',
          properties: {
            stem: { type: 'string', description: '天干' },
            branch: { type: 'string', description: '地支' },
            ganZhi: { type: 'string', description: '干支' },
          },
        },
        tenGod: { type: 'string', description: '流日十神' },
        almanac: {
          type: 'object',
          description: '黄历',
          properties: {
            lunarDate: { type: 'string', description: '农历日期' },
            lunarMonth: { type: 'string', description: '农历月份' },
            lunarDay: { type: 'string', description: '农历日' },
            zodiac: { type: 'string', description: '生肖' },
            solarTerm: { type: 'string', description: '节气（如有）' },
            suitable: { type: 'array', items: { type: 'string' }, description: '宜' },
            avoid: { type: 'array', items: { type: 'string' }, description: '忌' },
            chongSha: { type: 'string', description: '冲煞' },
            pengZuBaiJi: { type: 'array', items: { type: 'string' }, description: '彭祖百忌' },
            jishen: { type: 'array', items: { type: 'string' }, description: '吉神宜趋' },
            xiongsha: { type: 'array', items: { type: 'string' }, description: '凶煞宜忌' },
          },
        },
      },
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
];

export type ToolInput = BaziInput | BaziPillarsResolveInput | ZiweiInput | ZiweiHoroscopeInput | ZiweiFlyingStarInput | LiuyaoInput | TarotInput | FortuneInput | DayunInput;
