# OAuth Resource Binding Hardening

## 1. 背景与问题

- 当前现状：OAuth 登录参数已做 redirect/scope/resource 校验，授权码消费已原子化，JWT 已校验 aud。
- 触发原因：代码审查发现 token exchange 与 refresh exchange 仍可通过请求参数重绑定 `resource`，导致跨资源 token 扩权。
- 主要痛点：
  - 授权码交换阶段可用请求 `resource` 覆盖授权阶段绑定值。
  - refresh token 未持久化 `resource`，刷新时可请求任意允许受众。

## 2. 目标与非目标

### 2.1 目标

- 强制授权码与 refresh token 的 `resource` 绑定一致性。
- 防止 token exchange/refresh exchange 跨资源扩权。
- 补齐 provider 层可执行负路径测试，覆盖关键安全行为。

### 2.2 非目标

- 不修改 OAuth 路由协议形态（仍兼容现有 SDK 路由）。
- 不引入 access token 主动吊销机制。

## 3. 方案设计

### 3.1 变更范围

- 影响模块：`packages/mcp-server/src/oauth/provider.ts`、`packages/mcp-server/src/oauth/store.ts`。
- 影响接口：OAuth token/refresh 交换行为（不兼容越权请求）。
- 影响数据结构：`mcp_oauth_tokens` 新增 `resource` 字段并参与 refresh 绑定。

### 3.2 实现方案

- 核心思路：
  - 在 provider 中统一解析并校验 `resource` 绑定，任何 mismatch 立即拒绝。
  - refresh token 保存与读取 `resource`，刷新时仅能沿用已绑定值。
- 关键流程：
  - `exchangeAuthorizationCode`: `resource(request)` 必须与 `stored.resource` 一致（或为空且有绑定）。
  - `exchangeRefreshToken`: `resource(request)` 必须与 `stored.resource` 一致。
  - 新旧 refresh token 轮换时复制 `resource`。
- 兼容策略（向前/向后兼容）：
  - 旧 refresh token 无 `resource` 时，不允许携带新 `resource` 扩权；需重新授权获取绑定值。

### 3.3 数据库与迁移（如适用）

- 是否需要 migration：是。
- 涉及对象（表/字段/索引/约束）：`public.mcp_oauth_tokens.resource text`。
- 回填策略：不做回填；历史 token 按“无绑定”处理。
- RLS/权限影响：无新增策略，沿用 `service_role_only`。

## 4. 验收标准

- 功能验收：授权码和 refresh 流程都拒绝 `resource` 篡改。
- 接口验收：越权请求返回明确错误，不再签发 token。
- 性能/稳定性验收：不新增额外外部依赖与高复杂度查询。
- 回归范围：OAuth token 流、refresh rotation、现有 JWT 验证。

## 5. 测试计划

- 单元测试：provider 资源绑定负路径 + store resource 持久化测试。
- 集成/路由测试：维持现有 OAuth 登录校验测试。
- 手动验证步骤：
  - 使用合法授权码但替换 `resource` 请求，确认被拒绝。
  - 使用 refresh token 替换 `resource` 请求，确认被拒绝。

## 6. 风险与回滚

- 失败信号：合法客户端刷新失败率异常上升。
- 风险等级：中。
- 回滚步骤：回滚 provider/store 变更与 migration（保留列不使用亦可）。

## 7. 里程碑与任务拆分

- M1：新增失败测试，复现两类扩权漏洞。
- M2：实现 provider/store 资源绑定逻辑与 migration。
- M3：构建与回归测试通过。

## 8. 关联信息

- 相关 issue：代码审查发现 OAuth resource 绑定漏洞。
- 相关 PR：待创建。
- 关联文档：`docs/manual/MCP-Server-Manual.md`。
