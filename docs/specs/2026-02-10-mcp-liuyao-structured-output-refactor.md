# MCP 六爻结构化输出重构

## 1. 背景与问题

- 当前现状：`liuyao_analyze` 输出同时包含 `fullYaos` 与 `changedYaos/changedLines/changedYaoCi`，字段重复；`yongShen` 为单对象，不支持多目标；未显式暴露暗动/日破；`timeRecommendations` 缺少结构化日期窗口。
- 触发原因：MCP 消费端需要更稳定、可编排的结构化数据，减少冗余并强化六爻关键判定逻辑。
- 主要痛点：数据冗余、逻辑割裂、难以表达多用神与应期来源。

## 2. 目标与非目标

### 2.1 目标

- 重构六爻输出结构，删除重复顶层字段。
- 将变爻信息并入 `fullYaos[].changedYao`。
- 增加 `isChanging/movementState/movementLabel`，显式输出暗动与日破。
- `yongShen` 升级为数组分组结构，支持多目标与候选排序。
- 新增 `globalShenSha` 与逐爻 `shenSha`，并复用八字神煞规则。
- 将 `timeRecommendations` 升级为 90 天窗口结构并绑定 `targetLiuQin`。

### 2.2 非目标

- 不新增数据库结构与迁移。
- 不改动 `mcp-server` / `mcp-local` 路由行为。
- 不做兼容过渡（直接重构）。

## 3. 方案设计

### 3.1 变更范围

- 影响模块：`packages/mcp-core/src/tools.ts`、`packages/mcp-core/src/types.ts`、`packages/mcp-core/src/handlers/liuyao.ts`、`packages/mcp-core/src/handlers/bazi.ts`、新增 `packages/mcp-core/src/shensha.ts`。
- 影响接口：`liuyao_analyze` 输入/输出 schema；`LiuyaoInput/LiuyaoOutput` 类型。
- 影响数据结构：六爻输出字段重排；时间建议结构化；神煞模块复用。

### 3.2 实现方案

- 输入：保留 `question` 必填，`yongShenTargets: LiuQin[]` 为必填字段（`question` 为空时可传空数组；`question` 非空时至少 1 项）。
- 输出：删除 `changedLines/changedYaoCi/changedYaos/summary`。
- `fullYaos[]`：
  - 删除 `change/changeAnalysis`。
  - 新增 `isChanging`、`movementState`、`movementLabel`、`shenSha: string[]`、`changedYao`。
  - `changedYao` 字段：`type/liuQin/naJia/wuXing/liuShen/yaoCi/relation`，未动爻为 `null`。
- `yongShen`：升级为分组数组 `[{ targetLiuQin, source, selected, candidates }]`。
- `shenSystem`：升级为 `shenSystemByYongShen` 数组，按目标输出原神/忌神/仇神。
- 神煞：抽出共享模块，八字调用共享函数保持行为；六爻逐爻调用 `calculateBranchShenSha`，整盘级输出 `globalShenSha`。
- 应期：保留 `timeRecommendations` 字段名，新增 `targetLiuQin/startDate/endDate/confidence`，窗口 90 天。
- 兼容策略：破坏性重构，不保留旧字段。

### 3.3 数据库与迁移（如适用）

- 是否需要 migration：否。
- 涉及对象（表/字段/索引/约束）：无。
- 回填策略：不涉及。
- RLS/权限影响：无。

## 4. 验收标准

- 功能验收：
  - 输出不再包含已删除顶层字段。
  - `fullYaos` 按新结构输出，动爻具备 `changedYao`。
  - 支持多目标用神分组与候选排序。
  - 暗动/日破可被结构化识别。
- 接口验收：`tools.ts` 中 input/output schema 与 `types.ts` 完全一致。
- 性能/稳定性验收：本地测试在可接受时间内完成，无新增异常。
- 回归范围：八字神煞输出一致；`mcp-core` 现有测试通过。

## 5. 测试计划

- 单元测试：新增 `packages/mcp-core/tests/liuyao-structured-output.test.mjs`，覆盖新结构与关键行为。
- 集成/路由测试：不新增（本次仅 `mcp-core` 层）。
- 手动验证步骤：运行 `handleLiuyaoAnalyze` 样例并检查字段形态与应期窗口。

## 6. 风险与回滚

- 失败信号：下游依赖旧字段报错；神煞回归偏差；测试失败。
- 风险等级：中。
- 回滚步骤：回滚本次改动提交，恢复旧输出结构（无 DB 变更）。

## 7. 里程碑与任务拆分

- M1：完成 schema/type 重构并建立失败测试。
- M2：完成 liuyao handler 与共享神煞模块改造。
- M3：编译、测试、修正并输出变更总结。

## 8. 关联信息

