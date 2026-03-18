/**
 * AI 设置页面重定向
 *
 * 'use client' 标记说明：
 * - 重导出的目标组件是客户端组件
 */
'use client';

import AiSettingsPage from '@/app/user/ai-settings/page';

export default function AiSettingsRedirect() {
    return <AiSettingsPage />;
}
