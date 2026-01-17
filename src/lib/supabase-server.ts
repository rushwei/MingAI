/**
 * Supabase 服务端客户端
 * 
 * 使用 Service Role Key 绕过 RLS
 * 仅用于服务端 API 路由
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let serviceClient: SupabaseClient | null = null;

/**
 * 获取服务端 Supabase 客户端（绕过 RLS）
 * 使用单例模式避免重复创建
 * 注意：此客户端使用 Service Role Key，仅用于服务端
 */
export function getServiceClient(): SupabaseClient {
    if (serviceClient) return serviceClient;

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
        console.error('[supabase-server] Missing Supabase service configuration');
        throw new Error('Missing Supabase service configuration');
    }

    serviceClient = createClient(url, serviceKey, {
        auth: { persistSession: false }
    });

    return serviceClient;
}
