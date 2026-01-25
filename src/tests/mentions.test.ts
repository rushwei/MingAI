import { test } from 'node:test';
import assert from 'node:assert/strict';

test('parseMentions extracts @{} tokens and stripMentionTokens removes them', () => {
    const mentions = require('../lib/mentions') as any;
    const content = '请看 @{'+JSON.stringify({ type: 'knowledge_base', id: 'kb1', name: '我的知识库', preview: 'p' })+'} 的内容，然后回答我。';
    const parsed = mentions.parseMentions(content);
    assert.equal(parsed.length, 1);
    assert.equal(parsed[0].type, 'knowledge_base');
    assert.equal(parsed[0].id, 'kb1');
    const stripped = mentions.stripMentionTokens(content);
    assert.ok(!stripped.includes('@{'));
});
