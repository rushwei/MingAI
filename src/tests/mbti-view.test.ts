import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon';

test('buildViewResult returns defaults for valid type', () => {
    const mbti = require('../lib/divination/mbti') as any;

    assert.equal(typeof mbti.buildViewResult, 'function');

    const result = mbti.buildViewResult('INTJ');
    assert.equal(result?.type, 'INTJ');
    assert.equal(result?.percentages?.EI?.E, 50);
    assert.equal(result?.percentages?.EI?.I, 50);
});

test('buildViewResult rejects invalid type', () => {
    const mbti = require('../lib/divination/mbti') as any;

    assert.equal(mbti.buildViewResult('NOPE'), null);
});
