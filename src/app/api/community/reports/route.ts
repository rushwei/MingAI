/**
 * 举报 API 路由
 * GET: 管理员获取举报列表
 * POST: 提交举报
 * PUT: 管理员处理举报
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getServiceClient } from '@/lib/supabase-server';
import { TargetType, ReportReason, ReportStatus } from '@/lib/community';

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

        // 检查是否是管理员
        const { data: userData } = await supabase
            .from('users')
            .select('is_admin')
            .eq('id', user.id)
            .single();

        if (!userData?.is_admin) {
            return NextResponse.json({ error: '无权限操作' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') as ReportStatus | null;
        const page = parseInt(searchParams.get('page') || '1');
        const pageSize = parseInt(searchParams.get('pageSize') || '20');

        // 使用 Service Role Client 获取所有举报
        const serviceClient = getServiceClient();

        let query = serviceClient
            .from('community_reports')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;

        if (error) {
            console.error('获取举报列表失败:', error);
            return NextResponse.json({ error: '获取举报列表失败' }, { status: 500 });
        }

        return NextResponse.json({
            reports: data,
            total: count || 0,
        });
    } catch (error) {
        console.error('获取举报列表失败:', error);
        return NextResponse.json({ error: '获取举报列表失败' }, { status: 500 });
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
        const { targetType, targetId, reason, description } = body as {
            targetType: TargetType;
            targetId: string;
            reason: ReportReason;
            description?: string;
        };

        if (!targetType || !targetId || !reason) {
            return NextResponse.json({ error: '缺少参数' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('community_reports')
            .insert({
                reporter_id: user.id,
                target_type: targetType,
                target_id: targetId,
                reason,
                description: description || null,
            })
            .select()
            .single();

        if (error) {
            console.error('提交举报失败:', error);
            return NextResponse.json({ error: '提交举报失败' }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('提交举报失败:', error);
        return NextResponse.json({ error: '提交举报失败' }, { status: 500 });
    }
}

export async function PUT(request: NextRequest) {
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

        const body = await request.json();
        const { reportId, status, notes } = body as {
            reportId: string;
            status: 'resolved' | 'dismissed';
            notes?: string;
        };

        if (!reportId || !status) {
            return NextResponse.json({ error: '缺少参数' }, { status: 400 });
        }

        // 使用 Service Role Client 更新举报
        const serviceClient = getServiceClient();

        const { error } = await serviceClient
            .from('community_reports')
            .update({
                status,
                reviewed_by: user.id,
                reviewed_at: new Date().toISOString(),
                review_notes: notes || null,
            })
            .eq('id', reportId);

        if (error) {
            console.error('处理举报失败:', error);
            return NextResponse.json({ error: '处理举报失败' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('处理举报失败:', error);
        return NextResponse.json({ error: '处理举报失败' }, { status: 500 });
    }
}
