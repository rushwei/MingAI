import test from 'node:test';
import assert from 'node:assert/strict';

import {
    getVisibleDataSubcategories,
    getVisibleDataTypesForSubcategory,
} from '../components/chat/mention/mention-visibility';

test('mention visibility hides the hepan subcategory when the hepan feature is disabled', () => {
    const visible = getVisibleDataSubcategories([
        'bazi_chart',
        'ziwei_chart',
        'ming_record',
        'daily_fortune',
    ]);

    assert.deepEqual(visible, ['命盘', '命理记录', '运势']);
    assert.ok(!visible.includes('合盘记录'));
  });

test('mention visibility keeps mixed subcategories but removes disabled types inside them', () => {
    const visible = getVisibleDataSubcategories([
        'bazi_chart',
        'liuyao_divination',
        'ming_record',
    ]);

    assert.deepEqual(visible, ['命盘', '占卜记录', '命理记录']);

    assert.deepEqual(getVisibleDataTypesForSubcategory('命盘', ['bazi_chart']), ['bazi_chart']);
    assert.deepEqual(getVisibleDataTypesForSubcategory('命理记录', ['ming_record']), ['ming_record']);
});

test('mention visibility should not keep the 命理记录 bucket alive only because daliuren remains enabled', () => {
    const visible = getVisibleDataSubcategories(['daliuren_divination']);

    assert.deepEqual(visible, ['占卜记录']);
    assert.deepEqual(getVisibleDataTypesForSubcategory('命理记录', ['daliuren_divination']), []);
    assert.deepEqual(getVisibleDataTypesForSubcategory('占卜记录', ['daliuren_divination']), ['daliuren_divination']);
});
