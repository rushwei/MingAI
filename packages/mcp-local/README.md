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
| `bazi_calculate` | 八字排盘 — 四柱、藏干、十神、51种神煞、天干五合、地支半合、空亡、刑冲合害。支持真太阳时（可选传入经度） |
| `bazi_pillars_resolve` | 八字反查 — 根据四柱干支反推出生时间候选 |
| `bazi_dayun` | 八字大运 — 十年大运周期、流年详情、太岁标注、小运、地支关系分析 |
| `ziwei_calculate` | 紫微排盘 — 十二宫、星曜(亮度/四化/宫干自化↓↑)、命主星/身主星、长生/博士12神、来因宫、流年虚岁、斗君、大限范围、三方四正。支持真太阳时（可选传入经度） |
| `ziwei_horoscope` | 紫微运限 — 大限/小限/流年/流月/流日/流时、流年星曜（流禄/流羊/流陀/流昌/流曲） |
| `ziwei_flying_star` | 紫微飞星 — 飞化判断、自化检测、四化落宫、三方四正 |
| `liuyao` | 六爻分析 — 纳甲、六亲、世应、用神、旺衰、空亡、应期、互卦/错卦/综卦、卦身。支持时间起卦、数字起卦。|
| `tarot` | 塔罗抽牌 — 9种牌阵、78张完整牌面、独立逆位关键词、星座/行星/元素对应 |
| `almanac` | 黄历查询 — 干支、宜忌、冲煞、吉神凶煞、方位系统、建除十二值星、12时辰吉凶、二十八星宿 |
| `qimen_calculate` | 奇门遁甲 — 九宫、八门、九星、八神、值符值使、旬首、时空信息。支持显式时区与寄宫配置 |
| `daliuren` | 大六壬 — 四课三传、天地盘、神将、六亲、旬空、课体。支持显式时区输入 |

所有工具均支持 `responseFormat` 参数（`json` 或 `markdown`），可控制输出格式。

## 其他安装方式

```bash
npm install -g @mingai/mcp
```

## 相关包

- [@mingai/mcp-core](https://www.npmjs.com/package/@mingai/mcp-core) — 核心计算库，可作为 SDK 直接在代码中调用
