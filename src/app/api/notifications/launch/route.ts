/**
 * 功能上线通知 API
 * 
 * 管理员触发功能上线，批量发送邮件和站内通知
 * 
 * POST /api/notifications/launch
 * Body: { featureKey: string, featureUrl: string, adminSecret: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendFeatureLaunchEmail } from '@/lib/email';
import { FEATURE_NAMES } from '@/lib/notification';
import { getServiceClient } from '@/lib/supabase-server';

// 使用 service role 绕过 RLS
const supabaseAdmin = getServiceClient();
const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const getAccessToken = (request: NextRequest) => {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.replace('Bearer ', '');
    }
    return request.cookies.get('sb-access-token')?.value ?? null;
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { featureKey, featureUrl, adminSecret } = body;

        const hasAdminSecret = !!adminSecret && adminSecret === process.env.ADMIN_SECRET;
        let isAdminUser = false;

        if (!hasAdminSecret) {
            const token = getAccessToken(request);
            if (token) {
                const { data: { user }, error: authError } = await authClient.auth.getUser(token);
                if (authError) {
                    console.error('管理员验证失败:', authError);
                } else if (user?.id) {
                    const { data: profile, error: profileError } = await supabaseAdmin
                        .from('users')
                        .select('is_admin')
                        .eq('id', user.id)
                        .maybeSingle();

                    if (profileError) {
                        console.error('管理员标记读取失败:', profileError);
                    }

                    isAdminUser = !!profile?.is_admin;
                }
            }
        }

        // 验证管理员密钥或管理员账号
        if (!hasAdminSecret && !isAdminUser) {
            return NextResponse.json(
                { error: '未授权' },
                { status: 401 }
            );
        }

        if (!featureKey || !featureUrl) {
            return NextResponse.json(
                { error: '缺少必要参数' },
                { status: 400 }
            );
        }

        const featureName = FEATURE_NAMES[featureKey] || featureKey;
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
            return NextResponse.json(
                { error: '获取订阅者失败' },
                { status: 500 }
            );
        }

        if (!subscribers || subscribers.length === 0) {
            return NextResponse.json({
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

        const emailResults = await Promise.all(
            Array.from(emailTargets).map(async (userId) => {
                const { data, error } = await supabaseAdmin.auth.admin.getUserById(userId);
                if (error) {
                    console.error('获取用户邮箱失败:', error);
                    return { userId, email: null };
                }
                return { userId, email: data?.user?.email ?? null };
            })
        );

        const userEmailMap = new Map(
            emailResults
                .filter(result => !!result.email)
                .map(result => [result.userId, result.email as string])
        );
        const missingEmailCount = Array.from(emailTargets)
            .filter(userId => !userEmailMap.has(userId)).length;

        let emailsSent = 0;
        let notificationsSent = 0;
        const errors: string[] = [];
        if (emailEligible > 0 && missingEmailCount > 0) {
            errors.push(`缺少邮箱的订阅用户数: ${missingEmailCount}`);
        }

        // 批量处理
        for (const subscriber of subscribers) {
            const settings = settingsMap.get(subscriber.user_id);
            const notificationsEnabled = settings?.notifications_enabled ?? true;
            const allowEmail = notificationsEnabled && (settings?.notify_email ?? true);
            const allowSite = notificationsEnabled && (settings?.notify_site ?? true);

            // 发送站内通知
            if (subscriber.notify_site && allowSite) {
                const { error } = await supabaseAdmin
                    .from('notifications')
                    .insert({
                        user_id: subscriber.user_id,
                        type: 'feature_launch',
                        title: `${featureName}功能已上线！`,
                        content: `您订阅的${featureName}功能现已正式上线，快来体验吧！`,
                        link: siteLink,
                    });

                if (error) {
                    errors.push(`站内通知失败 (${subscriber.user_id}): ${error.message}`);
                } else {
                    notificationsSent++;
                }
            }

            // 发送邮件通知
            if (subscriber.notify_email && allowEmail) {
                const email = userEmailMap.get(subscriber.user_id);
                if (email) {
                    const result = await sendFeatureLaunchEmail(email, featureName, emailUrl);
                    if (result.success) {
                        emailsSent++;
                    } else {
                        errors.push(`邮件发送失败 (${email}): ${result.error}`);
                    }
                }
            }
        }

        // 删除已通知的订阅（可选，保留历史记录）
        // await supabaseAdmin
        //     .from('feature_subscriptions')
        //     .delete()
        //     .eq('feature_key', featureKey);

        return NextResponse.json({
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
        return NextResponse.json(
            { error: '服务器错误' },
            { status: 500 }
        );
    }
}
