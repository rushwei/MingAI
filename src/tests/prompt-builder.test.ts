import { test } from 'node:test';
import assert from 'node:assert/strict';

test('buildPromptWithSources includes master rules and data rules', async () => {
    const pb = require('../lib/prompt-builder') as any;
    const res = await pb.buildPromptWithSources({
        modelId: 'deepseek-chat',
        userMessage: '测试问题',
        mentions: [],
        knowledgeHits: [],
        userSettings: { expressionStyle: 'direct', userProfile: {}, customInstructions: '' }
    });

    assert.ok(res.systemPrompt.includes('数据使用规则'));
    assert.ok(Array.isArray(res.sources));
    assert.ok(Array.isArray(res.diagnostics));
});

test('buildPromptWithSources tracks sources when injected', async () => {
    const pb = require('../lib/prompt-builder') as any;
    const res = await pb.buildPromptWithSources({
        modelId: 'deepseek-chat',
        userMessage: '测试问题',
        mentions: [{ type: 'ming_record', id: 'r1', name: '记录1', preview: 'p', resolvedContent: '内容'.repeat(200) }],
        knowledgeHits: [{ kbId: 'kb1', kbName: 'KB', content: '知识'.repeat(200), score: 0.8 }],
        userSettings: { expressionStyle: 'direct', userProfile: {}, customInstructions: '' }
    });

    assert.ok(res.sources.length >= 1);
});
