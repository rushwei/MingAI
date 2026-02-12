/**
 * MCP Server 专用 Supabase 客户端
 *
 * MCP Server 是独立 Express 进程，不能 import src/lib/
 * 使用 SUPABASE_URL + SUPABASE_ANON_KEY 调用受限 RPC
 */
import { createClient } from '@supabase/supabase-js';
let client = null;
export function getSupabaseClient() {
    if (client)
        return client;
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (!url || !key) {
        throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
    }
    client = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    return client;
}
