import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const browserApiPath = resolve(process.cwd(), 'src/lib/browser-api.ts');
const userPagePath = resolve(process.cwd(), 'src/app/user/page.tsx');
const userMenuPath = resolve(process.cwd(), 'src/components/layout/UserMenu.tsx');
const notificationBellPath = resolve(process.cwd(), 'src/components/notification/NotificationBell.tsx');

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

test('notification counters should listen to supabase write events for immediate sync', async () => {
  const [userPage, userMenu, bell] = await Promise.all([
    readFile(userPagePath, 'utf-8'),
    readFile(userMenuPath, 'utf-8'),
    readFile(notificationBellPath, 'utf-8'),
  ]);

  assert.ok(
    userPage.includes("window.addEventListener('mingai:api-write'"),
    'user center should refresh unread count after write event'
  );
  assert.ok(
    userMenu.includes("window.addEventListener('mingai:api-write'"),
    'user menu should refresh unread count after write event'
  );
  assert.ok(
    bell.includes("window.addEventListener('mingai:api-write'"),
    'notification bell should refresh unread count after write event'
  );
});
