/**
 * MCP Server 专用 Supabase 客户端
 *
 * 设计决策：使用系统管理员凭据（SUPABASE_SYSTEM_ADMIN_EMAIL/PASSWORD）
 * 通过 signInWithPassword 获取 access_token，以 authenticated 角色访问数据库。
 *
 * 为什么不用 service_role key：
 * - service_role 绕过所有 RLS，权限过大
 * - 系统管理员账户受 RLS 策略约束，遵循最小权限原则
 * - 可通过 Supabase Dashboard 随时禁用/重置该账户
 *
 * 安全注意事项：
 * - 系统管理员凭据仅存在于服务端环境变量，不暴露给客户端
 * - access_token 有 TTL，过期自动刷新
 * - 该账户应仅用于 MCP Server 的 API key 验证和 OAuth 存储操作
 */
import { type SupabaseClient } from '@supabase/supabase-js';
/**
 * 获取纯 anon 客户端（无 accessToken），用于 auth.signInWithPassword 等认证操作。
 * 配置了 accessToken 的客户端会禁止调用 auth.* 方法。
 */
export declare function getSupabaseAuthClient(): SupabaseClient;
/**
 * 获取 MCP Server 专用 Supabase 客户端（系统管理员会话）
 *
 * 使用 anon key + accessToken 回调，按需获取系统管理员 token。
 * 身份为 authenticated 角色，可通过 RLS 策略。
 */
export declare function getSupabaseClient(): SupabaseClient;
