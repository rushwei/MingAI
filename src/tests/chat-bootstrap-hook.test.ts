import test from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';

test('chat bootstrap hook should not seed an empty payload when no cache exists', async () => {
  const queryClient = new QueryClient();
  const { queryKeys } = await import('../lib/query/keys');

  assert.equal(queryClient.getQueryData(queryKeys.chatBootstrap('user-1')), undefined);
});
