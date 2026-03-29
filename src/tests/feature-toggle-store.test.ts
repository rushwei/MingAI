import test from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';

test('query invalidation should refresh app bootstrap after feature toggle writes', async () => {
  const originalWindow = (globalThis as { window?: unknown }).window;
  const queryClient = new QueryClient();
  const invalidated: Array<readonly unknown[] | undefined> = [];
  const originalInvalidate = queryClient.invalidateQueries.bind(queryClient);
  queryClient.invalidateQueries = (async (filters) => {
    invalidated.push(filters?.queryKey);
    return await originalInvalidate(filters);
  }) as typeof queryClient.invalidateQueries;

  (globalThis as { window?: unknown }).window = {} as Window;

  const { registerBrowserQueryClient } = await import('../lib/query/client');
  const { invalidateQueriesForPath } = await import('../lib/query/invalidation');

  try {
    registerBrowserQueryClient(queryClient);
    invalidateQueriesForPath('/api/feature-toggles');
    assert.deepEqual(invalidated, [['app', 'bootstrap']]);
  } finally {
    (globalThis as { window?: unknown }).window = originalWindow;
  }
});

test('query invalidation should refresh chat bootstrap after user settings writes', async () => {
  const originalWindow = (globalThis as { window?: unknown }).window;
  const queryClient = new QueryClient();
  const invalidated: Array<readonly unknown[] | undefined> = [];
  const originalInvalidate = queryClient.invalidateQueries.bind(queryClient);
  queryClient.invalidateQueries = (async (filters) => {
    invalidated.push(filters?.queryKey);
    return await originalInvalidate(filters);
  }) as typeof queryClient.invalidateQueries;

  (globalThis as { window?: unknown }).window = {} as Window;

  const { registerBrowserQueryClient } = await import('../lib/query/client');
  const { invalidateQueriesForPath } = await import('../lib/query/invalidation');

  try {
    registerBrowserQueryClient(queryClient);
    invalidateQueriesForPath('/api/user/settings');
    assert.deepEqual(invalidated, [['chat', 'bootstrap']]);
  } finally {
    (globalThis as { window?: unknown }).window = originalWindow;
  }
});

test('query invalidation should refresh models after membership-affecting writes', async () => {
  const originalWindow = (globalThis as { window?: unknown }).window;
  const queryClient = new QueryClient();
  const invalidated: Array<readonly unknown[] | undefined> = [];
  const originalInvalidate = queryClient.invalidateQueries.bind(queryClient);
  queryClient.invalidateQueries = (async (filters) => {
    invalidated.push(filters?.queryKey);
    return await originalInvalidate(filters);
  }) as typeof queryClient.invalidateQueries;

  (globalThis as { window?: unknown }).window = {} as Window;

  const { registerBrowserQueryClient } = await import('../lib/query/client');
  const { invalidateQueriesForPath } = await import('../lib/query/invalidation');

  try {
    registerBrowserQueryClient(queryClient);
    invalidateQueriesForPath('/api/membership/upgrade');
    assert.deepEqual(invalidated, [['app', 'bootstrap'], ['chat', 'bootstrap'], ['models']]);
  } finally {
    (globalThis as { window?: unknown }).window = originalWindow;
  }
});
