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

// 八字排盘（支持真太阳时）
const bazi = await handleToolCall('bazi_calculate', {
  gender: 'male',
  birthYear: 1990,
  birthMonth: 1,
  birthDay: 15,
  birthHour: 9,
  longitude: 116.4, // 可选：出生地经度，启用真太阳时校正
});

// 紫微斗数排盘（含宫干自化、流年虚岁、斗君等）
const ziwei = await handleToolCall('ziwei_calculate', {
  gender: 'male',
  birthYear: 2003,
  birthMonth: 9,
  birthDay: 2,
  birthHour: 10,
  birthMinute: 30,
  longitude: 116.4, // 可选：出生地经度，启用真太阳时校正
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

### 1.1.4 (2026-03-13)

**六爻增强：**
- ✨ `liuyao` 的 `date` 字段现为必填，且必须包含时间部分（格式：`YYYY-MM-DDTHH:MM` 或 `YYYY-MM-DD HH:MM:SS`），时辰影响时柱与空亡计算
- 🗑️ 移除 `seed` 输入参数，改为基于日期时辰自动生成确定性随机序列（相同日期时辰可复现）

### 1.1.3 (2026-03-13)

**六爻增强：**
- ✨ `liuyao` 的 `date` 字段现支持完整日期时间（`YYYY-MM-DDTHH:MM:SS` 或 `YYYY-MM-DD HH:MM:SS`），时辰影响时柱干支
- 🐛 修复仅传日期时时柱硬编码为午时的问题，改为使用当前时刻

### 1.1.2 (2026-03-13)

**紫微斗数增强：**
- ✨ 新增真太阳时支持：`ziwei_calculate` 和 `bazi_calculate` 支持可选 `longitude` 参数，自动计算真太阳时校正（使用 Spencer 1971 时差方程）
- ✨ 新增宫干自化标注：`ziwei_calculate` 输出星曜的离心自化（↓）和向心自化（↑）
- ✨ 新增流年虚岁：每宫输出 `liuNianAges` 数组，显示流年落宫的虚岁列表
- ✨ 新增斗君：输出 `douJun` 字段（子年斗君地支）
- ✨ 新增大限范围：每宫输出 `decadalRange` 数组 `[起始虚岁, 结束虚岁]`

**八字增强：**
- ✨ 新增真太阳时支持：`bazi_calculate` 支持可选 `longitude` 参数（仅公历有效）

### 1.1.0 (2026-03-13)

新增 `ziwei_horoscope`（运限）、`ziwei_flying_star`（飞星）；`ziwei_calculate` 补充来因宫、长生/博士12神、四化分布等字段。工具重命名：`dayun_calculate` → `bazi_dayun`、`liuyao_analyze` → `liuyao`、`tarot_draw` → `tarot`、`daily_fortune` → `almanac`。

