# AGENTS.md

## 目标与范围

- 本文是 MingAI 仓库的执行规范。
- 目标：减少无效上下文，提升可执行性，保证交付质量。
- 决策优先级：`正确性 > 安全性 > 一致性 > 速度`。

## 常用命令

```bash
pnpm install
pnpm dev              # http://localhost:3000
pnpm build
pnpm start
pnpm lint
pnpm test

# 跑单测文件
NODE_OPTIONS=--require=./scripts/ts-register.cjs node --test src/tests/mbti-logic.test.ts
```

## 项目最小地图

- `src/app/*`: Next.js App Router 页面与 API 路由（`src/app/api/*`）。
- `src/components/*`: UI 与业务组件。
- `src/lib/*`: 核心业务逻辑与可复用能力（AI、鉴权、积分、限流、数据源、RAG）。
- `src/tests/*`: Node.js built-in test runner 测试。
- `supabase/migrations/*`: 数据库迁移脚本。
- `supabase/tabel_export_from_supabase.sql`: 当前 schema 导出快照。

## 关键表速查（防止重复建模）

- 用户与配置：`users`、`user_settings`、`app_settings`。
- 对话与分析主表：`conversations`（统一承载 AI 结果与 `source_type/source_data`）。
- 命理数据：`bazi_charts`、`ziwei_charts`、`tarot_readings`、`liuyao_divinations`、`hepan_charts`、`mbti_readings`、`face_readings`、`palm_readings`。
- AI 模型管理：`ai_models`、`ai_model_sources`、`ai_model_stats`。
- 会员与系统：`rate_limits`、`credit_transactions`、`activation_keys`、`orders`。
- 知识库：`knowledge_bases`、`knowledge_entries`、`archived_sources`。
- 全量字段与约束以 `supabase/tabel_export_from_supabase.sql` 为唯一准绳。

## 强制规范（MUST）

- `API 路由`必须优先使用 `src/lib/api-utils.ts`，禁止在 `route.ts` 里随意创建 Supabase 客户端。
- `管理员接口`必须使用 `requireAdminUser()` 或 `requireAdminContext()`。
- 需要用户态的接口必须使用 `requireUserContext()`（或等价受控封装），并统一返回 `jsonOk/jsonError`。
- 涉及会员与积分的功能，必须按顺序执行：会员校验 -> 积分校验/扣减 -> 限流校验。
- 需要 RLS bypass 时，只能在服务端使用 `getServiceRoleClient()`；严禁暴露 service role 到客户端。
- 新增表/字段前，必须先检查 `supabase/tabel_export_from_supabase.sql` ，并说明“为何不能复用现有结构”，必要时可以检查 `supabase/migrations/*`。
- 未经明确批准，禁止新增核心目录、系统级模块或数据库主表。
- 新增或修改数据库结构，必须新增 migration；禁止直接改线上表结构。
- 修改 DB 行为时必须评估并同步：RLS、索引、默认值、回填策略、兼容旧数据。
- 新增 AI 分析来源时，必须同步维护 `conversations.source_type/source_data` 的写入与读取逻辑。
- 新建文件/模块前，必须先检索已有实现并优先复用，避免平行重复实现。
- 结构归属不明确时，先提问确认后再落盘，禁止猜测目录或表设计。
- 禁止在客户端使用 `alert`；统一使用 Toast 体系（`useToast` / `ToastProvider`）。
- TypeScript 保持 strict 通过；禁止引入无必要的 `any`、`@ts-ignore`。
- 页面层保持轻量，业务逻辑尽量下沉到 `src/lib/*` 或 feature 组件。
- 改动完成后必须补齐最小验证（见“测试与验收”）。

## API 路由标准流程

1. 解析请求（body / query / params）。
2. 参数校验（优先复用 `src/lib/validation.ts`）。
3. 鉴权（`requireUserContext/requireAdmin*`）。
4. 权限与业务前置检查（membership、credits、rate limit）。
5. 执行业务逻辑（优先复用 `src/lib/*` 现有模块）。
6. 持久化与审计（必要时记录 source、stats、conversation）。
7. 返回统一响应（JSON 或 SSE streaming）。

## 前端实现规范

- 默认使用 Server Component；仅在需要 hooks/浏览器 API/交互状态时使用 `'use client'`。
- 使用 `'use client'` 时，建议在文件头用一行注释说明原因（如“需要 useState + DOM 事件”）。
- 统一使用 `@/` 别名引用 `src` 下模块。
- 静态常量移到组件外，避免重复创建对象/数组。
- 昂贵计算使用 `useMemo`，透传给子组件的函数优先 `useCallback`。
- loading 态优先使用骨架屏（Skeleton）而非闪烁切换。
- 保持现有主题与视觉变量体系（Tailwind + CSS variables），避免引入孤立样式系统。

## AI 与流式响应规范

- Chat/分析类接口需兼容现有 SSE 消息结构，避免破坏前端流式解析。
- 支持 `content` 与 `reasoning` 分离展示的场景，不要在服务端混成单通道文本。
- 长流式任务必须支持中断（abort）与失败后的可恢复策略（必要时配合 retry/persistWithRetry）。
- 新模型接入需同时检查：tier 访问控制、source 配置、统计归集（`ai_model_stats`）。

## 数据库与迁移规范

- migration 文件建议使用时间前缀命名，例如：`YYYYMMDD_<feature>.sql`。
- migration 中涉及安全对象（函数、视图、触发器）时，显式声明 `search_path` 与权限边界。
- 任何破坏性变更必须提供兼容策略（双写/回填/灰度字段/可回滚方案至少一种）。
- 如结构变化影响开发理解，需同步更新相关文档与 schema 快照。

## 测试与验收

### 变更最低要求

- 纯文案/样式微调：至少本地手动验证相关页面。
- 业务逻辑变更（`src/lib/*`）：新增或更新对应单测。
- API 行为变更（`src/app/api/*`）：补充路由相关测试（成功、失败、权限边界至少覆盖两类）。
- 涉及鉴权/积分/会员/限流/计费：必须补充回归测试。

### 合并前建议命令

```bash
pnpm lint
pnpm test
```

若只改局部，可先跑受影响测试，再跑全量测试。

## 提交与变更说明

- Commit message 使用 Conventional Commits：`feat: / fix: / refactor: / chore: / docs:`。
- PR 描述建议包含：
  - 改了什么（行为变化）
  - 为什么改（问题或目标）
  - 如何验证（命令 + 结果）
  - 风险与回滚点（如有）

## 环境变量

- 以 `.env.example` 为准维护变量清单。
- 新增环境变量必须同步更新 `.env.example` 与使用文档。
- 严禁提交真实密钥（包括测试密钥）到仓库。

## 交付检查清单

- [ ] 变更范围清晰，未引入无关重构。
- [ ] 复用现有模块，避免重复实现。
- [ ] 鉴权、权限、积分、限流链路完整。
- [ ] 错误路径可观测（错误码/错误信息一致）。
- [ ] 测试与 lint 已通过，或已明确说明未执行原因。
- [ ] 文档已同步（如涉及接口、配置、迁移、行为变化）。