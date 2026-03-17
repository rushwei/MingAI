# 侧边栏加载与全局 Loading 范围调整

## 背景

- 现状：全局 `loading.tsx` 使用全屏覆盖，页面加载时会遮住侧边栏；侧边栏又会被 `featureLoading` 触发骨架，导致导航频繁闪烁。
- 触发点：产品要求页面加载不覆盖侧边栏，同时在侧边栏配置变更或管理员关闭功能时，侧边栏需按骨架刷新。

## 目标与非目标

- 目标：
  - 全局 Loading 仅作用于内容区，不遮挡侧边栏。
  - 侧边栏初始渲染不因 `featureLoading` 阻塞，改为稳定展示并在显式刷新时骨架加载。
  - 侧边栏配置刷新与功能开关刷新提供显式“刷新中”状态。
- 非目标：
  - 不改动 API 契约与数据库结构。
  - 不重做现有导航的视觉风格。

## 方案

- 影响模块：
  - `src/app/loading.tsx`
  - `src/components/layout/Sidebar.tsx`
  - `src/components/layout/MobileNav.tsx`
  - `src/components/layout/SidebarConfigContext.tsx`
  - `src/lib/hooks/useFeatureToggles.ts`
  - `src/tests/*`
- 实现要点：
  - 全局 Loading 移除 `fixed inset-0` 覆盖，改为内容区居中展示。
  - `useFeatureToggles` 增加 `isRefreshing` 与 `refresh(showLoading)`，仅在显式刷新时触发骨架。
  - `SidebarConfigContext` 增加 `refreshing`，在 `user-data:invalidate` 触发时进入骨架刷新。
  - Sidebar/MobileNav 只在配置加载或刷新时骨架，`featureLoading` 仅用于 fail-open。
- 兼容性说明：
  - 取消“功能开关加载前 fail-closed”的导航表现，改为 fail-open，确保侧边栏稳定可用。

## 验收

- 功能验收：
  - 页面加载时侧边栏保持可见不被覆盖。
  - 侧边栏配置保存或管理员关闭功能后，侧边栏出现骨架刷新并更新结果。
- 测试范围：
  - `src/tests/sidebar-loading-policy.test.ts`
  - `src/tests/app-loading-layout.test.ts`

## 风险与回滚

- 风险：
  - 功能开关加载期间可能短暂显示被关闭入口。
- 回滚步骤：
  - 还原 `loading.tsx` 全屏覆盖。
  - 还原 Sidebar/MobileNav 使用 `featureLoading` 触发骨架的逻辑。
