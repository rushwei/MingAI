import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_NAV_ORDER, DEFAULT_TOOL_ORDER } from '@/lib/user/settings';

test('daily and monthly should be in DEFAULT_NAV_ORDER (divination section)', () => {
  assert.ok(DEFAULT_NAV_ORDER.includes('daily'), 'DEFAULT_NAV_ORDER should contain daily');
  assert.ok(DEFAULT_NAV_ORDER.includes('monthly'), 'DEFAULT_NAV_ORDER should contain monthly');
});

test('daily and monthly should NOT be in DEFAULT_TOOL_ORDER', () => {
  assert.equal(DEFAULT_TOOL_ORDER.includes('daily' as never), false, 'DEFAULT_TOOL_ORDER should not contain daily');
  assert.equal(DEFAULT_TOOL_ORDER.includes('monthly' as never), false, 'DEFAULT_TOOL_ORDER should not contain monthly');
});

test('qimen and daliuren should be in DEFAULT_NAV_ORDER', () => {
  assert.ok(DEFAULT_NAV_ORDER.includes('qimen'));
  assert.ok(DEFAULT_NAV_ORDER.includes('daliuren'));
});
