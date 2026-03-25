import test from 'node:test';
import assert from 'node:assert/strict';

import {
    getVisibleSourcePanelState,
} from '../lib/chat/feature-normalization';
import { filterMentionsByFeature } from '../lib/data-sources/catalog';

test('chat feature normalization should drop disabled mentions', () => {
    const mentions = filterMentionsByFeature(
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
});

test('getVisibleSourcePanelState should filter by enabled types', () => {
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
