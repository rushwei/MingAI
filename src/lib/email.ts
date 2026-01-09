/**
 * 邮件服务
 * 
 * 使用 Resend 发送邮件通知
 * 环境变量：RESEND_API_KEY, RESEND_FROM
 */

import { Resend } from 'resend';

// 延迟初始化 Resend 客户端
let resend: Resend | null = null;

function getResendClient(): Resend {
    if (!resend) {
        if (!process.env.RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY 环境变量未配置');
        }
        resend = new Resend(process.env.RESEND_API_KEY);
    }
    return resend;
}

const getFromEmail = () => process.env.RESEND_FROM || 'notifications@mingai.app';

export interface EmailResult {
    success: boolean;
    error?: string;
}

/**
 * 发送邮件
 */
export async function sendEmail(
    to: string,
    subject: string,
    html: string
): Promise<EmailResult> {
    try {
        const client = getResendClient();
        const { error } = await client.emails.send({
            from: getFromEmail(),
            to,
            subject,
            html,
        });

        if (error) {
            console.error('发送邮件失败:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        console.error('发送邮件异常:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '未知错误'
        };
    }
}

/**
 * 发送功能上线通知邮件
 */
export async function sendFeatureLaunchEmail(
    to: string,
    featureName: string,
    featureUrl: string
): Promise<EmailResult> {
    const subject = `🎉 ${featureName}功能已上线 - 命AI`;
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${featureName}功能已上线</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="padding: 40px 40px 20px; text-align: center;">
                            <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
                            <h1 style="margin: 0; font-size: 28px; color: #1a1a1a; font-weight: 700;">
                                ${featureName}功能已上线！
                            </h1>
                        </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                        <td style="padding: 20px 40px;">
                            <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                亲爱的用户，
                            </p>
                            <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                您订阅的 <strong style="color: #f59e0b;">${featureName}</strong> 功能现已正式上线！感谢您的耐心等待。
                            </p>
                            <p style="margin: 0 0 30px; font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                快来体验全新功能，探索命理的奥秘吧！
                            </p>
                        </td>
                    </tr>
                    
                    <!-- CTA Button -->
                    <tr>
                        <td style="padding: 0 40px 40px; text-align: center;">
                            <a href="${featureUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 12px; box-shadow: 0 4px 14px rgba(245, 158, 11, 0.4);">
                                立即体验
                            </a>
                        </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background-color: #f9fafb; border-radius: 0 0 16px 16px;">
                            <p style="margin: 0; font-size: 14px; color: #6b7280; text-align: center;">
                                此邮件由 命AI 自动发送<br>
                                如不想接收此类通知，请在个人设置中关闭
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;

    return sendEmail(to, subject, html);
}

/**
 * 发送系统通知邮件
 */
export async function sendSystemNotificationEmail(
    to: string,
    title: string,
    content: string
): Promise<EmailResult> {
    const subject = `${title} - 命AI`;
    const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
            <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 16px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                    <tr>
                        <td style="padding: 40px;">
                            <h1 style="margin: 0 0 20px; font-size: 24px; color: #1a1a1a; font-weight: 700;">
                                ${title}
                            </h1>
                            <div style="font-size: 16px; line-height: 1.6; color: #4a4a4a;">
                                ${content}
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 16px 16px;">
                            <p style="margin: 0; font-size: 14px; color: #6b7280; text-align: center;">
                                此邮件由 命AI 自动发送
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `;

    return sendEmail(to, subject, html);
}
