import { test } from 'node:test';
import assert from 'node:assert/strict';

test('data-sources registry resolves known providers', async () => {
    require('../lib/data-sources/init');
    const ds = require('../lib/data-sources') as any;

    const types = [
        'bazi_chart',
        'ziwei_chart',
        'tarot_reading',
        'liuyao_divination',
        'mbti_reading',
        'hepan_chart',
        'face_reading',
        'palm_reading',
        'ming_record',
        'daily_fortune',
        'monthly_fortune',
    ];

    for (const t of types) {
        const p = await ds.getProvider(t);
        assert.equal(p.type, t);
        assert.equal(typeof p.displayName, 'string');
        assert.equal(typeof p.list, 'function');
        assert.equal(typeof p.get, 'function');
        assert.equal(typeof p.formatForAI, 'function');
        assert.equal(typeof p.summarize, 'function');
    }
});

test('data-sources registry rejects unknown types', async () => {
    require('../lib/data-sources/init');
    const ds = require('../lib/data-sources') as any;
    await assert.rejects(async () => await ds.getProvider('unknown_type'), /Unknown data source type/);
});

