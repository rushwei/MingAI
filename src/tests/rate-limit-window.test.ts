import test from 'node:test';
import assert from 'node:assert/strict';

// Uses exported helper to avoid hitting Supabase in tests.
const rateLimit = require('../lib/rate-limit') as { resolveRateLimitResetAt?: (rows: Array<{ window_start: string }>, windowMs: number) => Date };

test('resolveRateLimitResetAt uses earliest window start', () => {
    assert.equal(typeof rateLimit.resolveRateLimitResetAt, 'function');
    const windowMs = 60_000;
    const rows = [
        { window_start: '2026-01-28T11:59:30.000Z' },
        { window_start: '2026-01-28T11:59:50.000Z' },
    ];
    const resetAt = rateLimit.resolveRateLimitResetAt!(rows, windowMs);
    assert.equal(resetAt.toISOString(), '2026-01-28T12:00:30.000Z');
});
