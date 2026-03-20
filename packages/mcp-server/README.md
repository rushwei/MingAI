# @mingai/mcp-server

MingAI 的在线 MCP Server，基于 Streamable HTTP 运行，面向远程部署场景。

当前发布线：`1.5.x`

说明：本 README 将 `1.2.5` 之后累计的改动按功能重排为 `1.2.6 -> 1.3.0 -> 1.4.0 -> 1.5.0`，便于按大功能分批发布 npm 版本。

## 适用场景

- 需要把 MingAI MCP 工具部署成远程服务
- 需要 OAuth 2.1 + PKCE 接入 ChatGPT 等 MCP 客户端
- 需要继续兼容用户级 API Key 调用

## 安装

```bash
npm install @mingai/mcp-server
```

## 核心特性

- 复用 `@mingai/core` 的 11 个工具能力
- Streamable HTTP 入口：`/mcp`
- OAuth 2.1 + PKCE + 动态客户端注册
- `Authorization: Bearer <token>` 与 `x-api-key` 双认证链路
- 基于共享 transport 的 `structuredContent + content` 响应策略
- OAuth 授权页内置当前工具清单展示
- 八字 / 紫微相关工具支持仅传地点名，由在线服务运行时通过高德解析经度；解析失败时自动退化为不采用真太阳时

## 最小运行方式

```bash
pnpm install
pnpm -C packages/core build
pnpm -C packages/mcp-server build
pnpm -C packages/mcp-server start
```

默认服务信息：

- `GET /health`
- `GET /info`
- `POST /mcp`
- `GET /.well-known/oauth-authorization-server`
- `GET /.well-known/oauth-protected-resource`

## 环境变量

### 基础运行

| 变量 | 说明 |
|------|------|
| `SUPABASE_URL` | Supabase 项目地址 |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SYSTEM_ADMIN_EMAIL` | 系统管理员邮箱，用于 MCP Server 受控访问数据库 |
| `SUPABASE_SYSTEM_ADMIN_PASSWORD` | 系统管理员密码 |
| `MCP_HOST` | 监听地址，默认 `127.0.0.1` |
| `PORT` | 端口，默认 `3001` |
| `MCP_ALLOWED_ORIGINS` | 浏览器 Origin 白名单 |
| `MCP_ALLOWED_HOSTS` | Host 白名单 |
| `MCP_MAX_SESSIONS` | 最大并发会话数 |
| `MCP_SESSION_TTL_MS` | 会话生命周期 |
| `MCP_SESSION_IDLE_MS` | 会话空闲超时 |
| `MCP_MAX_SSE_PER_USER` | 每用户 SSE 并发上限 |
| `MCP_TRUST_PROXY` | 反向代理后设为 `true` |
| `MINGAI_SITE_URL` | OAuth 授权页 Logo 与站点链接来源 |
| `AMAP_WEB_SERVICE_KEY` | 可选。为八字 / 紫微工具开启“仅传地点名”运行时解析；未配置时自动退化为不采用真太阳时 |

### OAuth 2.1

| 变量 | 说明 |
|------|------|
| `MCP_JWT_SECRET` | JWT 签名密钥，至少 32 字符 |
| `MCP_ISSUER_URL` | OAuth issuer URL |
| `MCP_ALLOWED_TOKEN_AUDIENCES` | 额外允许的 access token audience |
| `MCP_ACCESS_TOKEN_TTL` | Access token 有效期，单位秒 |
| `MCP_REFRESH_TOKEN_TTL` | Refresh token 有效期，单位秒 |
| `MCP_OAUTH_DEBUG` | OAuth 调试日志开关 |

## MCP 客户端示例

## 出生地点与真太阳时

- 在线 `@mingai/mcp-server` 支持在八字 / 紫微相关工具中只传 `birthPlace`。
- 当未显式提供 `longitude` 时，服务端会尝试通过高德把地点名解析为经度。
- 解析成功且精度达到 `市 / 区县` 时，会自动启用真太阳时。
- 解析失败、只到 `省` 级、或未配置 `AMAP_WEB_SERVICE_KEY` 时，会自动退化为不采用真太阳时。
- 若同时提供 `longitude` 和 `birthPlace`，优先使用显式 `longitude`。

### OAuth / Streamable HTTP

```json
{
  "mcpServers": {
    "mingai": {
      "type": "streamable-http",
      "url": "https://your-domain.example.com/mcp"
    }
  }
}
```

### API Key 调用

```json
{
  "mcpServers": {
    "mingai": {
      "type": "streamable-http",
      "url": "https://your-domain.example.com/mcp",
      "headers": {
        "x-api-key": "sk-mcp-xxxxxxxx"
      }
    }
  }
}
```

Bearer token 的优先级高于 API Key；若 Bearer token 存在但无效，不会回退到 API Key。

## 与其他包的关系

- [`@mingai/core`](https://www.npmjs.com/package/@mingai/core): 工具注册、算法实现、transport 适配器
- [`@mingai/mcp`](https://www.npmjs.com/package/@mingai/mcp): 本地 `stdio` MCP Server

注意：`@mingai/core` 仍保持纯算法边界，本身不接地图服务，也不会自动把地点名换算为经度。

## 版本批次

| 版本 | 批次说明 |
|------|----------|
| `1.5.0` | 统一在线服务版本号，收口共享 transport、动态授权页工具展示、会话管理与运行时契约 |
| `1.4.0` | 跟随核心接入 `daliuren` 大六壬工具 |
| `1.3.0` | 跟随核心接入 `qimen_calculate` 奇门遁甲工具 |
| `1.2.6` | 延续 `1.2.5` 做补丁发布，集中修复缓存回源、鉴权边界、结构化输出与测试覆盖 |
| `1.2.5` | `core` / `mcp` 的旧基线版本；本次将在线服务也统一收口到同一版本线 |
