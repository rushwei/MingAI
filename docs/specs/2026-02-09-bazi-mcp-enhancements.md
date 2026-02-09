# MCP 八字工具增强与四柱反推工具新增

## 1. 背景与问题

- 当前现状：
  - `bazi_calculate` 仅支持按出生时间输入，输出结构为基础四柱 + 大运 + 顶层神煞对象。
  - 现有输出缺少藏干气性、每柱空亡、地支刑害合冲的结构化信息。
  - 神煞是聚合对象，不便于按柱展示。
- 触发原因：
  - 需要让 MCP 八字输出与站内专业排盘信息一致，提升下游 AI 与客户端消费能力。
  - 需要支持“先四柱、后反推候选时间、再排盘”的两步调用流程。
- 主要痛点：
  - 输出字段不够结构化，客户端还原专业盘表成本高。
  - 缺少四柱反推专用工具，MCP 调用链条不完整。

## 2. 目标与非目标

### 2.1 目标

- 对 `bazi_calculate` 做破坏式升级：
  - 每柱藏干升级为对象数组，附带气性与十神。
  - 顶层新增全局 `kongWang`（`xun`/`kongZhi`），每柱仅保留 `kongWang.isKong`。
  - 每柱增加 `shenSha[]`。
  - 顶层新增统一 `relations[]` 表示刑害合冲，且 `pillars` 使用固定枚举（`年支/月支/日支/时支`）。
  - 大运列表补充 `tenGod` 与 `branchTenGod`。
  - 删除旧顶层 `shenSha` 聚合对象。
- 新增 `bazi_pillars_resolve`：
  - 输入四柱字符串（年/月/日/时）。
  - 返回全量候选时间，候选主字段采用农历语义（含 `isLeapMonth`），用于后续直接调用农历 `bazi_calculate`。
  - `nextCall.arguments` 固定输出 `calendarType: 'lunar'`。
- `bazi_calculate` 农历输入路径增强：
  - `calendarType='lunar'` 时严格校验闰月合法性与农历日期边界，非法输入返回明确错误。

### 2.2 非目标

- 不涉及数据库结构、迁移或 RLS 调整。
- 不调整站内前端页面逻辑与 UI 样式。
- 不引入分页式候选返回（默认全量返回）。

## 3. 方案设计

### 3.1 变更范围

- 影响模块：
  - `packages/mcp-core/src/handlers/bazi.ts`
  - `packages/mcp-core/src/handlers/bazi-pillars-resolve.ts`（新增）
  - `packages/mcp-core/src/types.ts`
  - `packages/mcp-core/src/tools.ts`
  - `packages/mcp-core/src/handlers/index.ts`
  - `packages/mcp-core/src/index.ts`
  - `packages/mcp-local/src/index.ts`
  - `packages/mcp-server/src/index.ts`
  - `README.md`
  - `docs/manual/MCP-Server-Manual.md`
- 影响接口：
  - `bazi_calculate` 输出 schema 破坏式变更。
  - 新增工具 `bazi_pillars_resolve`。
- 影响数据结构：
  - `BaziOutput`、`PillarInfo`、工具输入输出类型新增/重构。

### 3.2 实现方案

- 核心思路：
  - 复用现有排盘主流程，扩展柱级结构信息（藏干明细/神煞/空亡）并补齐关系分析。
  - 新工具独立负责四柱反推，不承担最终排盘，最终仍复用 `bazi_calculate`。
- 关键流程：
  - `bazi_calculate`：
    - 时间（公历/农历）-> 农历输入合法性校验（闰月/日期）-> 四柱 -> 柱级藏干明细 -> 全局空亡 -> 柱级神煞/入空标记 -> 关系分析 -> 大运（含十神视角）。
  - `bazi_pillars_resolve`：
    - 校验四柱字符串 -> 1900-2100 反推候选（内部按公历搜索）-> 候选转农历主字段 -> 返回候选与农历排盘调用参数模板。
- 兼容策略（向前/向后兼容）：
  - 明确采用破坏式更新，不保留旧 schema 兼容层。

### 3.3 数据库与迁移（如适用）

- 是否需要 migration：否。
- 涉及对象（表/字段/索引/约束）：无。
- 回填策略：无。
- RLS/权限影响：无。

## 4. 验收标准

- 功能验收：
  - `bazi_calculate` 输出每柱藏干明细、每柱神煞、全局空亡 + 每柱入空布尔、顶层关系。
  - `bazi_calculate` 对非法农历输入（闰月不合法、农历日越界）返回明确错误。
  - `relations[].pillars` 仅输出固定枚举值（`年支/月支/日支/时支`）。
  - `daYun.list[]` 包含 `tenGod` 与 `branchTenGod`。
  - `bazi_pillars_resolve` 可返回四柱候选并指引下一步调用。
  - `bazi_pillars_resolve` 候选主字段为农历语义，`nextCall` 直接指向农历 `bazi_calculate`。
- 接口验收：
  - `tools/list` 可见 7 个工具。
  - 两个 transport（local/server）都支持新工具调用。
- 性能/稳定性验收：
  - 常规输入下工具返回正常，不出现 schema 缺字段。
- 回归范围：
  - 其余 5 个 MCP 工具行为不变。

## 5. 测试计划

- 单元测试：
  - 新增 `packages/mcp-core/tests/bazi-enhancements.test.mjs` 覆盖 bazi 新字段与新工具行为。
- 集成/路由测试：
  - 保持 `mcp-local` / `mcp-server` 现有 transport 测试通过。
- 手动验证步骤：
  - `pnpm --filter @mingai/mcp-core build`
  - `node --test packages/mcp-core/tests/bazi-enhancements.test.mjs`
  - `node --test packages/mcp-local/tests/*.test.mjs`
  - `node --test packages/mcp-server/tests/*.test.mjs`

## 6. 风险与回滚

- 失败信号：
  - 下游解析 `bazi_calculate` 旧字段失败。
  - 新工具候选反推结果异常（空结果率异常升高）。
- 风险等级：中。
- 回滚步骤：
  - 回退 `mcp-core`、`mcp-local`、`mcp-server` 相关改动 commit。
  - 恢复文档中的 6 工具描述。

## 7. 里程碑与任务拆分

- M1：类型与 schema 定义完成。
- M2：`bazi_calculate` 新结构输出与 `bazi_pillars_resolve` 实现完成。
- M3：transport 接线、测试通过、文档同步完成。

## 8. 关联信息

- 相关 issue：N/A
- 相关 PR：待创建
- 关联文档：
  - `docs/manual/MCP-Server-Manual.md`
  - `README.md`
