# MingAI 数据库架构审计与优化报告

日期：2026-03-15

---

## 一、审计概况

通过 4 个并行 agent（查询性能、表结构、索引、安全）对 Supabase 数据库进行全面审计，共发现并修复以下问题：

| 维度 | 优化前 | 优化后 | 变化 |
|------|--------|--------|------|
| 安全告警 | 3 项 | 1 项（密码泄露保护，需 Dashboard 手动开启） | -2 |
| 性能告警（initplan） | 91 条策略 | 0 条 | -91 |
| 未索引外键 | 3 个 | 0 个 | -3 |
| 冗余索引 | 19 个 | 0 个 | -19 |
| 重复 RLS 策略 | 11 条 | 0 条 | -11 |
| 总索引数 | ~170 | 151 | -19+5 新增 |
| 总 RLS 策略数 | ~160 | 149 | 精简 |

---

## 二、已执行的 Migration 清单（共 12 个）

### 2.1 安全修复（P0）

#### `revoke_dangerous_permissions`
- 撤销 anon/authenticated 角色的 TRUNCATE、TRIGGER、REFERENCES 权限
- TRUNCATE 会绕过 RLS，是最严重的安全隐患

#### `fix_mcp_oauth_rls_policies`
- 重写 mcp_oauth_clients / mcp_oauth_codes / mcp_oauth_tokens 三表的 RLS 策略
- 修复前：任何 authenticated 用户可读写所有人的 OAuth 数据（越权漏洞）
- 修复后：
  - mcp_oauth_clients：authenticated 只读，写操作限 service_role
  - mcp_oauth_codes/tokens：用户只能 SELECT 自己的记录，写操作限 service_role

#### `fix_function_search_path`
- 修复 `update_ai_model_updated_at()` 和 `upsert_ai_model_stats()` 的 search_path
- 防止 search_path 注入攻击

### 2.2 索引优化（P1）

#### `add_missing_fk_indexes`
新增 5 个索引：

```sql
CREATE INDEX idx_mcp_oauth_codes_client_id ON mcp_oauth_codes (client_id);
CREATE INDEX idx_mcp_oauth_codes_user_id ON mcp_oauth_codes (user_id);
CREATE INDEX idx_mcp_oauth_tokens_client_id ON mcp_oauth_tokens (client_id);
CREATE INDEX idx_conversations_user_id_created_at ON conversations (user_id, created_at DESC);
CREATE INDEX idx_archived_sources_type_id_user ON archived_sources (source_type, source_id, user_id);
```

#### `drop_redundant_indexes`
删除 19 个冗余索引：

| 删除的索引 | 冗余原因 |
|-----------|---------|
| `idx_conversations_user_id` | 与 conversations_user_id_idx 完全相同 |
| `conversations_user_id_idx` | 被复合索引 idx_conversations_user_id_updated_at 覆盖 |
| `idx_user_settings_user` | 与 idx_user_settings_user_id 完全相同 |
| `idx_user_settings_user_id` | 被 PK user_settings_pkey(user_id) 覆盖 |
| `idx_credit_transactions_user_id` | 被复合索引覆盖 |
| `idx_credit_transactions_user` | 与 idx_credit_transactions_user_id_created_at 完全相同 |
| `idx_daily_checkins_user_date` | 被 UNIQUE 约束索引覆盖 |
| `idx_daily_checkins_user_id_checkin_date` | 被 UNIQUE 约束索引覆盖 |
| `idx_daily_checkins_user_id` | 被复合索引覆盖 |
| `idx_activation_keys_code` | 被 UNIQUE 约束 activation_keys_key_code_key 覆盖 |
| `idx_notifications_user_created` | 与 idx_notifications_user_id_created_at 完全相同 |
| `idx_notifications_user_id_read` | 被部分索引 idx_notifications_user_unread 替代 |
| `bazi_charts_user_id_idx` | 与 idx_bazi_charts_user_id 完全相同 |
| `idx_annual_reports_user_year` | 被 UNIQUE 约束索引覆盖 |
| `idx_knowledge_entries_kb_id` | 被复合索引 idx_knowledge_entries_kb_id_created_at 覆盖 |
| `idx_login_attempts_email` | 被复合索引 idx_login_attempts_email_time 覆盖 |
| `idx_ai_model_stats_model_key` | 被复合索引 idx_ai_model_stats_unique 覆盖 |
| `idx_feature_subscriptions_user` | 被 UNIQUE 约束索引覆盖 |
| `idx_ming_records_user_id` | 被复合索引 idx_ming_records_user_id_event_date 覆盖 |

