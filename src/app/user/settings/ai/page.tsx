/**
 * AI 设置页面重定向
 *
 * 'use client' 标记说明：
 * - 重导出的目标组件是客户端组件
 * - 使用 FeatureGate 门控
 */
'use client';

import AiSettingsPage from '@/app/user/ai-settings/page';
import { FeatureGate } from '@/components/layout/FeatureGate';

export default function AiSettingsRedirect() {
    return (
        <FeatureGate featureId="ai-personalization">
            <AiSettingsPage />
        </FeatureGate>
    );
}

