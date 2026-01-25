import { test } from 'node:test';
import assert from 'node:assert/strict';

test('countTokens estimates Chinese heavier than Latin', () => {
    const utils = require('../lib/token-utils') as any;
    const cn = '你'.repeat(60);
    const en = 'a'.repeat(60);
    assert.ok(utils.countTokens(cn) > utils.countTokens(en));
});

test('truncateToTokens reduces token count', () => {
    const utils = require('../lib/token-utils') as any;
    const text = 'A'.repeat(4000);
    const before = utils.countTokens(text);
    const truncated = utils.truncateToTokens(text, 200);
    const after = utils.countTokens(truncated);
    assert.ok(before > 200);
    assert.ok(after <= 260);
});
