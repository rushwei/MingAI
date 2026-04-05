import type { ToolDefinition } from '../shared/tool-types.js';

export const liuyaoDefinition: ToolDefinition = {
  name: 'liuyao',
  description: '六爻分析 - 六爻卦象占卜分析，支持自动起卦、选卦、时间起卦、数字起卦。输出包含：本卦/变卦/互卦/错卦/综卦信息、卦身、六亲六神、飞伏神（缺亲从本宫首卦取伏神标注生克关系）、旺衰状态（旺/相/休/囚/死）、暗动/日破/月破、进神退神/反吟伏吟、空亡状态、用神/原神/忌神/仇神、三合局、六冲卦、定性应期线索、风险提示等。调用方/AI 需先根据问题语义选择目标六亲再调用；未明确问题时不应正式解卦。',
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
        enum: ['auto', 'select', 'time', 'number'],
        description: '起卦方式：auto=自动起卦，select=选卦，time=时间起卦（按占卜日期的农历年月日时辰自动起卦），number=数字起卦（需提供 numbers）。默认 auto',
      },
      numbers: {
        type: 'array',
        items: { type: 'number' },
        minItems: 2,
        maxItems: 3,
        description: '数字起卦所用数字（仅 method=number 时需要），必须为正整数。2个数字：上卦=num1%8, 下卦=num2%8, 动爻=(num1+num2)%6；3个数字：上卦=num1%8, 下卦=num2%8, 动爻=num3%6',
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
      detailLevel: {
        type: 'string',
        enum: ['default', 'more', 'full'],
        description: '输出细节级别：default=默认精简输出；more=追加确定性事实扩展；full=再追加确定性规则分类',
        default: 'default',
      },
    },
    required: ['question', 'yongShenTargets', 'date'],
    examples: [
      { question: '本月事业运势如何？', yongShenTargets: ['官鬼'], method: 'auto', date: '2026-02-10T09:30:00' },
      { question: '财运怎么样？', yongShenTargets: ['妻财'], hexagramName: '天火同人', date: '2026-02-10 14:00:00' },
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
                relation: { type: 'string', description: '变爻关系（如回头克/回头生/化进/化退/伏吟/反吟）' },
              },
            },
            fuShen: {
              type: 'object',
              description: '伏神信息（仅当本卦缺少某六亲时，从本宫首卦取伏神标注于该爻位下）',
              properties: {
                liuQin: { type: 'string', description: '伏神六亲' },
                naJia: { type: 'string', description: '伏神纳甲地支' },
                wuXing: { type: 'string', description: '伏神五行' },
                relation: { type: 'string', description: '伏神与飞神的生克关系（飞生伏/飞克伏/伏生飞/伏克飞/比和）' },
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
      nuclearHexagram: {
        type: 'object',
        description: '互卦（取2-3-4爻为下卦、3-4-5爻为上卦组成的卦）',
        properties: {
          name: { type: 'string', description: '卦名' },
          guaCi: { type: 'string', description: '卦辞' },
          xiangCi: { type: 'string', description: '象辞' },
        },
      },
      oppositeHexagram: {
        type: 'object',
        description: '错卦（六爻阴阳全部相反的卦）',
        properties: {
          name: { type: 'string', description: '卦名' },
          guaCi: { type: 'string', description: '卦辞' },
          xiangCi: { type: 'string', description: '象辞' },
        },
      },
      reversedHexagram: {
        type: 'object',
        description: '综卦（六爻顺序上下颠倒的卦）',
        properties: {
          name: { type: 'string', description: '卦名' },
          guaCi: { type: 'string', description: '卦辞' },
          xiangCi: { type: 'string', description: '象辞' },
        },
      },
      guaShen: {
        type: 'object',
        description: '卦身（由世爻位置和阴阳推算的地支，定位于卦中某爻或不在卦中）',
        properties: {
          branch: { type: 'string', description: '卦身地支' },
          linePosition: { type: 'number', description: '卦身所在爻位(1-6)' },
          absent: { type: 'boolean', description: '卦身是否不在卦中（true=卦身飞伏）' },
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
