import test from 'node:test';
import assert from 'node:assert/strict';

import {
    filterDataSourceItemsByFeature,
    getDataSourceFeatureId,
    getDataSourceNavId,
} from '../lib/data-sources/catalog';

test('data source catalog maps feature ids to the corresponding chat-visible source types', () => {
    assert.equal(getDataSourceFeatureId('hepan_chart'), 'hepan');
    assert.equal(getDataSourceFeatureId('ming_record'), 'records');
    assert.equal(getDataSourceFeatureId('qimen_chart'), 'qimen');
    assert.equal(getDataSourceFeatureId('daliuren_divination'), 'daliuren');
});

test('data source catalog filters disabled feature types out of mention data', () => {
    const visible = filterDataSourceItemsByFeature(
        [
            { id: 'b1', type: 'bazi_chart', name: '八字命盘', preview: '', createdAt: '2026-03-18T00:00:00.000Z' },
            { id: 'h1', type: 'hepan_chart', name: '合盘记录', preview: '', createdAt: '2026-03-18T00:00:00.000Z' },
            { id: 'r1', type: 'ming_record', name: '命理记录', preview: '', createdAt: '2026-03-18T00:00:00.000Z' },
        ],
        (featureId) => featureId !== 'hepan' && featureId !== 'records'
    );

    assert.deepEqual(visible.map((item) => item.type), ['bazi_chart']);
});

test('data source catalog reuses sidebar navigation ids for mention rendering', () => {
    assert.equal(getDataSourceNavId('bazi_chart'), 'bazi');
    assert.equal(getDataSourceNavId('qimen_chart'), 'qimen');
    assert.equal(getDataSourceNavId('daliuren_divination'), 'daliuren');
});
