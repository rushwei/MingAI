/**
 * 知识库统一 Supabase 客户端工厂
 *
 * 所有 knowledge-base 模块共享此函数创建 cookie-based 服务端客户端，
 * 避免每个文件重复定义 createSupabaseClient。
 */
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase-env';

export async function createKbClient() {
    const cookieStore = await cookies();
    return createServerClient(
        getSupabaseUrl(),
        getSupabaseAnonKey(),
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        for (const { name, value, options } of cookiesToSet) {
                            cookieStore.set(name, value, options);
                        }
                    } catch {
                        // 只读 cookies 上下文无法写入时忽略
                    }
                },
            },
        }
    );
}
