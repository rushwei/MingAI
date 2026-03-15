# Linux.do 登录链路加固

## 背景

- 现状：MingAI 已接入 `connect.linux.do`，但上线后 Linux.do 登录存在失败、回调后 UI 仍像未登录、或用户资料写入不完整的问题。
- 触发点：代码中同时混用了 Linux.do 旧版用户字段（如 `username`、`avatar_url`）和 OIDC 风格字段（如 `preferred_username`、`picture`），且服务端仅请求 `connect.linux.do`，未兼容官方提供的服务端备用域名。

## 目标与非目标

- 目标：
  - 修复 Linux.do 回调对用户信息字段的兼容处理，避免因字段差异导致登录失败。
  - 提升服务端 token / userinfo 请求的可用性，兼容 Linux.do 官方备用接口。
  - 保证登录成功后能正确建立会话并写入最小用户资料。
  - 将 Linux.do 回调失败原因直接反馈到前端 UI，避免错误仅停留在 URL 参数。
  - 修复 `user_oauth_providers` 在无 service-role 架构下的权限缺口，保证第三方账号绑定可持续写入。
  - 对已出现“Auth 用户已创建但 provider 绑定缺失”的历史异常状态提供登录时自愈。
- 非目标：
  - 不重构现有通用认证架构。
  - 不修改前端登录 UI 视觉与交互。

## 方案

- 影响模块：
  - `src/lib/oauth/linuxdo.ts`
  - `src/app/api/auth/linuxdo/callback/route.ts`
  - `src/tests/*` 中新增 Linux.do 登录回归测试
- 实现要点：
  - 为 Linux.do userinfo 增加统一字段归一化，兼容旧字段与 OIDC 字段。
  - `email_verified` 仅在明确返回 `false` 时拒绝登录，避免因字段缺失误判。
  - token / userinfo 请求按官方主域名与备用域名顺序重试，减少部署地区网络差异导致的失败。
  - Linux.do 新用户创建优先走专用服务端 Auth 管理客户端的 `auth.admin.createUser({ email_confirm: true })`，避免命中 Supabase 公共注册链路的邮件发送/注册策略限制。
  - 现有 `SUPABASE_SYSTEM_ADMIN_EMAIL/PASSWORD` 生成的系统管理员会话客户端仅用于 RLS + admin policy 的数据库访问；由于 `accessToken` 客户端无法访问 `supabase.auth.admin`，不能承担首次建号。
  - 专用 Auth 管理客户端使用 `SUPABASE_SECRET_KEY`。
  - 若部署环境未配置专用 Auth 管理密钥，则在 Linux.do 首次登录失败时返回明确错误码，避免继续落成笼统 `signup_failed`。
  - 为 `public.user_oauth_providers` 增加基于 `public.is_admin_user()` 的管理员全权限策略，替代旧的 `service_role` 专用策略。
  - 当首次建号前发现 provider 绑定缺失但账号邮箱已注册时，优先尝试用 Linux.do 确定性密码登录并回写 provider 绑定，自愈历史异常状态。
  - provider 绑定表的查询、更新、插入必须显式检查错误并返回可观测错误码，避免静默失败。
  - 新增针对旧字段 payload、缺失 `email_verified`、备用域名回退的测试。
  - 在全局客户端 Provider 中识别 Linux.do 回调错误码，显示中文 Toast，并在展示后清理 URL 中的 `error` 参数。
- 兼容性说明：
  - 保持现有回调地址、cookie 名称和前端入口不变。
  - 保持 `user_oauth_providers` 与 `users` 表写入结构不变。
  - 不做离线批量数据回填，改为在用户下一次 Linux.do 登录时在线修复绑定。

## 验收

- 功能验收：
  - Linux.do 用户信息返回旧字段时，回调仍可成功创建或登录用户。
  - `email_verified` 缺失时不会被误判为未验证邮箱。
  - 主域名失败时可回退到官方备用域名继续完成 token / userinfo 请求。
  - Linux.do 回调失败时，首页会立即显示中文错误提示，且刷新不会重复弹出同一错误。
- 测试范围：
  - Linux.do OAuth 协议封装单测。
  - Linux.do 回调路由最小回归测试。

## 风险与回滚

- 风险：
  - Linux.do 实际返回字段若再次变化，仍需继续补兼容。
  - 备用域名策略若上游下线，需要同步调整。
- 回滚步骤：
  - 回退本次 `linuxdo` OAuth 封装与回调路由改动。
  - 删除对应测试文件或回退测试断言。
