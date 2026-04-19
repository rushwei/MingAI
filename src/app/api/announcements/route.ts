import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSystemAdminClient, jsonError, jsonOk } from '@/lib/api-utils';
import { getSupabaseUrl, getSupabaseAnonKey } from '@/lib/supabase-env';
import { serializeAnnouncement, type AnnouncementRow } from '@/lib/announcement';

/** 获取匿名客户端用于公共读取 */
function getAnonClient() {
  return createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export async function GET(request: NextRequest) {
    let supabase = getSystemAdminClient();
    let useFallback = false;
    
    // 尝试系统管理员客户端，如果失败则使用匿名客户端
    const { error: testError } = await supabase
        .from('announcements')
        .select('id', { count: 'exact', head: true })
        .limit(1);
    
    if (testError) {
        supabase = getAnonClient();
        useFallback = true;
    }
    
    const countOnly = request.nextUrl.searchParams.get('count') === '1';
    const latestOnly = request.nextUrl.searchParams.get('latest') === '1';
    const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') || 20), 1), 100);
    const offset = Math.max(Number(request.nextUrl.searchParams.get('offset') || 0), 0);

    if (countOnly) {
        const { count, error } = await supabase
            .from('announcements')
            .select('id', { count: 'exact', head: true });

        if (error && !useFallback) {
            console.error('[announcements][GET][count] query failed:', error);
            return jsonError('获取公告失败', 500);
        }
        if (error) {
            // 回退模式：返回默认计数
            return jsonOk({ count: 0 });
        }

        return jsonOk({ count: count ?? 0 });
    }

    const query = supabase
        .from('announcements')
        .select('*')
        .order('published_at', { ascending: false });

    if (latestOnly) {
        const { data, error } = await query.limit(1).maybeSingle();
        if (error && !useFallback) {
            console.error('[announcements][GET][latest] query failed:', error);
            return jsonError('获取公告失败', 500);
        }
        // 回退模式：返回 null 而不是错误
        return jsonOk({
            announcement: useFallback ? null : (data ? serializeAnnouncement(data as AnnouncementRow) : null),
        });
    }

    const { data, error } = await query.range(offset, offset + limit);
    if (error && !useFallback) {
        console.error('[announcements][GET][list] query failed:', error);
        return jsonError('获取公告失败', 500);
    }
    
    // 回退模式：返回空数组
    if (error) {
        return jsonOk({
            announcements: [],
            pagination: {
                hasMore: false,
                nextOffset: null,
            },
        });
    }

    const rows = (data || []) as AnnouncementRow[];
    const announcements = rows.slice(0, limit).map((row) => serializeAnnouncement(row));
    const hasMore = rows.length > limit;

    return jsonOk({
        announcements,
        pagination: {
            hasMore,
            nextOffset: hasMore ? offset + announcements.length : null,
        },
    });
}
