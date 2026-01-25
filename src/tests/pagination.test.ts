import { test } from 'node:test';
import assert from 'node:assert/strict';

test('parsePagination uses defaults for invalid inputs', async () => {
    const { parsePagination } = await import('../lib/pagination');
    const params = new URLSearchParams({ page: 'x', pageSize: 'y' });
    const result = parsePagination(params, { defaultPage: 2, defaultPageSize: 10 });
    assert.equal(result.page, 2);
    assert.equal(result.pageSize, 10);
    assert.equal(result.from, 10);
    assert.equal(result.to, 19);
});

test('parsePagination clamps pageSize and computes range', async () => {
    const { parsePagination } = await import('../lib/pagination');
    const params = new URLSearchParams({ page: '3', pageSize: '500' });
    const result = parsePagination(params, { maxPageSize: 50, defaultPageSize: 20 });
    assert.equal(result.page, 3);
    assert.equal(result.pageSize, 50);
    assert.equal(result.from, 100);
    assert.equal(result.to, 149);
});
