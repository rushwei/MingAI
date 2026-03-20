/**
 * 管理员公告发布 API
 *
 * 管理员触发全站公告，批量发送站内通知
 *
 * POST /api/notifications/launch
 * Body: { featureKey: string, featureUrl: string }
 */

import { NextRequest } from 'next/server';
import { FEATURE_NAMES, fillTemplate, getNotificationTemplate } from '@/lib/notification';
import { getSystemAdminClient, jsonError, jsonOk, requireAdminContext } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
    try {
        const auth = await requireAdminContext(request);
        if ('error' in auth) {
            return jsonError(auth.error.message, auth.error.status);
        }

        const supabaseAdmin = getSystemAdminClient();

        const body = await request.json() as {
            featureKey?: string;
            featureUrl?: string;
            templateId?: string | null;
            templateVars?: Record<string, unknown> | null;
        };
        const { featureKey, featureUrl, templateId, templateVars } = body;

        if (!featureKey || !featureUrl) {
            return jsonError('缺少必要参数', 400);
        }

        const featureName = FEATURE_NAMES[featureKey] || featureKey;
        const template = typeof templateId === 'string' ? getNotificationTemplate(templateId) : undefined;
        const resolvedTemplateVars = Object.fromEntries(
            Object.entries(templateVars || {}).flatMap(([key, value]) => (
                typeof value === 'string' && value.trim().length > 0
                    ? [[key, value.trim()]]
                    : []
            )),
        );
        const messagePayload = template
            ? fillTemplate(template, {
                feature_name: featureName,
                ...resolvedTemplateVars,
            })
            : null;
        const notificationTitle = messagePayload?.title || `${featureName}功能已上线！`;
        const notificationContent = messagePayload?.content || `${featureName}功能现已正式上线，快来体验吧！`;
        const requestOrigin = request.nextUrl.origin;
        const normalizedFeatureUrl = featureUrl.trim();
        let siteLink = normalizedFeatureUrl;

        if (!/^https?:\/\//iu.test(normalizedFeatureUrl)) {
            try {
                const resolved = new URL(normalizedFeatureUrl, requestOrigin);
                siteLink = `${resolved.pathname}${resolved.search}${resolved.hash}`;
            } catch {
                siteLink = `/${normalizedFeatureUrl.replace(/^\/+/, '')}`;
            }
        }

        // 公告类站内通知默认面向全站用户，不依赖 feature_subscriptions
        const { data: users, error: usersError } = await supabaseAdmin
            .from('users')
            .select('id')
            .order('created_at', { ascending: false });

        if (usersError) {
            console.error('获取目标用户失败:', usersError);
            return jsonError('获取目标用户失败', 500);
        }

        const targetUsers = (users || [])
            .map((row) => row.id)
            .filter((id): id is string => typeof id === 'string' && id.length > 0);

        if (targetUsers.length === 0) {
            return jsonOk({
                success: true,
                message: '没有目标用户',
                stats: { total: 0, notifications: 0 }
            });
        }
        const siteTargets = targetUsers;

        let notificationsSent = 0;
        const errors: string[] = [];

        // 分批并发处理（每批最多 10 个，避免连接池耗尽）
        const BATCH_SIZE = 10;
        for (let i = 0; i < siteTargets.length; i += BATCH_SIZE) {
            const batch = siteTargets.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.allSettled(
                batch.map(async (userId) => {
                    const { error } = await supabaseAdmin
                        .from('notifications')
                        .insert({
                            user_id: userId,
                            type: 'feature_launch',
                            title: notificationTitle,
                            content: notificationContent,
                            link: siteLink,
                        });

                    if (error) {
                        throw new Error(`站内通知失败 (${userId}): ${error.message}`);
                    }
                })
            );

            for (const result of batchResults) {
                if (result.status === 'fulfilled') {
                    notificationsSent++;
                } else {
                    errors.push(String(result.reason));
                }
            }
        }

        return jsonOk({
            success: true,
            message: '站内公告发送完成',
            stats: {
                total: targetUsers.length,
                siteEligible: siteTargets.length,
                siteSkipped: targetUsers.length - siteTargets.length,
                notifications: notificationsSent,
                errors: errors.length > 0 ? errors : undefined,
            }
        });

    } catch (error) {
        console.error('发送站内公告失败:', error);
        return jsonError('服务器错误', 500);
    }
}
