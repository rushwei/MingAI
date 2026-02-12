/**
 * MCP Server 专用 Supabase 客户端
 *
 * 与 Web 端 src/lib/supabase-server.ts 同模式：
 * anon key + 系统管理员会话 access token → authenticated 角色 → 通过 RLS
 */
import { type SupabaseClient } from '@supabase/supabase-js';
/**
 * 获取 MCP Server 专用 Supabase 客户端（系统管理员会话）
 *
 * 使用 anon key + accessToken 回调，按需获取系统管理员 token。
 * 身份为 authenticated 角色，可通过 RLS 策略。
 */
export declare function getSupabaseClient(): SupabaseClient;
