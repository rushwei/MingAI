# Review Regressions Hardening

## 1. 背景与问题

- 当前现状：
  - Linux.do 登录回调依赖“当前 OAuth 邮箱 + 由 `LINUXDO_CLIENT_SECRET` 派生的确定性密码”恢复站内 Auth 会话。
  - 功能开关列表在客户端存在 60 秒内存缓存，管理面板成功写入后仍可能读到旧缓存。
  - 真太阳时逻辑分别在八字和紫微链路中做了局部日期/时间调整，但没有统一的跨日归一化。
- 触发原因：
  - 账号恢复把可轮换配置和外部 relay 邮箱当成站内稳定身份。
  - 面板刷新依赖隐式缓存失效路径，缺少显式强刷。
  - 真太阳时只处理了“日 +/- 1”，没有把“舍入后的分钟、跨月、跨年、排盘日期”统一建模。
- 主要痛点：
  - 已绑定 Linux.do 用户在 client secret 变更、relay 邮箱变化或绑定缺失时可能无法登录。
  - 管理员切换功能开关后，本页 UI 会短暂保持旧状态。
  - 真太阳时边界输入会抛错，或在八字/紫微中得到错误日期与时辰。

## 2. 目标与非目标

### 2.1 目标

- Linux.do 登录恢复不再直接依赖 `LINUXDO_CLIENT_SECRET` 作为站内账号密码种子。
- 已绑定 Linux.do 用户始终以站内 Auth 实际邮箱恢复会话，而不是当前 OAuth 邮箱。
- 缺失绑定但 Auth 账号已存在时，优先通过管理员能力定位并修复已有账号，而不是创建重复账号。
- 功能开关管理面板在成功写入后立即失效缓存并刷新同页状态。
- 八字与紫微共用同一套“分钟舍入后再跨日归一化”的真太阳时日期时间结果。

### 2.2 非目标

- 不重做整套第三方登录体系。
- 不修改现有 `user_oauth_providers` 表结构。
- 不调整前端功能入口的视觉样式。

## 3. 方案设计

### 3.1 变更范围

- 影响模块：
  - `src/lib/oauth/linuxdo.ts`
  - `src/app/api/auth/linuxdo/callback/route.ts`
  - `src/components/admin/FeatureTogglePanel.tsx`
  - `src/lib/hooks/useFeatureToggles.ts`
  - `packages/mcp-core/src/handlers/bazi.ts`
  - `packages/mcp-core/src/handlers/ziwei-shared.ts`
- 影响接口：
  - `GET /api/auth/linuxdo/callback`
  - `useFeatureToggles()` 客户端刷新语义
  - `handleBaziCalculate()` / `handleZiweiCalculate()` 真太阳时边界行为
- 影响数据结构：
  - 无数据库结构变更
  - Linux.do Auth `user_metadata` 会补充稳定 provider 标识以便后续恢复

### 3.2 实现方案

- 核心思路：
  - Linux.do 登录链路改为“provider_user_id 为主键、Auth 用户同步为辅”。已有绑定先按 `user_id` 取真实 Auth 用户并同步密码/元数据，再用站内 Auth 邮箱登录。
  - 缺失绑定恢复路径优先用管理员客户端定位已有 Auth 用户（先按 `linuxdo_sub` 元数据，再按邮箱），找到后同步密码并补写绑定。
  - 功能开关管理面板在成功写入后显式失效缓存并触发一次强刷新，不依赖隐式 fetch 事件顺序。
  - 真太阳时统一通过“原始出生日期时间 + 舍入后的分钟偏移 -> 归一化后的年月日时分”生成结果，八字与紫微共享该归一化结果。
- 关键流程：
  - Linux.do 密码种子优先使用服务端稳定管理密钥，避免与 OAuth client secret 生命周期耦合。
  - 对已绑定用户，先 `auth.admin.getUserById` / `updateUserById`，再 `signInWithPassword`。
  - 对缺失绑定但已存在的用户，`listUsers` 定位后同步并补写 `user_oauth_providers`。
  - 真太阳时先对分钟总量做整数舍入，再用 `Date` 归一化出真实日期与时分。
- 兼容策略（向前/向后兼容）：
  - 老账号在下次 Linux.do 登录时自动同步到新的密码种子和元数据，不要求手动迁移。
  - 新真太阳时逻辑保持现有输出结构不变，只修正边界日期/时间。

### 3.3 数据库与迁移（如适用）

- 是否需要 migration：
  - 否
- 涉及对象（表/字段/索引/约束）：
  - 仅复用现有 `user_oauth_providers`
- 回填策略：
  - 登录时自愈补写 provider 绑定和 metadata
- RLS/权限影响：
  - 沿用已上线的 `user_oauth_providers` 管理员策略

## 4. 验收标准

- 功能验收：
  - 已绑定 Linux.do 用户在 provider 邮箱变化后仍可登录。
  - client secret 与站内密码种子解耦后，恢复路径仍可通过管理员同步成功。
  - 功能开关面板切换后，同页立即显示新状态。
  - 真太阳时跨月、跨年、分钟进位边界输入不再抛错，并使用正确日期排盘。
- 接口验收：
  - Linux.do 回调在恢复已有账号时不误报 `login_failed`。
  - 真太阳时相关输出字段仍维持兼容。
- 性能/稳定性验收：
  - Linux.do 恢复路径只在缺失绑定时才走分页查找。
  - 功能开关强刷不会引入额外轮询。
- 回归范围：
  - Linux.do 首登、回登、缺失绑定恢复
  - Admin 功能开关面板
  - 八字/紫微真太阳时

## 5. 测试计划

- 单元测试：
  - Linux.do 绑定用户邮箱变化恢复
  - Linux.do 缺失绑定恢复时的管理员定位路径
  - 功能开关成功写入后的缓存失效
  - 真太阳时跨月与分钟进位边界
- 集成/路由测试：
  - `src/tests/linuxdo-login.test.ts`
  - `src/tests/feature-toggle-panel.test.ts`
  - `src/tests/true-solar-normalization.test.ts`
- 手动验证步骤：
  - Linux.do 已绑定账号重新登录
  - Admin 面板切换开关观察即时刷新
  - 使用边界出生时间手动比对八字/紫微日期

## 6. 风险与回滚

- 失败信号：
  - Linux.do 回调开始出现新的 `login_failed` / `email_exists`
  - 功能开关面板切换后仍显示旧值
  - 真太阳时输出日期与未校正样例明显不一致
- 风险等级：
  - 中高
- 回滚步骤：
  - 回滚 Linux.do 回调与真太阳时逻辑到前一提交
  - 保留已上线的 `user_oauth_providers` RLS 修复

## 7. 里程碑与任务拆分

- M1：
  - 补齐 review 失败用例
- M2：
  - 实现 Linux.do / 功能开关 / 真太阳时修复
- M3：
  - 跑受影响测试与 lint，整理 worktree 交付

## 8. 关联信息

- 相关 issue：
  - reviewer regression comments on Linux.do recovery, feature toggle cache, true solar time
- 相关 PR：
  - 待创建
- 关联文档：
  - `docs/specs/2026-03-15-linuxdo-login-hardening.md`
