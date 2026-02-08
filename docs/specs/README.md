# Spec-Kit 使用说明

## 目标

- 让需求先收敛、再实现，减少返工和“乱建结构”。
- 为每个功能性改动提供可追溯的决策记录。

## 分级规则

- `No Spec`
  - 适用：仅文案、样式、注释、格式化等，不改变行为与契约。
  - 要求：PR 中必须说明为何可归类为 `No Spec`。
- `Spec-Lite`
  - 适用：单模块小改动，不涉及 API 契约或数据库结构变更。
  - 要求：使用 `docs/specs/templates/spec-lite.md` 创建短版 Spec。
- `Full Spec`
  - 适用：新增功能、行为变更、接口契约变更、数据库结构变更、跨模块重构。
  - 要求：使用 `docs/specs/templates/spec-full.md` 创建完整 Spec。

如无法快速判断等级，默认提升一级处理。

## 目录约定

- 模板目录：`docs/specs/templates/`
- Spec 实例目录：`docs/specs/`
- 历史归档目录：`docs/specs/archive/`

## 命名规则

- Spec 文件名：`docs/specs/YYYY-MM-DD-<topic>.md`
- 同一主题优先更新原文件，避免重复创建多个并行版本。

## 快速流程（5 步）

1. 判断本次变更属于 `No Spec`、`Spec-Lite` 或 `Full Spec`。
2. 若需 Spec，从对应模板复制创建新文件。
3. 在实现前完成 Spec 并通过评审；实现偏离时先更新 Spec。
4. 开发与测试按 Spec 验收标准执行。
5. 提交 PR 时按模板填写 Spec 类型；`Spec-Lite/Full Spec` 必须附 Spec 链接。

## 热修例外

- 线上故障允许先修复后补 Spec。
- 补写时必须包含：事故原因、修复策略、回归测试、预防动作。
