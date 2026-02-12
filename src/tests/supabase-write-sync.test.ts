import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const supabaseClientPath = resolve(process.cwd(), 'src/lib/supabase.ts');
const userPagePath = resolve(process.cwd(), 'src/app/user/page.tsx');
const userMenuPath = resolve(process.cwd(), 'src/components/layout/UserMenu.tsx');
const notificationBellPath = resolve(process.cwd(), 'src/components/notification/NotificationBell.tsx');

test('supabase proxy adapter should emit write events for CRUD methods', async () => {
  const source = await readFile(supabaseClientPath, 'utf-8');

  assert.ok(
    source.includes("new CustomEvent('mingai:supabase-write'"),
    'supabase adapter should emit write event after successful mutations'
  );
  assert.ok(
    source.includes("const WRITE_QUERY_METHODS = new Set(['insert', 'upsert', 'update', 'delete'])"),
    'supabase adapter should only emit on write-like methods'
  );
});

test('notification counters should listen to supabase write events for immediate sync', async () => {
  const [userPage, userMenu, bell] = await Promise.all([
    readFile(userPagePath, 'utf-8'),
    readFile(userMenuPath, 'utf-8'),
    readFile(notificationBellPath, 'utf-8'),
  ]);

  assert.ok(
    userPage.includes("window.addEventListener('mingai:supabase-write'"),
    'user center should refresh unread count after write event'
  );
  assert.ok(
    userMenu.includes("window.addEventListener('mingai:supabase-write'"),
    'user menu should refresh unread count after write event'
  );
  assert.ok(
    bell.includes("window.addEventListener('mingai:supabase-write'"),
    'notification bell should refresh unread count after write event'
  );
});
