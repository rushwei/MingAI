# Spec-Lite: Mingli MCP Skill

## 背景

- 现状：仓库已有完整命理 MCP 能力，但现有 Skill 偏工程接入说明，缺少“面向用户解读”的固定分析顺序。
- 触发点：需要把 Skill 重构为“算命流程规范”，例如八字先判身强弱与喜用神，再看大运流年，其它术数同样有固定步骤。

## 目标与非目标

- 目标：
- 在 `docs/skills/mingai-mcp-assistant/` 创建可复用 Skill。
- 提供 `SKILL.md`，明确统一输出契约与跨术数协同策略。
- 提供 `references/`，按术数沉淀固定解读流程（八字、六爻、紫微、塔罗）。
- 保留 MCP 工具矩阵，确保流程可直接映射到可执行工具调用。
- 生成 `agents/openai.yaml`，保证技能可被 UI 识别。
- 非目标：
- 不修改业务代码、API 行为、数据库结构。
- 不新增 MCP 工具实现或更改现有工具协议。

## 方案

- 影响模块：
- `docs/specs/2026-02-13-mingai-skill.md`
- `docs/skills/mingai-mcp-assistant/SKILL.md`
- `docs/skills/mingai-mcp-assistant/agents/openai.yaml`
- `docs/skills/mingai-mcp-assistant/references/*`
- 实现要点：
- 以 `skill-creator` 规范组织结构，主文档只保留全局规则与流程入口。
- 各术数流程下沉到独立 reference 文件，避免主文档膨胀。
- 在流程中显式标记 Mandatory 节点，约束不可跳步。
- 保留工程实现约束作为附录，避免影响“算命流程规范”的主线。
- 兼容性说明：
- 仅新增文档与技能目录，不影响现有运行时。

## 验收

- 功能验收：
- Skill 前置元数据完整（`name` 与 `description`）。
- Skill 主流程覆盖八字、六爻、紫微、塔罗四类核心场景，且每类都有固定步骤。
- 八字流程明确包含：身强弱 -> 喜用神 -> 大运流年。
- 引用路径与工具名与仓库现状一致。
- 测试范围：
- 执行技能结构校验脚本（若环境依赖允许）。
- 进行人工结构核对（frontmatter、目录结构、引用路径）。

## 风险与回滚

- 风险：
- 技能文档与代码后续演进可能出现漂移。
- 回滚步骤：
- 删除 `docs/skills/mingai-mcp-assistant/` 目录与本 Spec 文件即可。
