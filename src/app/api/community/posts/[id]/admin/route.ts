/**
 * 管理员帖子操作 API 路由
 * PUT: 管理员操作（置顶、精华、删除）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getServiceClient } from '@/lib/supabase-server';

async function createSupabaseClient() {
    const cookieStore = await cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
            },
        }
    );
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: '请先登录' }, { status: 401 });
        }

        // 检查是否是管理员
        const { data: userData } = await supabase
            .from('users')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        if (!userData?.is_admin) {
            return NextResponse.json({ error: '无权限操作' }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { action, value } = body;

        // 使用 Service Role Client 绕过 RLS
        const serviceClient = getServiceClient();

        switch (action) {
            case 'pin': {
                const { error } = await serviceClient
                    .from('community_posts')
                    .update({ is_pinned: value, updated_at: new Date().toISOString() })
                    .eq('id', id);
                if (error) throw error;
                break;
            }
            case 'feature': {
                const { error } = await serviceClient
                    .from('community_posts')
                    .update({ is_featured: value, updated_at: new Date().toISOString() })
                    .eq('id', id);
                if (error) throw error;
                break;
            }
            case 'delete': {
                const { error } = await serviceClient
                    .from('community_posts')
                    .update({ is_deleted: true, updated_at: new Date().toISOString() })
                    .eq('id', id);
                if (error) throw error;
                break;
            }
            default:
                return NextResponse.json({ error: '无效操作' }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('管理员操作失败:', error);
        return NextResponse.json({ error: '操作失败' }, { status: 500 });
    }
}
