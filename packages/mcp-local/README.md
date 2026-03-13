# @mingai/mcp

MingAI MCP Server — 命理计算工具，支持八字、紫微斗数、六爻、塔罗等。

基于 [Model Context Protocol (MCP)](https://modelcontextprotocol.io) 标准，可在 Claude Desktop、Cursor 等支持 MCP 的客户端中使用。

## 快速开始

在 Claude Desktop（或 Cursor 等）的 MCP 配置中添加：

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

无需手动下载或安装，客户端会自动拉取并运行。唯一前提是本机已安装 [Node.js](https://nodejs.org)（v18+）。

## 可用工具

| 工具 | 说明 |
|------|------|
| `bazi_calculate` | 八字排盘 — 四柱、藏干、十神、神煞、空亡、刑冲合害。支持真太阳时（可选传入经度） |
| `bazi_pillars_resolve` | 八字反查 — 根据四柱干支反推出生时间候选 |
| `bazi_dayun` | 八字大运 — 十年大运周期、干支十神、藏干、神煞 |
| `ziwei_calculate` | 紫微排盘 — 十二宫、星曜(亮度/四化/宫干自化↓↑)、长生/博士12神、来因宫、流年虚岁、斗君、大限范围。支持真太阳时（可选传入经度） |
| `ziwei_horoscope` | 紫微运限 — 大限/小限/流年/流月/流日/流时 |
| `ziwei_flying_star` | 紫微飞星 — 飞化判断、自化检测、四化落宫、三方四正 |
| `liuyao` | 六爻分析 — 纳甲、六亲、世应、用神、旺衰、空亡、应期 |
| `tarot` | 塔罗抽牌 — 多种牌阵，含正逆位与牌义 |
| `almanac` | 黄历查询 — 干支、宜忌、冲煞、吉神凶煞 |

所有工具均支持 `responseFormat` 参数（`json` 或 `markdown`），可控制输出格式。

## 其他安装方式

```bash
npm install -g @mingai/mcp
```

## 相关包

- [@mingai/mcp-core](https://www.npmjs.com/package/@mingai/mcp-core) — 核心计算库，可作为 SDK 直接在代码中调用
