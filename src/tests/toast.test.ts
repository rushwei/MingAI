import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeToastOptions } from '../components/ui/Toast';

test('normalizeToastOptions supports legacy number duration argument', () => {
    const options = normalizeToastOptions(2500);
    assert.equal(options.duration, 2500);
    assert.equal(options.action, undefined);
});

test('normalizeToastOptions preserves action configuration', () => {
    const action = {
        label: '查看对话',
        onClick: () => undefined,
    };
    const options = normalizeToastOptions({
        duration: 5000,
        action,
    });

    assert.equal(options.duration, 5000);
    assert.equal(options.action, action);
});

test('normalizeToastOptions returns empty object for undefined input', () => {
    const options = normalizeToastOptions(undefined);
    assert.equal(options.duration, undefined);
    assert.equal(options.action, undefined);
});
