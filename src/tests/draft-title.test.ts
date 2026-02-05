import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildDraftTitle } from '../lib/draft-title';

test('buildDraftTitle collapses whitespace and truncates to 15 chars', () => {
    assert.equal(buildDraftTitle('  你好   世界\n\n今天怎么样  '), '你好 世界 今天怎么样');
    assert.equal(buildDraftTitle('12345678901234567890'), '123456789012345');
});

test('buildDraftTitle falls back to 新对话 when empty', () => {
    assert.equal(buildDraftTitle('   \n\t  '), '新对话');
});