#### `add_archived_sources_composite_index`
- 新增 `(source_type, source_id, user_id)` 三列复合索引
- 优化 `conversations_with_archive_status` 视图的子查询性能

### 2.3 RLS 策略清理（P2）

#### `cleanup_duplicate_rls_policies`
删除 11 条重复策略：

| 表 | 删除的策略 | 原因 |
|----|-----------|------|
| users | Users can insert/update/view own profile（3条） | 与 "own data" 版本完全重复 |
| activation_keys | Admins can create/delete/update/view keys（4条） | 被 "Admins full access" ALL 策略覆盖 |
| ai_model_sources | ai_model_sources_admin_all | 与 "Admins full access" 重复 |
| ai_models | ai_models_admin_all | 与 "Admins full access" 重复 |
| ai_model_stats | ai_model_stats_admin_select | 被 "Admins full access" 覆盖 |
| purchase_links | Admins can manage purchase links | 与 "Admins full access" 重复 |
| community_anonymous_mapping | Service role can read anonymous mappings | 与另一条 service_role SELECT 重复 |

### 2.4 RLS initplan 性能优化（P1）

#### `optimize_rls_initplan_batch1` ~ `batch5`
- 将 91 条 RLS 策略中的 `auth.uid()` 替换为 `(select auth.uid())`
- 将 4 条 RLS 策略中的 `auth.role()` 替换为 `(select auth.role())`
- 优化原理：`auth.uid()` 在 RLS 中会对每一行重复计算，包裹 `select` 后 PostgreSQL 将其作为 InitPlan 只计算一次
- 覆盖全部 44 张表的用户级策略

---

## 三、优化前后安全告警对比

### 修复前（3 项）
1. ~~函数 `upsert_ai_model_stats` search_path 可变~~ → 已修复
2. ~~函数 `update_ai_model_updated_at` search_path 可变~~ → 已修复
3. 密码泄露保护未启用 → 需在 Dashboard 手动开启

### 修复后（1 项）
- 密码泄露保护未启用（非 SQL 可修复，需在 Supabase Dashboard > Authentication > Settings 中开启）

---

## 四、优化前后性能告警对比

### 修复前
- 3 个未索引外键（mcp_oauth_codes × 2, mcp_oauth_tokens × 1）
- 91 条 RLS 策略存在 initplan 性能问题

### 修复后
- 0 个未索引外键
- 0 条 initplan 问题（全部 95 条策略已优化）

---

## 五、未执行的建议项（供后续规划）

### 结构优化（中期）
- conversations.messages JSONB 拆分为独立 conversation_messages 表（建议在单条对话超 50 条消息或总量超 10 万行时实施）
- 统一 conversations 关联方式，逐步废弃 bazi_chart_id/ziwei_chart_id 直接外键
- 评估合并 ming_records + ming_notes（功能高度重叠）
- 评估合并 reminder_subscriptions + feature_subscriptions
- user_settings.prompt_kb_ids 改为 uuid[] 类型

### 数据完整性
- 约 15 张表有 user_id 列但缺少外键约束（community_*, credit_transactions, daily_checkins, notifications 等），建议添加 FK + ON DELETE CASCADE

### 长期架构
- 统一命盘表设计（新增命理类型时考虑 birth_charts 统一表）
- conversations 超 100 万行时考虑按 created_at 范围分区
- login_attempts 添加自动清理机制

### 手动操作
- 在 Supabase Dashboard 开启 Leaked Password Protection
- 定期在 SQL Editor（关闭事务模式）执行 VACUUM ANALYZE
