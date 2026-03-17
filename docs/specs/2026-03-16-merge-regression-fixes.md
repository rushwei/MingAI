# 合并回归修复（Spec-Lite）

## 背景

- 现状：近期合并 worktree 后，部分已修复逻辑被旧实现覆盖，当前分支出现配置、历史恢复、塔罗抽牌和前端语法回归。
- 触发点：
  - `supabase-env` 去掉了对 `NEXT_PUBLIC_*` 的回退，浏览器侧 Supabase 客户端初始化会直接报错。
  - `HistoryDrawer` 被回滚到不支持 `qimen/daliuren` 的版本，六壬恢复 payload 也丢失了 `timezone`。
  - `MentionPopover` 合并时留下重复 import 与缺失逗号，当前源码无法通过解析。
  - `src/lib/divination/tarot.ts` 回退成旧版同步随机实现，显式 `seed` 语义消失。

## 目标与非目标

- 目标：
  - 恢复浏览器侧 Supabase 公共配置解析。
  - 恢复 `HistoryDrawer` 对 `qimen/daliuren` 的支持，并补齐六壬历史恢复所需的 `timezone/conversationId`。
  - 修复 `MentionPopover` 语法与大六壬类型展示。
  - 恢复塔罗 wrapper 对显式 `seed` 的支持，同时保留随机抽牌入口的非确定性。
- 非目标：
  - 不重构 Supabase 初始化架构。
  - 不改动奇门/六壬业务展示结构。
  - 不调整 core 随机算法与卡牌数据本身。

## 方案

- 影响模块：
  - `src/lib/supabase-env.ts`
  - `src/components/layout/HistoryDrawer.tsx`
  - `src/components/chat/MentionPopover.tsx`
  - `src/lib/divination/tarot.ts`
  - 相关回归测试
- 实现要点：
  - `supabase-env` 恢复 `SUPABASE_* -> NEXT_PUBLIC_SUPABASE_*` 的读取顺序。
  - `HistoryDrawer` 恢复 `qimen/daliuren` 类型定义与配置；六壬恢复补齐 `timezone` 和 `conversationId`，并与专用历史页保持一致。
  - `MentionPopover` 合并 `lucide-react` import，补回 `qimen_chart` / `daliuren_divination` 标签与图标条目的语法完整性。
  - `tarot.ts` 恢复 wrapper 级别的 `seed/seedScope/question/timezone` 选项，随机入口在缺省 `seed` 时生成一次性种子，显式 `seed` 保持稳定。
- 兼容性说明：
  - 现有浏览器端 public env 注入方式继续有效。
  - 已保存六壬记录在缺失 `timezone` 的旧数据下仍回退到本地时区默认值。
  - 塔罗显式 `seed` 调用恢复兼容，未传 `seed` 的随机入口保持原有随机预期。

## 验收

- 功能验收：
  - 仅设置 `NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY` 时，helper 仍能返回有效配置。
  - `HistoryDrawer` 可继续接受 `qimen/daliuren`，六壬历史恢复写入 `timezone` 与 `conversationId`。
  - `MentionPopover` 源码无重复 `lucide-react` import，且奇门/六壬标签与图标条目完整。
  - `drawForSpread(..., { seed: 'fixed-seed' })` 两次结果一致。
- 测试范围：
  - `src/tests/supabase-env-public-fallback.test.ts`
  - `src/tests/qimen-daliuren-regressions.test.ts`
  - `src/tests/mention-popover-regressions.test.ts`
  - `src/tests/tarot-seed-behavior.test.ts`

## 风险与回滚

- 风险：
  - `HistoryDrawer` 恢复旧支持时若遗漏配置字段，可能再次出现结果页无法还原。
  - 塔罗 wrapper 与 API 路由已存在新旧实现混杂，需避免只修一半。
- 回滚步骤：
  - 回退上述四个模块及新增测试。
  - 若只需临时恢复前端可用性，可先单独回退 `supabase-env` 与 `MentionPopover` 修复。
