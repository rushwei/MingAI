import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const mentionConstantsPath = resolve(process.cwd(), 'src/components/chat/mention/mention-constants.tsx');
const iconCatalogPath = resolve(process.cwd(), 'src/lib/data-sources/icon-catalog.ts');

test('MentionPopover module should reuse the shared data-source nav icon catalog', async () => {
  const source = await readFile(mentionConstantsPath, 'utf-8');

  assert.match(source, /getDataSourceNavIcon/u, 'mention-constants should resolve icons through the shared nav icon catalog');
  assert.match(source, /renderDataSourceNavIcon/u, 'mention-constants should funnel data-source icons through the nav icon helper');
});

test('MentionPopover icon catalog should resolve icons through navigation registry lookups', async () => {
  const source = await readFile(iconCatalogPath, 'utf-8');

  assert.match(source, /getNavItemById/u, 'icon-catalog should read icons from the navigation registry');
  assert.match(source, /getDataSourceNavId\(type\)/u, 'icon-catalog should resolve the sidebar nav id from the shared data-source catalog first');
});
