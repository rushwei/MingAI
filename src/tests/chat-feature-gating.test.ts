import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
    buildChatMessageChartInfo,
    buildChatRequestChartIds,
    sanitizeChatMentions,
    sanitizeSelectedCharts,
} from '../lib/chat/feature-normalization';

const composerToolbarPath = resolve(process.cwd(), 'src/components/chat/composer/ComposerToolbar.tsx');
const chatMessagingPath = resolve(process.cwd(), 'src/lib/chat/use-chat-messaging.ts');
const chatStatePath = resolve(process.cwd(), 'src/lib/chat/use-chat-state.ts');
const chatPagePath = resolve(process.cwd(), 'src/app/chat/page.tsx');
const ordersPagePath = resolve(process.cwd(), 'src/app/user/orders/page.tsx');
const dailyPagePath = resolve(process.cwd(), 'src/app/daily/page.tsx');
const monthlyPagePath = resolve(process.cwd(), 'src/app/monthly/page.tsx');
const sourceBadgePath = resolve(process.cwd(), 'src/components/chat/SourceBadge.tsx');

test('chat feature normalization should drop disabled mentions and chart payloads', () => {
    const mentions = sanitizeChatMentions(
        [
            { type: 'knowledge_base', id: 'kb-1', name: '知识库', preview: 'kb' },
            { type: 'ming_record', id: 'record-1', name: '记录', preview: 'record' },
            { type: 'bazi_chart', id: 'chart-1', name: '八字', preview: 'bazi' },
        ],
        {
            knowledgeBaseEnabled: false,
            enabledDataSourceTypes: ['ming_record'],
        }
    );

    assert.deepEqual(mentions, [
        { type: 'ming_record', id: 'record-1', name: '记录', preview: 'record' },
    ]);

    const selectedCharts = sanitizeSelectedCharts(
        {
            bazi: { id: 'bazi-1', name: '甲子', info: '八字' },
            ziwei: { id: 'ziwei-1', name: '紫微', info: '紫微' },
        },
        {
            baziEnabled: false,
            ziweiEnabled: true,
        }
    );

    assert.deepEqual(selectedCharts, {
        ziwei: { id: 'ziwei-1', name: '紫微', info: '紫微' },
    });

    assert.equal(
        buildChatRequestChartIds(
            {
                bazi: { id: 'bazi-1', name: '甲子', info: '八字', analysisMode: 'mangpai' },
                ziwei: { id: 'ziwei-1', name: '紫微', info: '紫微' },
            },
            {
                baziEnabled: false,
                ziweiEnabled: true,
            }
        )?.baziId,
        undefined
    );

    assert.deepEqual(
        buildChatRequestChartIds(
            {
                bazi: { id: 'bazi-1', name: '甲子', info: '八字', analysisMode: 'mangpai' },
                ziwei: { id: 'ziwei-1', name: '紫微', info: '紫微' },
            },
            {
                baziEnabled: true,
                ziweiEnabled: false,
            }
        ),
        {
            baziId: 'bazi-1',
            baziAnalysisMode: 'mangpai',
        }
    );

    assert.deepEqual(
        buildChatMessageChartInfo(
            {
                bazi: { id: 'bazi-1', name: '甲子', info: '八字' },
                ziwei: { id: 'ziwei-1', name: '紫微', info: '紫微' },
            },
            {
                baziEnabled: false,
                ziweiEnabled: true,
            }
        ),
        {
            ziweiName: '紫微',
        }
    );
});

test('chat UI and request flow should guard disabled mention entry points and stale feature payloads', async () => {
    const [composerToolbarSource, chatMessagingSource, chatStateSource, chatPageSource, sourceBadgeSource] = await Promise.all([
        readFile(composerToolbarPath, 'utf-8'),
        readFile(chatMessagingPath, 'utf-8'),
        readFile(chatStatePath, 'utf-8'),
        readFile(chatPagePath, 'utf-8'),
        readFile(sourceBadgePath, 'utf-8'),
    ]);

    assert.match(composerToolbarSource, /canMentionAnything/u);
    assert.match(composerToolbarSource, /canMentionAnything &&/u);

    assert.match(chatMessagingSource, /sanitizeChatMentions/u);
    assert.match(chatMessagingSource, /buildChatRequestChartIds/u);
    assert.match(chatMessagingSource, /buildChatMessageChartInfo/u);

    assert.match(chatStateSource, /sanitizeSelectedCharts/u);
    assert.match(sourceBadgeSource, /getDataSourceFeatureId/u);
    assert.match(sourceBadgeSource, /isFeatureEnabled\(getDataSourceFeatureId\(type\)\)/u);

    assert.match(chatPageSource, /const aiPersonalizationEnabled = isFeatureEnabled\('ai-personalization'\)/u);
    assert.match(chatPageSource, /\[aiPersonalizationEnabled,[^\]]*knowledgeBaseEnabled/u);
});

test('feature-gated pages should avoid mounting inner fetch logic when dependent modules are disabled', async () => {
    const [ordersSource, dailySource, monthlySource] = await Promise.all([
        readFile(ordersPagePath, 'utf-8'),
        readFile(dailyPagePath, 'utf-8'),
        readFile(monthlyPagePath, 'utf-8'),
    ]);

    assert.match(ordersSource, /function OrdersPageContent/u);
    assert.match(ordersSource, /<FeatureGate featureId="orders">/u);

    assert.match(dailySource, /const baziFeatureEnabled = !featureToggleLoading && isFeatureEnabled\('bazi'\)/u);
    assert.match(dailySource, /baziFeatureEnabled && userId/u);
    assert.match(dailySource, /onChartSelect=\{baziFeatureEnabled \? \(\) => setShowChartSelector\(true\) : undefined\}/u);

    assert.match(monthlySource, /const baziFeatureEnabled = !featureToggleLoading && isFeatureEnabled\('bazi'\)/u);
    assert.match(monthlySource, /!isPersonalized && baziFeatureEnabled/u);
    assert.match(monthlySource, /baziFeatureEnabled && userId/u);
});
