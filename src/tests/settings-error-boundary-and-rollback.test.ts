import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const userSettingsPath = resolve(process.cwd(), 'src/lib/user/settings.ts');
const sidebarConfigContextPath = resolve(process.cwd(), 'src/components/layout/SidebarConfigContext.tsx');
const settingsPagePath = resolve(process.cwd(), 'src/app/user/settings/page.tsx');
const aiSettingsPagePath = resolve(process.cwd(), 'src/app/user/ai-settings/page.tsx');
const knowledgeBasePagePath = resolve(process.cwd(), 'src/app/user/knowledge-base/page.tsx');

test('loadCurrentUserSettings should surface request errors instead of collapsing them into null settings', async () => {
  const originalFetch = global.fetch;
  const { loadCurrentUserSettings } = await import('../lib/user/settings');

  global.fetch = async () => new Response(JSON.stringify({ error: { message: 'boom' } }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  }) as Response;

  try {
    const result = await loadCurrentUserSettings();
    assert.equal(result.settings, null);
    assert.equal(result.error?.message, 'boom');
  } finally {
    global.fetch = originalFetch;
  }
});

test('settings consumers should treat user settings load errors explicitly instead of defaulting silently', async () => {
  const [sidebarSource, aiSettingsSource, knowledgeBaseSource] = await Promise.all([
    readFile(sidebarConfigContextPath, 'utf-8'),
    readFile(aiSettingsPagePath, 'utf-8'),
    readFile(knowledgeBasePagePath, 'utf-8'),
  ]);

  for (const source of [sidebarSource, aiSettingsSource, knowledgeBaseSource]) {
    assert.match(
      source,
      /const\s+\{\s*settings,\s*error\s*\}\s*=\s*await\s+loadCurrentUserSettings\(\)/u,
      'user settings consumers should read settings and error separately',
    );
    assert.match(
      source,
      /if\s*\(error\)/u,
      'user settings consumers should branch explicitly on load errors',
    );
  }
});

test('settings page should rollback optimistic preference writes and reminder toggles on save failure', async () => {
  const source = await readFile(settingsPagePath, 'utf-8');

  assert.match(
    source,
    /const\s+previousSettings\s*=\s*settings/u,
    'settings page should snapshot previous settings before optimistic updates',
  );
  assert.match(
    source,
    /setSettings\(previousSettings\)/u,
    'settings page should rollback optimistic settings state when save fails',
  );
  assert.match(
    source,
    /if\s*\(!res\.ok\)/u,
    'reminder toggle should treat non-2xx responses as failures',
  );
  assert.match(
    source,
    /setEnabled\(previousEnabled\)/u,
    'reminder toggle should rollback optimistic state on failed writes',
  );
});

test('user settings helper should expose a structured load result contract', async () => {
  const source = await readFile(userSettingsPath, 'utf-8');

  assert.match(
    source,
    /type\s+UserSettingsLoadResult/u,
    'user settings helper should define an explicit load result type',
  );
  assert.match(
    source,
    /error:\s*result\.error/u,
    'user settings helper should forward request errors to callers',
  );
});
