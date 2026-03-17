import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const snapshotPath = resolve(process.cwd(), 'supabase/tabel_export_from_supabase.sql');

test('schema snapshot should include qimen_charts and daliuren_divinations tables', async () => {
  const source = await readFile(snapshotPath, 'utf-8');

  assert.match(
    source,
    /CREATE TABLE public\.qimen_charts/u,
    'schema snapshot should document the qimen_charts table that the app now depends on',
  );
  assert.match(
    source,
    /CREATE TABLE public\.daliuren_divinations/u,
    'schema snapshot should document the daliuren_divinations table that the app now depends on',
  );
});
