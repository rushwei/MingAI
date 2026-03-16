# Qimen Daliuren Regression Fixes

## 1. 背景与问题

- 当前现状：
  - 奇门遁甲 core handler 在顶层直接依赖 `taobi`，但 `@mingai/mcp-core` 未声明该运行时依赖。
  - data-source registry 新增奇门/六壬 provider 时引入了括号缺失和联合类型断裂，导致 registry 初始化失败。
  - 大六壬历史记录跳转结果页时没有带回 `conversation_id`，已保存的 AI 解读无法恢复。
  - 奇门 Web 包装层和 MCP core 都没有真正消费 `zhiFuJiGong`，前端暴露的寄宫选项实际无效。
  - `mcp-core` 后续补入了一组旧工具别名，和当前已重命名后的工具面不一致。
- 触发原因：
  - 新功能合入后缺少依赖声明和 focused regression 测试。
  - Web 包装层、core 类型和 tool schema 在奇门参数上没有保持一致。
  - 历史页恢复逻辑只关注记录 id，没有把已存在的 conversation 绑定视为可恢复状态。
- 主要痛点：
  - 干净安装后 `@mingai/mcp-core` 会直接因缺依赖而不可导入。
  - 知识库数据源、奇门寄宫选项和六壬历史解读恢复都存在用户可见回归。
  - MCP tool surface 出现重复/过时命名，增加调用歧义。

## 2. 目标与非目标

### 2.1 目标

- 为 `@mingai/mcp-core` 正确声明并安装奇门运行时依赖。
- 修复 data-source registry 和类型定义，使 `qimen_chart`、`daliuren_divination` 正常注册。
- 让大六壬历史页可以恢复已保存的 AI 解读，不重复消费积分。
- 将 `zhiFuJiGong` 从 Web/API 一直透传到 mcp-core 奇门 handler，并真正影响排盘。
- 清理后来补入的旧 MCP 别名，只保留当前命名后的工具面。

### 2.2 非目标

- 不重做奇门遁甲整体算法。
- 不调整奇门/六壬页面的视觉设计。
- 不新增数据库表或修改现有 schema。

## 3. 方案设计

### 3.1 变更范围

- 影响模块：
  - `packages/mcp-core/package.json`
  - `packages/mcp-core/src/handlers/qimen.ts`
  - `packages/mcp-core/src/tools.ts`
  - `packages/mcp-core/src/index.ts`
  - `packages/mcp-core/src/formatters.ts`
  - `packages/mcp-core/src/types.ts`
  - `src/lib/divination/qimen.ts`
  - `src/lib/data-sources/index.ts`
  - `src/lib/data-sources/types.ts`
  - `src/app/daliuren/history/page.tsx`
  - `src/app/daliuren/result/page.tsx`
- 影响接口：
  - `POST /api/qimen`
  - MCP 工具列表与工具分发
  - data-source registry 初始化
- 影响数据结构：
  - 无数据库结构变更
  - 仅修正 session cache 中的历史恢复字段

### 3.2 实现方案

- 核心思路：
  - 用最小修复恢复运行时稳定性，再让奇门/六壬行为与现有 UI/类型契约对齐。
  - MCP 仅保留当前命名后的 canonical tools，删除后来补入的旧别名映射。
- 关键流程：
  - `mcp-core` 声明 `taobi` 依赖，并在本地安装更新 lockfile。
  - data-source registry 补全 `qimen_chart` 注册闭合，并把 `daliuren_divination` 放回联合类型内部。
  - 奇门 wrapper 将前端 `jiLiuYi/jiWuGong` 映射到 core 的 `ji_liuyi/ji_wugong`，core handler 再映射为底层库配置。
  - 大六壬历史页写入 `conversationId`，结果页在已有会话时优先恢复已存分析。
  - `tools.ts`、`index.ts`、`formatters.ts` 一起移除旧别名逻辑，避免重复 tool surface。
- 兼容策略（向前/向后兼容）：
  - 对 Web 前端保持现有 camelCase 输入不变，仅在 wrapper 内部转换。
  - MCP 不再兼容旧别名，直接收敛到当前 canonical names。

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
  - 干净安装后 `@mingai/mcp-core` 可正常导入，奇门调用可执行。
  - data-source registry 能解析已有类型，也能解析 `qimen_chart` 与 `daliuren_divination`。
  - 大六壬历史记录重新打开时，可恢复此前已保存的 AI 解读。
  - 切换奇门“六甲直符寄宫”选项会真正传到计算链路。
  - MCP 工具列表不再出现后来补入的旧别名重复项。
- 接口验收：
  - `POST /api/qimen` 接收的 `zhiFuJiGong` 能稳定流入 core。
  - `handleToolCall()` 和 `formatAsMarkdown()` 仅接受/暴露当前 canonical tool names。
- 性能/稳定性验收：
  - `pnpm test` 不再被 `Cannot find module 'taobi'` 阻断。
  - `eslint` 不再报 data-source 语法错误。
- 回归范围：
  - qimen 计算
  - daliuren 历史恢复
  - data-sources registry
  - mcp-core tools surface

## 5. 测试计划

- 单元测试：
  - `mcp-core` package manifest 声明 qimen runtime dependency
  - qimen wrapper 透传 `zhiFuJiGong`
  - canonical MCP tools 不含旧别名
- 集成/路由测试：
  - `src/tests/data-sources.test.ts`
  - 新增 qimen/daliuren regression tests
  - `packages/mcp-core/tests/*` 针对 tool surface 与 qimen contract 的回归测试
- 手动验证步骤：
  - 奇门页面切换寄宫模式并成功排盘
  - 六壬历史页打开已解读记录，确认 AI 内容恢复

## 6. 风险与回滚

- 失败信号：
  - 安装后 `taobi` 仍不可解析
  - qimen 输出不稳定或与已有页面字段不兼容
  - MCP 调用方仍依赖旧别名导致报错
- 风险等级：
  - 中
- 回滚步骤：
  - 回退本次修复提交
  - 恢复此前 tool surface 与 qimen 参数映射

## 7. 里程碑与任务拆分

- M1：补红灯测试，锁定依赖/registry/历史恢复/tool surface 回归
- M2：实现最小修复并安装缺失依赖
- M3：跑 focused lint/test 并确认没有误伤现有功能

## 8. 关联信息

- 相关 issue：
  - review 指出的 qimen/daliuren/data-source/MCP regressions
- 相关 PR：
  - 待提交
- 关联文档：
  - `docs/specs/2026-03-15-qimen-dunjia.md`
  - `docs/specs/2026-03-15-daliuren.md`
