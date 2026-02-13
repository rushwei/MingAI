# Full Spec: MCP 收敛每日运势返回字段

## 1. 背景与问题

- 当前现状：
- `packages/mcp-core` 的 `daily_fortune` 工具在返回中包含 `scores`、`advice`、`luckyColor`、`luckyDirection`。
- 六爻工具也存在评分相关内部与输出字段，但本次需求已明确“六爻先不用移除”。
- 触发原因：
- 需要在 MCP 工具层面去除打分与建议类衍生字段，减少非必要解释性输出。
- 主要痛点：
- 当前 API 输出包含较多衍生字段，调用方容易过度依赖分数与建议模板。

## 2. 目标与非目标

### 2.1 目标

- 移除 `daily_fortune` 输出中的 `scores`、`advice`、`luckyColor`、`luckyDirection` 字段（schema、types、handler 返回一致）。
- 保留 `daily_fortune` 的基础信息输出（`date/seed/dayInfo/tenGod/almanac`）。
- 更新相关测试，确保不再返回上述字段。

### 2.2 非目标

- 本次不移除六爻中的评分相关字段（`strengthScore`、`confidence` 等）。
- 不改动 `liunian_analyze`、`tarot_draw`、`bazi_calculate`、`ziwei_calculate` 的输出契约。
- 不涉及数据库结构、RLS、migration。

## 3. 方案设计

### 3.1 变更范围

- 影响模块：
- `packages/mcp-core/src/tools.ts`
- `packages/mcp-core/src/types.ts`
- `packages/mcp-core/src/handlers/fortune.ts`
- `packages/mcp-core/tests/*`（与 `daily_fortune` 输出断言相关）
- 影响接口：
- MCP tool: `daily_fortune` output contract
- 影响数据结构：
- 删除 `FortuneOutput.scores`
- 删除 `FortuneOutput.advice`
- 删除 `FortuneOutput.luckyColor`
- 删除 `FortuneOutput.luckyDirection`

### 3.2 实现方案

- 核心思路：
- 在工具 schema、TS 类型、handler 返回三层同步删除 `scores/advice/luckyColor/luckyDirection`。
- 关键流程：
- 先改测试为“`scores` 不存在”并验证失败（RED）。
- 再改实现使测试通过（GREEN）。
- 最后做最小清理（REFACTOR）。
- 兼容策略（向前/向后兼容）：
- 这是输出字段删除，属于向后不兼容变更；调用方需停止读取被移除字段。
- 其余字段保持稳定以降低迁移成本。

### 3.3 数据库与迁移（如适用）

- 是否需要 migration：
- 否
- 涉及对象（表/字段/索引/约束）：
- 无
- 回填策略：
- 无
- RLS/权限影响：
- 无

## 4. 验收标准

- 功能验收：
- 调用 `daily_fortune` 时响应不再包含 `scores/advice/luckyColor/luckyDirection`。
- 接口验收：
- `tools.ts` 中 `daily_fortune.outputSchema` 不再包含上述字段。
- `types.ts` 中 `FortuneOutput` 不再包含上述字段。
- 性能/稳定性验收：
- 与随机性/种子相关行为保持稳定（除评分字段本身被移除外）。
- 回归范围：
- `packages/mcp-core/tests` 中与 `daily_fortune`、deterministic 行为相关测试。

## 5. 测试计划

- 单元测试：
- 更新 `daily_fortune` 相关断言：检查上述字段均不存在。
- 集成/路由测试：
- 本次不涉及 Next.js 路由层。
- 手动验证步骤：
- 运行 `packages/mcp-core` 相关测试集，确认 `daily_fortune` 不再输出已删除字段。

## 6. 风险与回滚

- 失败信号：
- 现有调用方仍访问已删除字段导致运行时字段缺失。
- 风险等级：
- 中
- 回滚步骤：
- 回退本次对 `tools.ts/types.ts/fortune.ts` 与对应测试的修改。

## 7. 里程碑与任务拆分

- M1：完成 Full Spec 与影响面确认（仅 `daily_fortune`）。
- M2：测试先行改造并验证失败。
- M3：实现与测试通过，输出变更说明。

## 8. 关联信息

- 相关 issue：
- N/A
- 相关 PR：
- N/A
- 关联文档：
- `docs/specs/2026-02-13-mcp-remove-fortune-scores.md`
