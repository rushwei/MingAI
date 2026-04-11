# @mingai/core

MingAI 的命理术数算法核心库。

它提供两类能力：

- 各术数（八字、紫薇、奇门、大六壬、六爻、梅花易数、塔罗、黄历、小六壬、太乙九星、西方占星）的算法、类型，以及规范化 text/json 输出
- MCP 工具定义、输入校验、执行入口与统一响应适配

## 安装

```bash
npm install @mingai/core
```

如需使用 GitHub Packages 镜像包，请改用 `@hhszzzz/mingai-core`。npmjs 主包名仍然是 `@mingai/core`。

## Quick Start

### 直接使用某个术数

```ts
import { calculateBazi, toBaziText, toBaziJson } from '@mingai/core/bazi';

const chart = calculateBazi({
  gender: 'male',
  birthYear: 1990,
  birthMonth: 1,
  birthDay: 15,
  birthHour: 9,
});

const text = toBaziText(chart);
const json = toBaziJson(chart);
```

### 按 MCP 工具名执行

```ts
import { executeTool, renderToolResult } from '@mingai/core/mcp';

const result = await executeTool('qimen', {
  year: 2026,
  month: 3,
  day: 19,
  hour: 21,
  minute: 30,
  timezone: 'Asia/Shanghai',
});

const rendered = renderToolResult('qimen', result, 'json');
```

## 选择入口

- `@mingai/core`
  - 根入口，聚合常用术数能力与类型
- `@mingai/core/mcp`
  - MCP 工具执行与输出适配
- `@mingai/core/<domain>`
  - 某个术数的算法、类型、`to*Text()`、`to*Json()`

当前 domain 子路径包括：

- `@mingai/core/bazi`
- `@mingai/core/bazi-dayun`
- `@mingai/core/bazi-pillars-resolve`
- `@mingai/core/astrology`
- `@mingai/core/almanac`
- `@mingai/core/liuyao`
- `@mingai/core/meihua`
- `@mingai/core/ziwei`
- `@mingai/core/ziwei-horoscope`
- `@mingai/core/ziwei-flying-star`
- `@mingai/core/qimen`
- `@mingai/core/taiyi`
- `@mingai/core/daliuren`
- `@mingai/core/tarot`
- `@mingai/core/xiaoliuren`

额外公开的共享子路径：

- `@mingai/core/utils`
- `@mingai/core/timezone-utils`
- `@mingai/core/data/hexagrams`
- `@mingai/core/data/shensha`

## 包结构

- `domains/`
  - 各术数 domain 的算法、本领域类型，以及 canonical text/json 输出
- `mcp/`
  - MCP 工具定义、schema、执行与统一 payload 适配
- `shared/`
  - 跨 domain 复用的公共工具
- `data/`
  - 干支、神煞、卦象文本等基础数据

## 工具列表

| 工具 | 说明 |
|------|------|
| `bazi` | 八字排盘 |
| `bazi_pillars_resolve` | 四柱反推出生时间候选 |
| `bazi_dayun` | 大运、小运、流年链路计算 |
| `ziwei` | 紫微斗数排盘 |
| `ziwei_horoscope` | 紫微运限 |
| `ziwei_flying_star` | 紫微飞星与四化落宫分析 |
| `liuyao` | 六爻排卦与分析 |
| `meihua` | 梅花易数起卦与断卦 |
| `tarot` | 塔罗抽牌 |
| `almanac` | 黄历与择日信息 |
| `astrology` | 西方占星命盘与流运 |
| `qimen` | 奇门遁甲排盘 |
| `taiyi` | 太乙九星观测 |
| `daliuren` | 大六壬排盘 |
| `xiaoliuren` | 小六壬占测 |

## 输出约定

`@mingai/core/mcp` 的 `renderToolResult(...)` 和 `buildToolSuccessPayload(...)` 使用统一输出契约：

- `content`
  - 始终返回 canonical text，适合直接阅读
- `structuredContent`
  - 当工具声明了 `outputSchema` 时返回 canonical JSON，适合程序消费

也就是说：

- 如果你是人类阅读场景，读 `content`
- 如果你是 schema 驱动场景，读 `structuredContent`

## 地点与真太阳时

- `@mingai/core` 本身不接地图服务，也不会把地点名自动换算成经度
- `birthPlace` 仅用于展示或存档
- 需要真太阳时时，请显式传入 `longitude`
- 如果上层只收“广东广州”这类地点名，应先在 web/server 或 MCP 外层做地理编码，再把经度传给 core

## Related Packages

- [`@mingai/mcp`](https://www.npmjs.com/package/@mingai/mcp)
  - 适合本地 `stdio` MCP Server 场景
- [`@mingai/mcp-server`](https://www.npmjs.com/package/@mingai/mcp-server)
  - 适合独立部署的 MCP 服务端场景
