/**
 * 功能上线通知 API
 *
 * 管理员触发功能上线，批量发送站内通知
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
        const notificationContent = messagePayload?.content || `您订阅的${featureName}功能现已正式上线，快来体验吧！`;
        const requestOrigin = request.nextUrl.origin;
        let siteLink = featureUrl;

        try {
            const resolved = new URL(featureUrl, requestOrigin);
            siteLink = `${resolved.pathname}${resolved.search}${resolved.hash}`;
        } catch {
            siteLink = `/${featureUrl.replace(/^\/+/, '')}`;
        }

        // 获取所有订阅者
        const { data: subscribers, error: subError } = await supabaseAdmin
            .from('feature_subscriptions')
            .select('user_id, notify_site')
            .eq('feature_key', featureKey);

        if (subError) {
            console.error('获取订阅者失败:', subError);
            return jsonError('获取订阅者失败', 500);
        }

        if (!subscribers || subscribers.length === 0) {
            return jsonOk({
                success: true,
                message: '没有订阅者',
                stats: { total: 0, notifications: 0 }
            });
        }

        const userIds = subscribers.map(s => s.user_id);

        const { data: settingsRows, error: settingsError } = await supabaseAdmin
            .from('user_settings')
            .select('user_id, notifications_enabled, notify_site')
            .in('user_id', userIds);

        if (settingsError) {
            console.error('获取通知偏好失败:', settingsError);
        }

        const settingsMap = new Map(
            (settingsRows || []).map(row => [row.user_id, row])
        );

        // 筛选站内通知目标
        const siteTargets = subscribers.filter(subscriber => {
            const settings = settingsMap.get(subscriber.user_id);
            const notificationsEnabled = settings?.notifications_enabled ?? true;
            const allowSite = notificationsEnabled && (settings?.notify_site ?? true);
            return subscriber.notify_site && allowSite;
        });

        let notificationsSent = 0;
        const errors: string[] = [];

        // 分批并发处理（每批最多 10 个，避免连接池耗尽）
        const BATCH_SIZE = 10;
        for (let i = 0; i < siteTargets.length; i += BATCH_SIZE) {
            const batch = siteTargets.slice(i, i + BATCH_SIZE);
            const batchResults = await Promise.allSettled(
                batch.map(async (subscriber) => {
                    const { error } = await supabaseAdmin
                        .from('notifications')
                        .insert({
                            user_id: subscriber.user_id,
                            type: 'feature_launch',
                            title: notificationTitle,
                            content: notificationContent,
                            link: siteLink,
                        });

                    if (error) {
                        throw new Error(`站内通知失败 (${subscriber.user_id}): ${error.message}`);
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
            message: '功能上线通知发送完成',
            stats: {
                total: subscribers.length,
                siteEligible: siteTargets.length,
                siteSkipped: subscribers.length - siteTargets.length,
                notifications: notificationsSent,
                errors: errors.length > 0 ? errors : undefined,
            }
        });

    } catch (error) {
        console.error('发送功能上线通知失败:', error);
        return jsonError('服务器错误', 500);
    }
}
