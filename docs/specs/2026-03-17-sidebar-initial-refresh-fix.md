# 侧边栏首屏二次刷新修复

## 背景

- 现状：
  - 进入 Web 后，左侧导航会出现一次无意义的首屏二次刷新。
  - `ClientProviders` 会在 `INITIAL_SESSION` 时派发 `mingai:user-data:invalidate`，触发侧边栏配置和用户卡片重复同步。
  - `useFeatureToggles()` 即使已有 warm cache，也会先进入 loading，导致导航再次走骨架态。
- 触发点：
  - 用户反馈每次进入 Web，侧边栏都会自动刷新一次。

## 目标与非目标

- 目标：
  - 去掉 `INITIAL_SESSION` 导致的无意义用户数据失效广播。
  - 让 feature toggle warm cache 参与首屏渲染，避免已有缓存时重新闪骨架。
- 非目标：
  - 不重构侧边栏 UI。
  - 不改 feature toggle 服务端契约。

## 方案

- 影响模块：
  - `src/components/providers/ClientProviders.tsx`
  - `src/lib/hooks/useFeatureToggles.ts`
- 实现要点：
  - `ClientProviders` 不再在 auth state subscription 中广播 `mingai:user-data:invalidate`。
  - `useFeatureToggles` 复用本地缓存作为 warm start，并仅在 cold start 时进入 blocking loading。
  - 网络刷新成功后回写本地缓存；已有 warm cache 时允许后台静默刷新。

## 验收

- 功能验收：
  - 进入 Web 时，侧边栏不再因为初始化广播额外同步一次。
  - 已有 feature toggle 缓存时，侧边栏不再重新闪一次骨架。
- 测试范围：
  - `ClientProviders` 初始化广播契约
  - `useFeatureToggles` warm cache 契约

## 风险与回滚

- 风险：
  - feature toggle 本地缓存会让冷启动后的首屏显示依赖 TTL 内的缓存值，随后后台刷新纠正。
- 回滚步骤：
  - 回退本次提交，恢复原 auth 广播和 feature toggle loading 行为。
