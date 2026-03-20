import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const browserApiPath = resolve(process.cwd(), 'src/lib/browser-api.ts');
const unreadHookPath = resolve(process.cwd(), 'src/lib/hooks/useNotificationUnreadCount.ts');
const userPagePath = resolve(process.cwd(), 'src/app/user/page.tsx');
const userMenuPath = resolve(process.cwd(), 'src/components/layout/UserMenu.tsx');
test('browser api helper should emit api-write events for successful non-GET writes', async () => {
  const source = await readFile(browserApiPath, 'utf-8');

  assert.ok(
    source.includes("new CustomEvent('mingai:api-write'"),
    'browser api helper should emit write events after successful api mutations'
  );
  assert.ok(
    source.includes('shouldHandleApiWrite(pathname, method)'),
    'browser api helper should scope write event emission to non-GET api calls'
  );
});

test('notification counters should centralize supabase write-event sync in the shared unread hook', async () => {
  const [hookSource, userPage, userMenu] = await Promise.all([
    readFile(unreadHookPath, 'utf-8'),
    readFile(userPagePath, 'utf-8'),
    readFile(userMenuPath, 'utf-8'),
  ]);

  assert.ok(
    hookSource.includes("window.addEventListener('mingai:api-write'"),
    'shared unread hook should refresh unread count after write events'
  );
  assert.ok(
    userPage.includes('useNotificationUnreadCount'),
    'user center should consume the shared unread hook'
  );
  assert.ok(
    userMenu.includes('useNotificationUnreadCount'),
    'user menu should consume the shared unread hook'
  );
});
