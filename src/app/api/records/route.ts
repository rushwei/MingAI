/**
 * 记录列表 API 路由
 * GET: 获取记录列表
 * POST: 创建新记录
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { RecordCategory, RecordFilters } from '@/lib/records';

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

export async function GET(request: NextRequest) {
    try {
        const supabase = await createSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: '请先登录' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1');
        const pageSize = parseInt(searchParams.get('pageSize') || '20');
        const category = searchParams.get('category') as RecordCategory | null;
        const search = searchParams.get('search');

        const filters: RecordFilters = {};
        if (category) filters.category = category;
        if (search) filters.search = search;

        // 构建查询
        let query = supabase
            .from('ming_records')
            .select('*', { count: 'exact' })
            .eq('user_id', user.id)
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false });

        // 应用筛选条件
        if (filters.category) {
            query = query.eq('category', filters.category);
        }
        if (filters.search) {
            query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
        }

        // 分页
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;

        if (error) {
            console.error('获取记录失败:', error);
            return NextResponse.json({ error: '获取记录失败' }, { status: 500 });
        }

        return NextResponse.json({
            records: data,
            total: count || 0,
        });
    } catch (error) {
        console.error('获取记录失败:', error);
        return NextResponse.json({ error: '获取记录失败' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: '请先登录' }, { status: 401 });
        }

        const body = await request.json();

        if (!body.title) {
            return NextResponse.json({ error: '标题不能为空' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('ming_records')
            .insert({
                user_id: user.id,
                title: body.title,
                content: body.content || null,
                category: body.category || 'general',
                tags: body.tags || [],
                event_date: body.event_date || null,
                related_chart_type: body.related_chart_type || null,
                related_chart_id: body.related_chart_id || null,
                is_pinned: body.is_pinned || false,
            })
            .select()
            .single();

        if (error) {
            console.error('创建记录失败:', error);
            return NextResponse.json({ error: '创建记录失败' }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('创建记录失败:', error);
        return NextResponse.json({ error: '创建记录失败' }, { status: 500 });
    }
}
