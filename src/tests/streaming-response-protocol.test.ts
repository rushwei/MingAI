import test from 'node:test';
import assert from 'node:assert/strict';

import { parseStreamingSSEData } from '@/lib/hooks/useStreamingResponse';

test('streaming response parser should extract terminal error frames', () => {
    const parsed = parseStreamingSSEData('{"error":"保存结果失败，请稍后重试"}');

    assert.equal(parsed.error, '保存结果失败，请稍后重试');
    assert.equal(parsed.contentDelta, undefined);
    assert.equal(parsed.reasoningDelta, undefined);
    assert.equal(parsed.done, false);
});