- 相关 issue：无。
- 相关 PR：待创建。
- 关联文档：`docs/specs/templates/spec-full.md`。

## 9. Web 端对齐补充

### 9.1 变更范围

- 影响模块：
  - `src/lib/liuyao.ts`
  - `src/lib/liuyao-shensha.ts`（新增）
  - `src/app/liuyao/result/page.tsx`
  - `src/components/liuyao/TraditionalAnalysis.tsx`
  - `src/components/liuyao/HexagramDisplay.tsx`
  - `src/app/api/liuyao/route.ts`
  - `src/lib/data-sources/liuyao.ts`
- 不涉及数据库结构变更与 migration。

### 9.2 目标契约（Web）

- `performFullAnalysis` 输出契约与 MCP 新结构对齐：
  - 删除：`changedYaos`、`shenSystem`、`summary`。
  - `fullYaos[]` 增加：`isChanging`、`movementState`、`movementLabel`、`shenSha[]`、`changedYao`。
  - `yongShen` 改为数组分组：`[{ targetLiuQin, source, selected, candidates }]`。
  - 新增：`shenSystemByYongShen[]`、`globalShenSha[]`。
  - `timeRecommendations` 使用结构化窗口：`startDate/endDate/confidence`。
- `performFullAnalysis` 支持可选参数：
  - `options?: { yongShenTargets?: LiuQin[] }`。
  - 当前页面阶段默认按 `question` 推断，不新增手动输入 UI。

### 9.3 UI 与提示词同步策略

- 结果页改为多用神分组展示，单目标 `yongShen` 逻辑下线。
- `HexagramDisplay` 改为多位置高亮（`yongShenPositions: number[]`）。
- `TraditionalAnalysis` 改为分组卡片，按目标展示主用神/候选/神系/应期。
- API 路由 `traditionalInfo` 拼装改为消费新结构并移除 `summary` 文案段。
- 数据源 `formatForAI` 改为消费新字段并移除 `summary` 依赖。

### 9.4 验收补充（Web）

- `src/tests/liuyao-analysis.test.ts`：
  - 验证 `changedYaos/summary/shenSystem` 已移除；
  - 验证 `fullYaos.changedYao`、`yongShen[]`、`shenSystemByYongShen[]`、结构化应期字段。
- `src/tests/liuyao-structured-output.test.ts`：
  - 验证同支变爻 `relation=伏吟`；
  - 验证 `timeRecommendations` 窗口字段与置信度范围。

## 10. 用神目标严格显式选择（Web + MCP）

### 10.1 决策锁定

- 用神目标固定 5 类：`父母/兄弟/子孙/妻财/官鬼`。
- Web 端改为多选必填，覆盖快速起卦、铜钱起卦、选卦起卦。
- 选择器放在问题输入区内部右侧（移动端折行但仍在同输入模块）。
- MCP `liuyao_analyze` 输入 `yongShenTargets` 必填，不再自动兜底推断。
- `question` 仍保留用于断语上下文，但不再承担缺省目标推断。

### 10.2 接口与类型

- `src/lib/liuyao.ts`
  - `DivinationResult` 增加 `yongShenTargets: LiuQin[]`。
  - `performFullAnalysis(..., options?: { yongShenTargets?: LiuQin[] })` 保留签名兼容，但运行时强校验必须传有效目标。
- `packages/mcp-core/src/types.ts`
  - `LiuyaoInput.yongShenTargets` 由可选改为必填。
  - `YongShenGroupInfo.source` 固定 `'input'`。
- `packages/mcp-core/src/tools.ts`
  - `liuyao_analyze.inputSchema.required` 包含 `yongShenTargets`。
  - 描述明确“调用前先判断并填写，不再自动兜底”。

### 10.3 数据持久化

- 新增 migration：`supabase/migrations/20260210_add_yongshen_targets_to_liuyao_divinations.sql`。
- 表 `liuyao_divinations` 新增 `yongshen_targets text[]`：
  - 旧记录允许 `NULL`（历史兼容）；
  - 非空时必须非空数组，且元素限定为 5 类目标。
- `save/interpret/update` 路由均透传并持久化 `yongshen_targets`。

### 10.4 历史兼容策略

- 对历史旧记录（无 `yongshen_targets`）：
  - 结果页显示“必须先选择分析目标”内联选择区；
  - 用户选择后可继续分析，并在有 `divinationId` 时回写数据库。

### 10.5 测试补充

- `src/tests/liuyao-route.test.ts`
  - 覆盖 `save/interpret` 缺失目标返回 400。
- `src/tests/liuyao-yongshen-target-ui.test.ts`
  - 覆盖入口页强制选择与结果页补选门槛静态检查。
- `packages/mcp-core/tests/liuyao-input-validation.test.mjs`
  - 覆盖缺失/非法/合法多目标输入。
