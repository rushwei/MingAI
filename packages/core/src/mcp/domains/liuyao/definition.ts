import type { ToolDefinition } from '../../contract.js';

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
        description: '占卜日期时间，格式"YYYY-MM-DDTHH:MM" 或 "YYYY-MM-DD HH:MM:SS"，必须包含时间',
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
        description: '输出细节级别：default=核心盘面；more=补充扩展盘面信息；full=补充完整盘面与关系细节。',
        default: 'default',
      },
    },
    required: ['question', 'yongShenTargets', 'date'],
    examples: [
      { question: '本月事业运势如何？', yongShenTargets: ['官鬼'], method: 'auto', date: '2026-02-10T09:30:00' },
      { question: '财运怎么样？', yongShenTargets: ['妻财'], hexagramName: '天火同人', date: '2026-02-10 14:00:00' },
    ],
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: false,
  },
};
