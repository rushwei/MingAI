import { test } from 'node:test';
import assert from 'node:assert/strict';

test('withRetry resolves after retries', async () => {
    const { withRetry } = await import('../lib/retry');
    let attempts = 0;
    const result = await withRetry(async () => {
        attempts += 1;
        if (attempts < 3) {
            throw new Error('fail');
        }
        return 'ok';
    }, 3, 0);
    assert.equal(result, 'ok');
    assert.equal(attempts, 3);
});

test('withRetry rejects after retries', async () => {
    const { withRetry } = await import('../lib/retry');
    let attempts = 0;
    await assert.rejects(withRetry(async () => {
        attempts += 1;
        throw new Error('fail');
    }, 2, 0));
    assert.equal(attempts, 2);
});
