# @mingai/mcp

MingAI MCP Server - 命理计算工具，支持八字、紫微斗数、六爻、塔罗等。

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
| `bazi_calculate` | 八字排盘 - 四柱、藏干、十神、神煞、空亡、刑冲合害 |
| `bazi_pillars_resolve` | 八字反查 - 根据四柱天干地支反推出生时间候选 |
| `ziwei_calculate` | 紫微斗数排盘 - 十二宫、星曜、四化、大运流年 |
| `liuyao_analyze` | 六爻排卦分析 - 纳甲、六亲、世应、用神、旺衰、空亡 |
| `tarot_draw` | 塔罗抽牌 - 支持多种牌阵，含正逆位与牌义 |
| `daily_fortune` | 每日运势 - 基于干支历的每日吉凶宜忌 |
| `dayun_calculate` | 大运计算 - 十年大运周期与流年分析 |

所有工具均支持 `responseFormat` 参数（`json` 或 `markdown`），可控制输出格式。

## 其他安装方式

全局安装后直接使用命令行：

```bash
npm install -g @mingai/mcp
```

## 相关包

- [@mingai/mcp-core](https://www.npmjs.com/package/@mingai/mcp-core) - 核心计算库，可作为 SDK 直接在代码中调用
