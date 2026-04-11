import type { ToolDefinition } from '../../contract.js';

export const astrologyDefinition: ToolDefinition = {
  name: 'astrology',
  description: '西方占星命盘 - 基于出生时刻生成本命与流运核心数据；提供经纬度时输出完整命盘（含上升/天顶/宫位），未提供时 default/more 会降级为近似盘，full 仍要求完整坐标。',
  inputSchema: {
    type: 'object',
    properties: {
      birthYear: { type: 'number', description: '出生年 (> 0)' },
      birthMonth: { type: 'number', description: '出生月 (1-12)' },
      birthDay: { type: 'number', description: '出生日 (1-31)' },
      birthHour: { type: 'number', description: '出生时 (0-23)' },
      birthMinute: { type: 'number', description: '出生分 (0-59)，默认 0' },
      latitude: { type: 'number', description: '出生地纬度 (-90 到 90)。与 longitude 一起提供时输出完整命盘；省略时 default/more 会退化为近似盘' },
      longitude: { type: 'number', description: '出生地经度 (-180 到 180)。与 latitude 一起提供时输出完整命盘；省略时 default/more 会退化为近似盘' },
      birthPlace: { type: 'string', description: '出生地点文本（可选，仅用于展示；在线 MCP Server 可尝试解析经纬度。core 本身不会解析）' },
      transitDateTime: { type: 'string', description: '流运时刻。支持 YYYY-MM-DDTHH:mm[:ss] 本地格式，或带时区偏移的 ISO 时间' },
      houseSystem: { type: 'string', enum: ['placidus'], description: '宫制：当前仅支持 placidus' },
      responseFormat: {
        type: 'string',
        enum: ['json', 'markdown'],
        description: '响应格式：json=结构化数据，markdown=人类可读文本',
        default: 'json',
      },
      detailLevel: {
        type: 'string',
        enum: ['default', 'more', 'full'],
        description: '输出细节级别：default=核心结果，缺坐标时退化为近似盘；more=暂与 default 一致；full=追加附加点与宫位明细，且要求完整坐标',
        default: 'default',
      },
    },
    required: ['birthYear', 'birthMonth', 'birthDay', 'birthHour'],
    allOf: [
      {
        if: {
          required: ['latitude'],
        },
        then: {
          required: ['longitude'],
        },
      },
      {
        if: {
          required: ['longitude'],
        },
        then: {
          required: ['latitude'],
        },
      },
      {
        if: {
          properties: {
            detailLevel: { const: 'full' },
          },
          required: ['detailLevel'],
        },
        then: {
          required: ['latitude', 'longitude'],
        },
      },
    ],
    examples: [
      {
        birthYear: 1990,
        birthMonth: 1,
        birthDay: 1,
        birthHour: 12,
        birthMinute: 30,
        latitude: 40.7128,
        longitude: -74.006,
        transitDateTime: '2026-04-10T09:30:00',
      },
    ],
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  },
};
