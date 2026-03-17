# 设置错误边界、功能开关状态源与 MCP Supabase 边界修复

## 背景

- 现状：
  - `loadCurrentUserSettings()` 把请求失败和“无已保存设置”混成 `null`，调用方会把错误态误刷成默认值。
  - `useFeatureToggles()` 各实例各自持有 state，同页管理员切换后其他消费者不会立即同步。
  - 用户设置页存在乐观更新但失败不回滚的问题。
  - MCP Server 在非生产仍会缺系统管理员凭据时静默降级到 anon client。

## 目标与非目标

- 目标：
  - 设置读取返回显式错误结果，调用方不再把失败态写成默认值。
  - 功能开关在浏览器同标签页内共享单一状态源。
  - 设置保存失败后回滚 UI 状态。
  - MCP Server 不再保留 anon fallback。
- 非目标：
  - 不重构用户设置页面布局。
  - 不修改 feature toggle 服务端 API 契约。

## 方案

- 影响模块：
  - `src/lib/user/settings.ts`
  - `src/components/layout/SidebarConfigContext.tsx`
  - `src/app/user/settings/page.tsx`
  - `src/app/user/ai-settings/page.tsx`
  - `src/app/user/knowledge-base/page.tsx`
  - `src/lib/hooks/useFeatureToggles.ts`
  - `packages/mcp-server/src/supabase.ts`
- 实现要点：
  - `loadCurrentUserSettings()` 返回 `{ settings, error }`，错误时不再伪装成默认配置。
  - 侧边栏配置、AI 设置、知识库 prompt 选择在读取失败时保持现状并显式报错。
  - 功能开关 hook 使用模块级共享 store + 订阅机制，`refresh()` 一次即可同步所有实例。
  - 用户设置页在保存失败时回滚局部 state，并在读取失败时禁止继续拿默认态覆盖真实设置。
  - MCP Server 缺系统管理员凭据时直接报错，不再按 `NODE_ENV` 走 anon fallback。

## 验收

- 功能验收：
  - 设置读取失败不会把已缓存/已加载配置刷成默认值。
  - 管理员切换 feature toggle 后，同页导航和门控立即同步。
  - 设置保存失败后 UI 恢复到保存前状态。
  - MCP Server 缺系统管理员凭据时直接失败。
- 测试范围：
  - 设置读取错误边界
  - 功能开关共享 store
  - 设置页回滚契约
  - MCP Supabase client 策略

## 风险与回滚

- 风险：
  - 功能开关共享 store 会改变同页多个 hook 实例的同步时机。
  - MCP 环境若缺系统管理员凭据，开发环境会从“警告后继续”变为“直接失败”。
- 回滚步骤：
  - 回退本次提交，恢复旧的设置 helper、feature toggle hook 和 MCP fallback 行为。
