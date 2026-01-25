# 架构优化与重构记录

## 目标
- 统一 API 层认证与错误响应模式
- 降低路由层重复代码与耦合度
- 提升知识库归档类型扩展能力
- 保持行为一致的前提下优化可维护性

## 已实施改动
- 新增通用 API 工具，集中处理鉴权与响应格式
- 重构知识库与记录模块的 API 路由，统一认证与错误处理
- 数据源 API 路由复用统一鉴权逻辑
- 归档类型扩展支持 chat_message
- 新增单条对话回复归档测试用例
- AI 相关 API 路由统一 Bearer 鉴权与模型权限校验
- 模型权限与推理开关解析集中到 AI 访问工具
- 管理员/用户类 API 路由统一 Bearer 鉴权与管理员校验
- 社区模块用户鉴权入口统一到通用工具
- 社区模块重试逻辑抽取为通用工具
- 社区模块分页参数解析统一到通用工具
- 社区路由错误响应统一到通用工具
- 社区路由成功响应统一到通用工具
- 社区路由参数校验统一到通用工具

## 关键模块
- 统一工具：[api-utils.ts](file:///Users/hhs/Develop/Project/MingAI/src/lib/api-utils.ts)
- 通用重试工具：[retry.ts](file:///Users/hhs/Develop/Project/MingAI/src/lib/retry.ts)
- 模型访问工具：[ai-access.ts](file:///Users/hhs/Develop/Project/MingAI/src/lib/ai-access.ts)
- 分页解析工具：[pagination.ts](file:///Users/hhs/Develop/Project/MingAI/src/lib/pagination.ts)
- 参数校验工具：[validation.ts](file:///Users/hhs/Develop/Project/MingAI/src/lib/validation.ts)
- 知识库 API：
  - [knowledge-base/route.ts](file:///Users/hhs/Develop/Project/MingAI/src/app/api/knowledge-base/route.ts)
  - [knowledge-base/[id]/route.ts](file:///Users/hhs/Develop/Project/MingAI/src/app/api/knowledge-base/%5Bid%5D/route.ts)
  - [knowledge-base/ingest/route.ts](file:///Users/hhs/Develop/Project/MingAI/src/app/api/knowledge-base/ingest/route.ts)
  - [knowledge-base/upload/route.ts](file:///Users/hhs/Develop/Project/MingAI/src/app/api/knowledge-base/upload/route.ts)
  - [knowledge-base/archive/route.ts](file:///Users/hhs/Develop/Project/MingAI/src/app/api/knowledge-base/archive/route.ts)
  - [knowledge-base/archive/[id]/route.ts](file:///Users/hhs/Develop/Project/MingAI/src/app/api/knowledge-base/archive/%5Bid%5D/route.ts)
- 记录 API：
  - [records/route.ts](file:///Users/hhs/Develop/Project/MingAI/src/app/api/records/route.ts)
  - [records/[id]/route.ts](file:///Users/hhs/Develop/Project/MingAI/src/app/api/records/%5Bid%5D/route.ts)
  - [records/import/route.ts](file:///Users/hhs/Develop/Project/MingAI/src/app/api/records/import/route.ts)
  - [records/export/route.ts](file:///Users/hhs/Develop/Project/MingAI/src/app/api/records/export/route.ts)
- 数据源 API：
  - [data-sources/route.ts](file:///Users/hhs/Develop/Project/MingAI/src/app/api/data-sources/route.ts)
  - [data-sources/[type]/[id]/route.ts](file:///Users/hhs/Develop/Project/MingAI/src/app/api/data-sources/%5Btype%5D/%5Bid%5D/route.ts)
- AI 分析 API：
  - [tarot/route.ts](file:///Users/hhs/Develop/Project/MingAI/src/app/api/tarot/route.ts)
  - [liuyao/route.ts](file:///Users/hhs/Develop/Project/MingAI/src/app/api/liuyao/route.ts)
  - [hepan/route.ts](file:///Users/hhs/Develop/Project/MingAI/src/app/api/hepan/route.ts)
  - [mbti/route.ts](file:///Users/hhs/Develop/Project/MingAI/src/app/api/mbti/route.ts)
  - [face/route.ts](file:///Users/hhs/Develop/Project/MingAI/src/app/api/face/route.ts)
  - [palm/route.ts](file:///Users/hhs/Develop/Project/MingAI/src/app/api/palm/route.ts)
  - [bazi/analysis/route.ts](file:///Users/hhs/Develop/Project/MingAI/src/app/api/bazi/analysis/route.ts)
  - [dream/route.ts](file:///Users/hhs/Develop/Project/MingAI/src/app/api/dream/route.ts)
- 管理员/用户 API：
  - [activation-keys/route.ts](file:///Users/hhs/Develop/Project/MingAI/src/app/api/activation-keys/route.ts)
  - [payment-status/route.ts](file:///Users/hhs/Develop/Project/MingAI/src/app/api/payment-status/route.ts)
  - [orders/route.ts](file:///Users/hhs/Develop/Project/MingAI/src/app/api/orders/route.ts)
  - [annual-report/route.ts](file:///Users/hhs/Develop/Project/MingAI/src/app/api/annual-report/route.ts)
  - [mbti/history/route.ts](file:///Users/hhs/Develop/Project/MingAI/src/app/api/mbti/history/route.ts)
  - [community/reports/route.ts](file:///Users/hhs/Develop/Project/MingAI/src/app/api/community/reports/route.ts)
  - [community/posts/[id]/admin/route.ts](file:///Users/hhs/Develop/Project/MingAI/src/app/api/community/posts/%5Bid%5D/admin/route.ts)
  - [community/posts/route.ts](file:///Users/hhs/Develop/Project/MingAI/src/app/api/community/posts/route.ts)
  - [community/posts/[id]/route.ts](file:///Users/hhs/Develop/Project/MingAI/src/app/api/community/posts/%5Bid%5D/route.ts)
  - [community/comments/route.ts](file:///Users/hhs/Develop/Project/MingAI/src/app/api/community/comments/route.ts)
  - [community/comments/[id]/route.ts](file:///Users/hhs/Develop/Project/MingAI/src/app/api/community/comments/%5Bid%5D/route.ts)
  - [community/votes/route.ts](file:///Users/hhs/Develop/Project/MingAI/src/app/api/community/votes/route.ts)

## 测试更新
- 新增知识库单条回复入库测试：[knowledge-base-ingest.test.ts](file:///Users/hhs/Develop/Project/MingAI/src/tests/knowledge-base-ingest.test.ts)
- 新增模型访问解析测试：[ai-access.test.ts](file:///Users/hhs/Develop/Project/MingAI/src/tests/ai-access.test.ts)
- 新增社区鉴权覆盖测试：[community-auth-route.test.ts](file:///Users/hhs/Develop/Project/MingAI/src/tests/community-auth-route.test.ts)
- 新增分页解析测试：[pagination.test.ts](file:///Users/hhs/Develop/Project/MingAI/src/tests/pagination.test.ts)
- 新增参数校验测试：[validation.test.ts](file:///Users/hhs/Develop/Project/MingAI/src/tests/validation.test.ts)

## 后续建议
- 将剩余 API 路由迁移到统一鉴权与响应工具
- 梳理业务层与路由层的数据校验边界，避免重复校验
- 针对性能敏感接口增加缓存与批处理策略
