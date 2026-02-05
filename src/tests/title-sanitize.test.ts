import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizePlainTitle } from '../lib/title-utils';

test('sanitizePlainTitle removes markdown and quotes', () => {
    assert.equal(sanitizePlainTitle('**你好**'), '你好');
    assert.equal(sanitizePlainTitle('# 标题'), '标题');
    assert.equal(sanitizePlainTitle('> 引用'), '引用');
    assert.equal(sanitizePlainTitle('`代码`'), '代码');
    assert.equal(sanitizePlainTitle('「你好」'), '你好');
    assert.equal(sanitizePlainTitle('“你好”'), '你好');
});

