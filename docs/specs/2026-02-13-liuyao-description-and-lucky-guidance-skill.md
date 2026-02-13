# Spec-Lite: 修复六爻描述断言并补充幸运色/方位自动推导技能

## 背景

- 现状：
- `packages/mcp-core/tests/liuyao-tool-schema-description.test.mjs` 失败，原因是 `liuyao_analyze` 描述未体现候选顺序语义。
- `docs/skills/divination/references/time-trend-workflow.md` 仍依赖已移除的 `daily_fortune` 返回字段（`scores/advice/luckyColor/luckyDirection`）。
- 触发点：
- 需要修复测试失败，并在 Skill 中补上 AI 自动判定幸运颜色/幸运方位的规则。

## 目标与非目标

- 目标：
- 修复六爻描述文案，使对应测试通过。
- 更新 divination Skill，改为在无直接字段时由 AI 基于规则推导幸运颜色/方位。
- 保持六爻输出结构不变。
- 非目标：
- 不恢复 `daily_fortune` 的 `scores/advice/luckyColor/luckyDirection` 字段。
- 不改动数据库与 API 路由行为。

## 方案

- 影响模块：
- `packages/mcp-core/src/tools.ts`
- `docs/skills/divination/SKILL.md`
- `docs/skills/divination/references/time-trend-workflow.md`
- `docs/skills/divination/references/mcp-tool-matrix.md`
- 新增 `docs/skills/divination/references/lucky-color-direction-rules.md`
- 实现要点：
- 在 `liuyao_analyze.description` 增加“候选顺序/越靠后参考度越低”语义。
- 在 Skill 中增加“幸运色/幸运方位推导规则”引用与执行步骤。
- 兼容性说明：
- 仅文案与技能文档更新，不影响运行时协议（除六爻描述文本）。

## 验收

- 功能验收：
- `liuyao-tool-schema-description` 测试通过。
- Skill 文档明确：`daily_fortune` 不再直接提供幸运字段，需 AI 自动推导。
- 测试范围：
- 运行 `packages/mcp-core/tests/liuyao-tool-schema-description.test.mjs`
- 回归 `packages/mcp-core/tests/deterministic-rng.test.mjs`

## 风险与回滚

- 风险：
- Skill 规则与实现后续演进可能出现不一致。
- 回滚步骤：
- 回退以上文件改动即可。
