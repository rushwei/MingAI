/**
 * 记录列表 API 路由
 * GET: 获取记录列表
 * POST: 创建新记录
 */

import { NextRequest } from 'next/server';
import { RecordCategory, RecordFilters } from '@/lib/records';
import { getAuthContext, jsonError, jsonOk } from '@/lib/api-utils';

function quotePostgrestString(value: string): string {
    const sanitized = value
        .replace(/\u0000/g, '')
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"');
    return `"${sanitized}"`;
}

export async function GET(request: NextRequest) {
    try {
        const { supabase, user } = await getAuthContext(request);
        if (!user) return jsonError('请先登录', 401);

        const { searchParams } = new URL(request.url);
        const rawPage = searchParams.get('page');
        const rawPageSize = searchParams.get('pageSize');

        const page = rawPage == null ? 1 : Number(rawPage);
        if (!Number.isInteger(page) || page < 1) {
            return jsonError('page 参数无效', 400);
        }

        const pageSize = rawPageSize == null ? 20 : Number(rawPageSize);
        if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) {
            return jsonError('pageSize 参数无效', 400);
        }

        const category = searchParams.get('category') as RecordCategory | null;
        const search = searchParams.get('search');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const isPinned = searchParams.get('isPinned');
        const tags = searchParams.getAll('tag');

        const filters: RecordFilters = {};
        if (category) filters.category = category;
        if (search) filters.search = search;
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;
        if (isPinned === 'true') filters.isPinned = true;
        if (isPinned === 'false') filters.isPinned = false;
        if (tags.length > 0) filters.tags = tags;

        // 构建查询
        let query = supabase
            .from('ming_records_with_archive_status')
            .select('*', { count: 'exact' })
            .eq('user_id', user.id)
            .order('is_pinned', { ascending: false })
            .order('created_at', { ascending: false });

        // 应用筛选条件
        if (filters.category) {
            query = query.eq('category', filters.category);
        }
        if (filters.isPinned !== undefined) {
            query = query.eq('is_pinned', filters.isPinned);
        }
        if (filters.startDate) {
            query = query.gte('event_date', filters.startDate);
        }
        if (filters.endDate) {
            query = query.lte('event_date', filters.endDate);
        }
        if (filters.tags && filters.tags.length > 0) {
            query = query.overlaps('tags', filters.tags);
        }
        if (filters.search) {
            const pattern = quotePostgrestString(`%${filters.search}%`);
            query = query.or(`title.ilike.${pattern},content.ilike.${pattern}`);
        }

        // 分页
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;

        if (error) {
            console.error('获取记录失败:', error);
            return jsonError('获取记录失败', 500);
        }

        return jsonOk({
            records: data,
            total: count || 0,
        });
    } catch (error) {
        console.error('获取记录失败:', error);
        return jsonError('获取记录失败', 500);
    }
}

export async function POST(request: NextRequest) {
    try {
        const { supabase, user } = await getAuthContext(request);
        if (!user) return jsonError('请先登录', 401);

        const body = await request.json();

        if (!body.title) {
            return jsonError('标题不能为空', 400);
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
            return jsonError('创建记录失败', 500);
        }

        return jsonOk(data as Record<string, unknown>);
    } catch (error) {
        console.error('创建记录失败:', error);
        return jsonError('创建记录失败', 500);
    }
}
