/**
 * 举报 API 路由
 * GET: 管理员获取举报列表
 * POST: 提交举报
 * PUT: 管理员处理举报
 */

import { NextRequest } from 'next/server';
import { TargetType, ReportReason, ReportStatus } from '@/lib/community';
import { jsonError, jsonOk, requireAdminContext, requireUserContext, getServiceRoleClient } from '@/lib/api-utils';
import { createNotification } from '@/lib/notification-server';
import { parsePagination } from '@/lib/pagination';
import { missingFields } from '@/lib/validation';

export async function GET(request: NextRequest) {
    try {
        const auth = await requireAdminContext(request);
        if ('error' in auth) {
            return jsonError(auth.error.message, auth.error.status);
        }

        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status') as ReportStatus | null;
        const { from, to } = parsePagination(searchParams, { defaultPageSize: 20 });

        // 使用 Service Role Client 获取所有举报
        const serviceClient = getServiceRoleClient();

        let query = serviceClient
            .from('community_reports')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false });

        if (status) {
            query = query.eq('status', status);
        }

        query = query.range(from, to);

        const { data, error, count } = await query;

        if (error) {
            console.error('获取举报列表失败:', error);
            return jsonError('获取举报列表失败', 500);
        }

        return jsonOk({
            reports: data,
            total: count || 0,
        });
    } catch (error) {
        console.error('获取举报列表失败:', error);
        return jsonError('获取举报列表失败', 500);
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await requireUserContext(request);
        if ('error' in auth) {
            return jsonError(auth.error.message, auth.error.status);
        }
        const { supabase, user } = auth;

        const body = await request.json();
        const { targetType, targetId, reason, description } = body as {
            targetType: TargetType;
            targetId: string;
            reason: ReportReason;
            description?: string;
        };

        if (missingFields(body, ['targetType', 'targetId', 'reason']).length > 0) {
            return jsonError('缺少参数', 400);
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
            return jsonError('提交举报失败', 500);
        }

        // 通知所有管理员用户（站内通知）
        try {
            const serviceClient = getServiceRoleClient();
            const { data: admins, error: adminError } = await serviceClient
                .from('users')
                .select('id, is_admin')
                .eq('is_admin', true);
            if (adminError) {
                console.error('获取管理员失败:', adminError);
                return jsonOk(data);
            }

            const adminIds = (admins || []).map((admin: { id: string }) => admin.id);
            const settingsMap = new Map<string, { notifications_enabled?: boolean; notify_site?: boolean }>();
            if (adminIds.length > 0) {
                const { data: settingsRows, error: settingsError } = await serviceClient
                    .from('user_settings')
                    .select('user_id, notifications_enabled, notify_site')
                    .in('user_id', adminIds);

                if (settingsError) {
                    console.error('获取管理员通知偏好失败:', settingsError);
                } else {
                    (settingsRows || []).forEach((row: { user_id: string; notifications_enabled?: boolean; notify_site?: boolean }) => {
                        settingsMap.set(row.user_id, {
                            notifications_enabled: row.notifications_enabled,
                            notify_site: row.notify_site,
                        });
                    });
                }
            }
            let link = `/community/${targetId}`;
            if (targetType === 'comment') {
                const { data: commentInfo } = await serviceClient
                    .from('community_comments')
                    .select('post_id')
                    .eq('id', targetId)
                    .maybeSingle();
                if (commentInfo?.post_id) {
                    link = `/community/${commentInfo.post_id}`;
                }
            }
            const title = '有新的社区举报';
            const content = `目标类型：${targetType}，原因：${reason}${description ? `，描述：${description}` : ''}`;
            for (const admin of admins || []) {
                const settings = settingsMap.get(admin.id);
                const notificationsEnabled = settings?.notifications_enabled ?? true;
                const notifySite = settings?.notify_site ?? true;
                if (!notificationsEnabled || !notifySite) continue;
                await createNotification(admin.id, 'system', title, content, link);
            }
        } catch (notifyErr) {
            console.error('发送管理员通知失败:', notifyErr);
        }

        return jsonOk(data);
    } catch (error) {
        console.error('提交举报失败:', error);
        return jsonError('提交举报失败', 500);
    }
}

export async function PUT(request: NextRequest) {
    try {
        const auth = await requireAdminContext(request);
        if ('error' in auth) {
            return jsonError(auth.error.message, auth.error.status);
        }
        const { user } = auth;

        const body = await request.json();
        const { reportId, status, notes } = body as {
            reportId: string;
            status: 'resolved' | 'dismissed';
            notes?: string;
        };

        if (missingFields(body, ['reportId', 'status']).length > 0) {
            return jsonError('缺少参数', 400);
        }

        // 使用 Service Role Client 更新举报
        const serviceClient = getServiceRoleClient();

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
            return jsonError('处理举报失败', 500);
        }

        return jsonOk({ success: true });
    } catch (error) {
        console.error('处理举报失败:', error);
        return jsonError('处理举报失败', 500);
    }
}
