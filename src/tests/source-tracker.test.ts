import { test } from 'node:test';
import assert from 'node:assert/strict';

test('SourceTracker does not inject empty content', () => {
    const st = require('../lib/source-tracker') as any;
    const tracker = st.createSourceTracker();
    const r = tracker.trackAndInject({ type: 'mention', id: 'x', name: 'X', content: '   ' });
    assert.equal(r.injected, false);
    assert.deepEqual(tracker.getSources(), []);
});

test('SourceTracker truncates when maxTokens is set', () => {
    const st = require('../lib/source-tracker') as any;
    const tracker = st.createSourceTracker();
    const content = '内容'.repeat(500);
    const r = tracker.trackAndInject({ type: 'mention', id: 'm1', name: 'M1', content, maxTokens: 10 });
    assert.equal(r.injected, true);
    const sources = tracker.getSources();
    assert.equal(sources.length, 1);
    assert.equal(sources[0].truncated, true);
    assert.ok(r.content.includes('内容已截断'));
});

test('SourceTracker de-duplicates sources by type and id', () => {
    const st = require('../lib/source-tracker') as any;
    const tracker = st.createSourceTracker();
    tracker.trackAndInject({ type: 'knowledge_base', id: 'kb1', name: 'KB', content: '第一次' });
    tracker.trackAndInject({ type: 'knowledge_base', id: 'kb1', name: 'KB', content: '第二次更新' });
    const sources = tracker.getSources();
    assert.equal(sources.length, 1);
    assert.ok(sources[0].preview.includes('第二次更新'));
});

