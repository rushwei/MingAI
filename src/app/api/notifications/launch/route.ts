/**
 * 功能上线通知 API
 *
 * 管理员触发功能上线，批量发送邮件和站内通知
 *
 * POST /api/notifications/launch
 * Body: { featureKey: string, featureUrl: string }
 */

import { NextRequest } from 'next/server';
import { sendFeatureLaunchEmail } from '@/lib/email';
import { FEATURE_NAMES, fillTemplate, getNotificationTemplate } from '@/lib/notification';
import { getSystemAdminClient, jsonError, jsonOk, requireAdminContext } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
    try {
        const auth = await requireAdminContext(request);
        if ('error' in auth) {
            return jsonError(auth.error.message, auth.error.status);
        }

        // 延迟初始化 service client，避免构建期缺失环境变量导致失败
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
        let emailUrl = featureUrl;
        let siteLink = featureUrl;

        try {
            const resolved = new URL(featureUrl, requestOrigin);
            emailUrl = resolved.toString();
            siteLink = `${resolved.pathname}${resolved.search}${resolved.hash}`;
        } catch {
            emailUrl = `${requestOrigin}/${featureUrl.replace(/^\/+/, '')}`;
            siteLink = `/${featureUrl.replace(/^\/+/, '')}`;
        }

        // 获取所有订阅者
        const { data: subscribers, error: subError } = await supabaseAdmin
            .from('feature_subscriptions')
            .select(`
                user_id,
                notify_email,
                notify_site
            `)
            .eq('feature_key', featureKey);

        if (subError) {
            console.error('获取订阅者失败:', subError);
            return jsonError('获取订阅者失败', 500);
        }

        if (!subscribers || subscribers.length === 0) {
            return jsonOk({
                success: true,
                message: '没有订阅者',
                stats: { total: 0, emails: 0, notifications: 0 }
            });
        }

        const userIds = subscribers.map(s => s.user_id);

        const { data: settingsRows, error: settingsError } = await supabaseAdmin
            .from('user_settings')
            .select('user_id, notifications_enabled, notify_email, notify_site')
            .in('user_id', userIds);

        if (settingsError) {
            console.error('获取通知偏好失败:', settingsError);
        }

        const settingsMap = new Map(
            (settingsRows || []).map(row => [row.user_id, row])
        );

        const emailTargets = new Set<string>();
        let emailEligible = 0;
        let siteEligible = 0;
        let emailSkipped = 0;
        let siteSkipped = 0;
        for (const subscriber of subscribers) {
            const settings = settingsMap.get(subscriber.user_id);
            const notificationsEnabled = settings?.notifications_enabled ?? true;
            const allowEmail = notificationsEnabled && (settings?.notify_email ?? true);
            const allowSite = notificationsEnabled && (settings?.notify_site ?? true);

            if (subscriber.notify_email && allowEmail) {
                emailTargets.add(subscriber.user_id);
                emailEligible += 1;
            } else if (subscriber.notify_email) {
                emailSkipped += 1;
            }

            if (subscriber.notify_site && allowSite) {
                siteEligible += 1;
            } else if (subscriber.notify_site) {
                siteSkipped += 1;
            }
        }

        const { data: emailRows, error: emailError } = await supabaseAdmin.rpc('admin_get_auth_user_emails', {
            p_user_ids: Array.from(emailTargets),
        });
        if (emailError) {
            console.error('获取用户邮箱失败:', emailError);
        }

        const userEmailMap = new Map(
            ((emailRows as Array<{ user_id: string; email: string | null }> | null) || [])
                .filter(row => !!row.email)
                .map(row => [row.user_id, row.email as string])
        );
        const missingEmailCount = Array.from(emailTargets)
            .filter(userId => !userEmailMap.has(userId)).length;

        let emailsSent = 0;
        let notificationsSent = 0;
        const errors: string[] = [];
        if (emailEligible > 0 && missingEmailCount > 0) {
            errors.push(`缺少邮箱的订阅用户数: ${missingEmailCount}`);
        }

        // 批量并发处理
        const results = await Promise.allSettled(
            subscribers.map(async (subscriber) => {
                const settings = settingsMap.get(subscriber.user_id);
                const notificationsEnabled = settings?.notifications_enabled ?? true;
                const allowEmail = notificationsEnabled && (settings?.notify_email ?? true);
                const allowSite = notificationsEnabled && (settings?.notify_site ?? true);

                let sentEmail = false;
                let sentSite = false;
                const subErrors: string[] = [];

                // 发送站内通知
                if (subscriber.notify_site && allowSite) {
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
                        subErrors.push(`站内通知失败 (${subscriber.user_id}): ${error.message}`);
                    } else {
                        sentSite = true;
                    }
                }

                // 发送邮件通知
                if (subscriber.notify_email && allowEmail) {
                    const email = userEmailMap.get(subscriber.user_id);
                    if (email) {
                        const result = await sendFeatureLaunchEmail(email, featureName, emailUrl, {
                            title: notificationTitle,
                            content: notificationContent,
                            ctaLabel: '查看详情',
                        });
                        if (result.success) {
                            sentEmail = true;
                        } else {
                            subErrors.push(`邮件发送失败 (${email}): ${result.error}`);
                        }
                    }
                }

                return { sentEmail, sentSite, errors: subErrors };
            })
        );

        for (const result of results) {
            if (result.status === 'fulfilled') {
                if (result.value.sentEmail) emailsSent++;
                if (result.value.sentSite) notificationsSent++;
                errors.push(...result.value.errors);
            } else {
                errors.push(`处理失败: ${result.reason}`);
            }
        }

        // 删除已通知的订阅（可选，保留历史记录）
        // await supabaseAdmin
        //     .from('feature_subscriptions')
        //     .delete()
        //     .eq('feature_key', featureKey);

        return jsonOk({
            success: true,
            message: `功能上线通知发送完成`,
            stats: {
                total: subscribers.length,
                emailEligible,
                siteEligible,
                emailSkipped,
                siteSkipped,
                missingEmailCount,
                emails: emailsSent,
                notifications: notificationsSent,
                errors: errors.length > 0 ? errors : undefined,
            }
        });

    } catch (error) {
        console.error('发送功能上线通知失败:', error);
        return jsonError('服务器错误', 500);
    }
}
