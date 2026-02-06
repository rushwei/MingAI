import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isNearBottom } from '../lib/chat-scroll';

test('isNearBottom returns true when viewport is already at bottom', () => {
    assert.equal(
        isNearBottom({ scrollHeight: 1000, scrollTop: 700, clientHeight: 300 }),
        true
    );
});

test('isNearBottom returns true when distance is within threshold', () => {
    assert.equal(
        isNearBottom({ scrollHeight: 1000, scrollTop: 620, clientHeight: 300 }, 100),
        true
    );
});

test('isNearBottom returns false when distance exceeds threshold', () => {
    assert.equal(
        isNearBottom({ scrollHeight: 1000, scrollTop: 500, clientHeight: 300 }, 80),
        false
    );
});
