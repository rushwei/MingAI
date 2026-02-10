import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    HEXAGRAM_GUA_CI_FALLBACK,
    HEXAGRAM_XIANG_CI_FALLBACK,
    HEXAGRAM_YAO_CI_FALLBACK,
} from '../lib/hexagram-texts-fallback';
import { GUA_CI, XIANG_CI, YAO_CI } from '../../packages/mcp-core/src/hexagram-texts';

test('web hexagram fallback stays in sync with mcp constants', () => {
    assert.deepEqual(HEXAGRAM_GUA_CI_FALLBACK, GUA_CI);
    assert.deepEqual(HEXAGRAM_XIANG_CI_FALLBACK, XIANG_CI);
    assert.deepEqual(HEXAGRAM_YAO_CI_FALLBACK, YAO_CI);
});
