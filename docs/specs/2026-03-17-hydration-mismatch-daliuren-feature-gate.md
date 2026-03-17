# 大六壬页面 hydration mismatch 修复

## 背景

- 现状：
  - `FeatureGate` 依赖 `useFeatureToggles`，初始渲染时可能从本地缓存读取开关状态。
  - SSR 输出的 loading 骨架与客户端首帧内容不一致，触发 hydration mismatch。
  - `daliuren` 页面在 render 阶段使用 `new Date()` 初始化输入值，导致服务端与客户端默认值不同。

## 目标与非目标

- 目标：
  - SSR 与客户端首帧渲染保持一致，消除 hydration mismatch。
  - 大六壬页面的日期与时间默认值改为客户端 effect 后初始化。
- 非目标：
  - 不改变 feature toggles 的 API 或数据结构。
  - 不修改 FeatureGate 的可见/不可见语义。

## 方案

- 影响模块：
  - `src/lib/hooks/useFeatureToggles.ts`
  - `src/app/daliuren/page.tsx`
- 实现要点：
  - `useFeatureToggles` 初始状态固定为 `isLoading: true`、`toggles: null`，避免 SSR/CSR 分叉。
  - 客户端 mount 后从本地缓存 seed，再刷新远端状态。
  - 大六壬日期/时间默认值在 `useEffect` 中设置，首帧保持一致。

## 验收

- 功能验收：
  - `/daliuren` 首次进入不再触发 hydration mismatch。
  - 功能开关仍可正常刷新与缓存。
- 测试范围：
  - `useFeatureToggles` 初始状态不读取本地缓存
  - 大六壬页面不在 render 期使用 `new Date()` 初始化

## 风险与回滚

- 风险：
  - 首帧会短暂展示 FeatureGate loading（等待缓存/远端刷新）。
- 回滚步骤：
  - 回退本次提交，恢复旧的初始缓存读取逻辑。
