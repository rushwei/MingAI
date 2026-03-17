# 占卜回归修复（Spec-Lite）

## 背景

- 现状：`daliuren`、`tarot` 与通用历史抽屉在最近一轮对齐改动后出现结果回归。
- 触发点：
  - 六壬排盘在传入时区后先转换为 UTC，导致 `liuren-ts-lib` 在不同部署 `TZ` 下按错误时辰起课。
  - 塔罗随机抽牌入口在缺省 `seed` 时回退为按天固定种子，破坏原有随机性。
  - 塔罗每日一牌在未显式传入 `timezone` 时固定按 `Asia/Shanghai` 生成日期种子，导致客户端午夜前后可能看到非本地当天的牌。
  - `GET /api/tarot?action=daily` 未复用 `POST` 分支的时区错误处理，非法 `timezone` 输入会直接抛成 500。
  - 通用历史抽屉恢复六壬记录时丢失 `timezone` 与 `conversationId`，导致结果和 AI 解读不能完整还原。

## 目标与非目标

- 目标：
  - 保证六壬“墙上时间”起课结果不受 Node 进程 `TZ` 影响。
  - 恢复 `draw`、`draw-only`、`spread` 入口的真正随机抽牌行为，同时保留显式 `seed` 与 `daily` 的确定性。
  - 恢复每日一牌在缺省 `timezone` 时沿用调用方本地日历日的行为。
  - 保证 `GET /api/tarot?action=daily` 对非法 `timezone` 返回 400，而不是 500。
  - 让通用历史抽屉恢复六壬记录时与专用历史页保持一致，完整带回 `timezone` 与 `conversationId`。
- 非目标：
  - 不修改六壬/塔罗 API 契约。
  - 不重构历史抽屉通用结构。
  - 不调整 core 内部确定性随机算法本身。

## 方案

- 影响模块：
  - `packages/mcp-core/src/daliuren/index.ts`
  - `src/lib/divination/tarot.ts`
  - `src/components/layout/HistoryDrawer.tsx`
  - 相关回归测试
- 实现要点：
  - 六壬直接按输入年月日时分构造本地 `Date`，不在进入 `getLiuRenByDate()` 前做 UTC 换算；保留 `timezone` 字段仅作上层参数存储与恢复使用。
  - 塔罗 wrapper 在未显式传入 `seed` 时生成一次性随机种子，仅 `getDailyCard()` 继续传日期种子；显式 `seed` 与 `seedScope` 仍按原语义透传。
  - `getDailyCard()` 仅在显式传入 `timezone` 时按指定 IANA 时区生成日期键；缺省时退回运行时本地日期，保持与调用方所在环境一致。
  - `GET /api/tarot?action=daily` 与 `POST` 的 `daily` 分支保持同一套 `timezone` 错误包装，统一返回 `jsonError(..., 400)`。
  - 历史抽屉恢复六壬记录时补齐 `settings.timezone` 和 `conversation_id` 到 `daliuren_params`。
- 兼容性说明：
  - 已保存六壬记录继续可用；缺失 `settings.timezone` 的旧记录仍回退到默认时区。
  - 塔罗“随机抽牌”重新变回非确定性；依赖确定性的场景必须显式传 `seed` 或走 `daily`。

## 验收

- 功能验收：
  - 同一六壬输入在 `TZ=UTC` 与 `TZ=Asia/Shanghai` 下返回相同排盘关键结果。
  - `drawCards()`、`drawForSpread()` 在无显式 `seed` 时向 core 传入非空随机种子。
  - `getDailyCard()` 在未传 `timezone` 时使用调用方本地日期；显式传入 `timezone` 时继续按目标时区生成每日种子。
  - `GET /api/tarot?action=daily&timezone=Bad/Timezone` 返回 400 与明确错误信息。
  - `HistoryDrawer` 恢复六壬记录时写入 `timezone` 与 `conversationId`。
- 测试范围：
  - `packages/mcp-core/tests` 六壬时区回归测试。
  - `src/tests` 塔罗 wrapper 种子行为、每日时区回归测试与六壬恢复参数回归测试。

## 风险与回滚

- 风险：
  - 六壬修复依赖 `liuren-ts-lib` 使用 `Date` 本地字段的既有行为。
  - 塔罗随机性恢复后，若上层误依赖日内固定结果，会暴露隐藏耦合。
- 回滚步骤：
  - 回退本次涉及的三个模块与新增测试。
  - 如只需临时回避塔罗随机变更，可单独恢复 wrapper 的种子逻辑。
