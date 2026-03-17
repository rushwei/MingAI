# 奇门排序修复与大六壬导航入口补齐

## 背景

- 现状：
  - 旧用户保存的 `sidebar_config.navOrder/mobileDrawerOrder` 不包含 `qimen/daliuren`，导致新入口脱离排序体系。
  - `SidebarConfigContext` 直接使用旧缓存，没有先做规范化，奇门在设置页里会显示但拖拽无效。
  - 桌面侧边栏、移动端导航和移动端自定义面板没有统一包含 `daliuren`，因此 Web 里缺少大六壬入口。

## 目标与非目标

- 目标：
  - 旧侧边栏配置不再自动补齐，避免隐藏配置问题。
  - 桌面和移动端都恢复大六壬入口。
  - 奇门在导航设置中恢复可拖拽排序。
- 非目标：
  - 不重做侧边栏视觉设计。
  - 不新增新的导航体系或新的数据库字段。

## 方案

- 影响模块：
  - `src/lib/user/settings.ts`
  - `src/components/layout/SidebarConfigContext.tsx`
  - `src/components/layout/Sidebar.tsx`
  - `src/components/layout/MobileNav.tsx`
  - `src/components/settings/SidebarCustomizer.tsx`
  - `src/components/settings/MobileNavCustomizer.tsx`
  - `src/lib/app-settings.ts`
- 实现要点：
  - 侧边栏默认顺序纳入 `qimen/daliuren`，不做缺失项自动补齐。
  - 本地缓存读取先经过 `normalizeSidebarConfig()`，仅做字段过滤与去重。
  - 桌面导航、移动导航、桌面/移动自定义面板统一补回 `daliuren`。
  - 功能开关注册补回 `daliuren`，保持管理员控制面与导航项一致。

## 验收

- 功能验收：
  - 旧配置不会被自动补齐，拖拽排序以当前列表为准。
  - 桌面侧边栏和移动端导航都能看到大六壬入口。
  - 管理员可以像其他命理模块一样控制大六壬入口开关。
- 测试范围：
  - 侧边栏默认配置与旧配置规范化
  - 桌面/移动导航入口一致性
  - 缓存配置加载路径规范化

## 风险与回滚

- 风险：
  - 旧配置缺失项不会被自动补齐，需要用户手动调整或重置。
- 回滚步骤：
  - 回退本次提交，恢复旧的默认顺序与导航项集合。
