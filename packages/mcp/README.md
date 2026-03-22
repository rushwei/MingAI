# @mingai/mcp

MingAI 的本地 `stdio` MCP Server，适合直接接入 Claude Desktop、Cursor、Cherry Studio 等支持 MCP 的客户端。

## 快速开始

在 MCP 客户端配置中加入：

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

要求：

- 本机已安装 [Node.js](https://nodejs.org/)
- 客户端支持 MCP `stdio` 连接方式

如需从 GitHub Packages 安装镜像包，请改用 `@hhszzzz/mingai-mcp`，并把 `@hhszzzz` scope 指向 `https://npm.pkg.github.com`。npmjs 主包名仍然是 `@mingai/mcp`。

## 可用工具

| 工具 | 说明 |
|------|------|
| `bazi_calculate` | 八字排盘 |
| `bazi_pillars_resolve` | 四柱反推 |
| `bazi_dayun` | 大运、小运、流年链路 |
| `ziwei_calculate` | 紫微斗数排盘 |
| `ziwei_horoscope` | 紫微运限 |
| `ziwei_flying_star` | 紫微飞星 |
| `liuyao` | 六爻排卦分析 |
| `tarot` | 塔罗抽牌 |
| `almanac` | 黄历查询 |
| `qimen_calculate` | 奇门遁甲排盘 |
| `daliuren` | 大六壬排盘 |

所有工具都支持 `responseFormat`：

- `json`: `content[0].text` 返回 canonical text
- `markdown`: `content[0].text` 返回适合直接展示给 AI 的规范文本

当工具定义存在 `outputSchema` 时，本地 MCP 响应会统一返回：

- `structuredContent`: canonical JSON，并与工具 `outputSchema` 对齐
- `content`: 文本通道；`responseFormat=json` 与 `responseFormat=markdown` 都承载 canonical text

这套响应策略由 `@mingai/core/transport` 统一提供。

注意：

- canonical JSON 在 `structuredContent`
- `content[0].text` 只用于人类/AI 阅读，不再作为 JSON 通道

关于出生地点与真太阳时：

- 本地 `@mingai/mcp` 当前不做在线地理编码。
- 若需要真太阳时，请显式传入 `longitude`。
- 若你只有地点名，需要由调用方先做地理编码，再把经度传给工具。

## 其他安装方式

```bash
npm install -g @mingai/mcp
```

全局安装后也可以在 MCP 客户端中改成：

```json
{
  "mcpServers": {
    "mingai": {
      "command": "mingai-mcp"
    }
  }
}
```

## 本地开发

```bash
pnpm install
pnpm -C packages/core build
pnpm -C packages/mcp build
node packages/mcp/dist/index.js
```

## 相关包

- [`@mingai/core`](https://www.npmjs.com/package/@mingai/core): 共享算法、工具定义与 transport 适配器

## 版本批次

| 版本 | 批次说明 |
|------|----------|
| `2.0.0` | 跟随 core 切换到最终 MCP 契约：`content` 输出规范文本，`structuredContent` 输出 canonical JSON，公开 schema 同步切到 canonical JSON 结构 |
| `1.5.0` | 同步核心导出面、共享 transport、结构化输出策略与在线服务对齐 |
| `1.4.0` | 接入 `daliuren` 大六壬工具 |
| `1.3.0` | 接入 `qimen_calculate` 奇门遁甲工具 |
| `1.2.6` | 延续 `1.2.5` 做补丁发布，集中修复输出契约、鉴权与运行时边界 |
| `1.2.5` | 旧基线版本，作为本次版本重排的对比起点 |
