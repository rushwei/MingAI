# @mingai/mcp-core

MingAI 命理计算核心库，提供八字、紫微斗数、六爻、塔罗等计算能力。

可作为 SDK 直接在 Node.js 项目中调用，也是 [@mingai/mcp](https://www.npmjs.com/package/@mingai/mcp) 的底层依赖。

## 安装

```bash
npm install @mingai/mcp-core
```

## 使用示例

```typescript
import { handleToolCall } from '@mingai/mcp-core';

// 八字排盘
const bazi = await handleToolCall('bazi_calculate', {
  gender: 'male',
  birthYear: 1990,
  birthMonth: 1,
  birthDay: 15,
  birthHour: 9,
});

// 六爻排卦
const liuyao = await handleToolCall('liuyao', {
  question: '事业发展如何',
  yongShenTargets: ['官鬼'],
});
```

## 可用工具

| 工具 | 说明 |
|------|------|
| `bazi_calculate` | 八字排盘 |
| `bazi_pillars_resolve` | 八字反查（四柱 → 出生时间候选） |
| `bazi_dayun` | 八字大运计算 |
| `ziwei_calculate` | 紫微斗数排盘（含长生12神、博士12神、四化分布等） |
| `ziwei_horoscope` | 紫微运限（大限/小限/流年/流月/流日/流时） |
| `ziwei_flying_star` | 紫微飞星分析（飞化/自化/四化落宫/三方四正） |
| `liuyao` | 六爻排卦分析 |
| `tarot` | 塔罗抽牌 |
| `almanac` | 黄历查询 |

## API

```typescript
import { tools, handleToolCall, formatAsMarkdown } from '@mingai/mcp-core';

// tools - 所有工具的定义数组（含 inputSchema / outputSchema）
// handleToolCall(name, args) - 调用指定工具，返回结构化结果
// formatAsMarkdown(name, result) - 将结果格式化为 Markdown 文本
```

## 如果你想在 AI 客户端中使用

不需要直接安装 mcp-core，请使用 [@mingai/mcp](https://www.npmjs.com/package/@mingai/mcp)，它是开箱即用的 MCP Server：

```json
{
  "mcpServers": {
    "mingai": {
      "command": "npx",
      "args": ["-y", "@mingai/mcp"]
    }
  }
}
```

## 更新日志

### 1.1.0 (2026-03-13)

新增 `ziwei_horoscope`（运限）、`ziwei_flying_star`（飞星）；`ziwei_calculate` 补充来因宫、长生/博士12神、四化分布等字段。工具重命名：`dayun_calculate` → `bazi_dayun`、`liuyao_analyze` → `liuyao`、`tarot_draw` → `tarot`、`daily_fortune` → `almanac`。
