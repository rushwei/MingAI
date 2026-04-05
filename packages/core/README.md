# @mingai/core

MingAI 的 MCP 共享核心库，负责工具定义、规范文本输出、结构化输出与命理算法能力本体。

它同时服务于：

- [`@mingai/mcp`](https://www.npmjs.com/package/@mingai/mcp) `stdio` 本地 MCP Server
- MingAI Web 端对共享命理算法的直接复用

## 安装

```bash
npm install @mingai/core
```

如需从 GitHub Packages 安装镜像包，请改用 `@hhszzzz/mingai-core`，并把 `@hhszzzz` scope 指向 `https://npm.pkg.github.com`。npmjs 主包名仍然是 `@mingai/core`。

## 工具列表

| 工具 | 说明 |
|------|------|
| `bazi_calculate` | 八字排盘，支持阳历/农历、真太阳时、分柱神煞、空亡、刑冲合害 |
| `bazi_pillars_resolve` | 四柱反推出生时间候选 |
| `bazi_dayun` | 大运、小运、流年链路计算 |
| `ziwei_calculate` | 紫微斗数排盘 |
| `ziwei_horoscope` | 紫微运限 |
| `ziwei_flying_star` | 紫微飞星与四化落宫分析 |
| `liuyao` | 六爻排卦与分析 |
| `tarot` | 塔罗抽牌 |
| `almanac` | 黄历与择日信息 |
| `qimen_calculate` | 奇门遁甲排盘，支持显式时区与寄宫配置 |
| `daliuren` | 大六壬排盘，支持显式时区输入 |

## 地点与真太阳时

- `@mingai/core` 本身不接地图服务，也不会把地点名自动换算成经度。
- `bazi_calculate` 的 `birthPlace` 仅用于展示/存档。
- 需要真太阳时时，请显式传入 `longitude`。
- 如果你的上层产品只收“广东广州”这类地点名，应在 `web/server` 或 MCP 外层先做地理编码，再把经度传给 `core`。

## 使用示例

### 1. 直接按工具名分发

```ts
import { handleToolCall } from '@mingai/core';

const result = await handleToolCall('qimen_calculate', {
  year: 2026,
  month: 3,
  day: 19,
  hour: 21,
  minute: 30,
  timezone: 'Asia/Shanghai',
  responseFormat: 'json',
});
```

### 2. 按子路径导入具体能力

```ts
import { calculateDaliurenData } from '@mingai/core/daliuren-core';

const chart = calculateDaliurenData({
  date: '2026-03-19',
  hour: 9,
  minute: 30,
  timezone: 'Asia/Shanghai',
});
```

### 3. 六爻调用要包含时间

```ts
import { handleToolCall } from '@mingai/core';

const liuyao = await handleToolCall('liuyao', {
  question: '本周项目推进是否顺利？',
  yongShenTargets: ['官鬼'],
  date: '2026-03-19T21:30:00',
});
```

### 4. 复用统一输出适配

```ts
import { renderToolResult } from '@mingai/core';

const rendered = renderToolResult('bazi_calculate', result, 'json');

// rendered.content -> canonical text
// rendered.structuredContent -> canonical JSON
```

## 对外导出

| 导出入口 | 用途 |
|---------|------|
| `@mingai/core` | `tools`、`toolRegistry`、`handleToolCall`、`renderToolResult` |
| `@mingai/core/bazi-core` | 八字核心算法 |
| `@mingai/core/bazi-pillars-resolve-core` | 四柱反推候选时间 |
| `@mingai/core/dayun-core` | 大运核心算法 |
| `@mingai/core/fortune-core` | 黄历/每日运势核心算法 |
| `@mingai/core/liuyao-core` | 六爻共享核心 |
| `@mingai/core/meihua-core` | 梅花易数核心算法 |
| `@mingai/core/ziwei-core` | 紫微排盘与共享 helper |
| `@mingai/core/ziwei-horoscope-core` | 紫微运限核心算法 |
| `@mingai/core/ziwei-flying-star-core` | 紫微飞星分析核心算法 |
| `@mingai/core/qimen-core` | 奇门遁甲核心算法 |
| `@mingai/core/daliuren-core` | 大六壬核心算法 |
| `@mingai/core/tarot-core` | 塔罗抽牌核心算法 |
| `@mingai/core/utils` | 共享工具函数 |
| `@mingai/core/timezone-utils` | 命理时间与时区辅助函数 |
| `@mingai/core/transport` | `buildListToolsPayload` / `buildToolSuccessPayload` |
| `@mingai/core/text` | `render*CanonicalText()` 规范文本输出 |
| `@mingai/core/json` | `render*CanonicalJSON()` Web 侧 canonical JSON 输出 |

## 输出约定

所有工具都支持 `responseFormat`：

- `json`: `content[0].text` 返回 canonical text
- `markdown`: `content[0].text` 返回 canonical text / markdown

`liuyao` 额外支持 `detailLevel`：

- `safe`（默认）：返回面向外部 AI 的降噪结构化输出
- `debug`：在 safe 输出外追加 `debug.rawCanonical` 与 `debug.rawText`

当工具定义包含 `outputSchema` 时：

- `renderToolResult(...)` 始终产出 `content`
- `buildToolSuccessPayload(...)` 会同时附带 `structuredContent`
- `structuredContent` 返回 canonical JSON，并与已发布 `outputSchema` 对齐

换句话说：

- MCP 客户端若按 schema 消费，应读取 `structuredContent`
- `content` 只承担文本阅读用途，不再承载 JSON 字符串
- Web 端管理员的“复制 JSON”按钮复制的就是与 MCP `structuredContent` 同源的 canonical JSON

这样 `@mingai/mcp` 与 `@mingai/mcp-server` 可以复用同一套响应约定，不再分别维护。

## 版本批次

| 版本 | 批次说明 |
|------|----------|
| `2.0.0` | 将 MCP 最终输出契约收口为 `content=canonical text`、`structuredContent=canonical JSON`，并同步切换公开 `outputSchema` 到 canonical JSON schema |
| `1.5.0` | 收口 `tool-schema` / `tool-registry` / `tool-output` / `transport`，补齐 `bazi` / `dayun` / `ziwei` / `qimen` / `daliuren` / `tarot` / `timezone-utils` 等子路径导出，统一 SDK 与服务端响应面 |
| `1.4.0` | 新增 `daliuren` 大六壬能力，补齐时区校验、输出 schema 与 Markdown formatter |
| `1.3.0` | 新增 `qimen_calculate` 奇门遁甲能力，支持显式时区、寄宫配置与扩展宫位元数据 |
| `1.2.6` | 延续 `1.2.5` 做补丁发布，集中修复输出契约、六爻输入边界、紫微/黄历/大运边界与回归测试覆盖 |
| `1.2.5` | 旧基线版本，作为本次版本重排的对比起点 |

## 如果你想在 AI 客户端中直接使用

不需要手动封装协议层，请直接使用：

- [`@mingai/mcp`](https://www.npmjs.com/package/@mingai/mcp) 适合 Claude Desktop、Cursor 等本地客户端
