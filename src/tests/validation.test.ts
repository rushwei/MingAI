import { test } from 'node:test';
import assert from 'node:assert/strict';

test('hasNonEmptyStrings validates required fields', async () => {
    const { hasNonEmptyStrings } = await import('../lib/validation');
    assert.equal(hasNonEmptyStrings({ a: 'x', b: 'y' }, ['a', 'b']), true);
    assert.equal(hasNonEmptyStrings({ a: 'x', b: ' ' }, ['a', 'b']), false);
});

test('missingFields detects missing or empty values', async () => {
    const { missingFields } = await import('../lib/validation');
    const missing = missingFields({ a: 'x', b: '', c: null }, ['a', 'b', 'c', 'd']);
    assert.deepEqual(missing, ['b', 'c', 'd']);
});

test('missingSearchParams detects missing query params', async () => {
    const { missingSearchParams } = await import('../lib/validation');
    const params = new URLSearchParams({ a: '1', b: '' });
    const missing = missingSearchParams(params, ['a', 'b', 'c']);
    assert.deepEqual(missing, ['b', 'c']);
});
