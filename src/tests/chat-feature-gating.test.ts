import test from 'node:test';
import assert from 'node:assert/strict';

import {
    buildChatMessageChartInfo,
    buildChatRequestChartIds,
    getVisibleSourcePanelState,
    sanitizeChatMentions,
    sanitizeSelectedCharts,
} from '../lib/chat/feature-normalization';

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

    assert.deepEqual(
        getVisibleSourcePanelState(
            {
                sources: [
                    {
                        type: 'knowledge_base',
                        id: 'kb-1',
                        name: '知识库',
                        preview: 'kb',
                        tokens: 10,
                        truncated: false,
                    },
                    {
                        type: 'mention',
                        sourceType: 'hepan_chart',
                        id: 'hepan-1',
                        name: '合盘',
                        preview: 'hepan',
                        tokens: 20,
                        truncated: false,
                    },
                ],
                kbSearchEnabled: true,
            },
            {
                knowledgeBaseEnabled: false,
                enabledDataSourceTypes: ['bazi_chart'],
            }
        ),
        {
            visibleSources: [],
            showKnowledgeBaseMiss: false,
        }
    );

    assert.deepEqual(
        getVisibleSourcePanelState(
            {
                sources: [
                    {
                        type: 'mention',
                        sourceType: 'bazi_chart',
                        id: 'bazi-1',
                        name: '八字命盘',
                        preview: 'bazi',
                        tokens: 16,
                        truncated: false,
                    },
                ],
                kbSearchEnabled: true,
            },
            {
                knowledgeBaseEnabled: false,
                enabledDataSourceTypes: ['bazi_chart'],
            }
        ),
        {
            visibleSources: [
                {
                    type: 'mention',
                    sourceType: 'bazi_chart',
                    id: 'bazi-1',
                    name: '八字命盘',
                    preview: 'bazi',
                    tokens: 16,
                    truncated: false,
                },
            ],
            showKnowledgeBaseMiss: false,
        }
    );
});
