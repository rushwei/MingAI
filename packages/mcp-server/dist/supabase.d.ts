/**
 * MCP Server 专用 Supabase 客户端
 *
 * MCP Server 是独立 Express 进程，不能 import src/lib/
 * 使用 SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */
import { type SupabaseClient } from '@supabase/supabase-js';
export declare function getSupabaseClient(): SupabaseClient;
