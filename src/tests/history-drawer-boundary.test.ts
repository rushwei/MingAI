import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const historyDrawerPath = resolve(process.cwd(), 'src/components/layout/HistoryDrawer.tsx');

test('history drawer should restore via history summaries api instead of querying source tables directly', async () => {
  const source = await readFile(historyDrawerPath, 'utf-8');

  assert.doesNotMatch(
    source,
    /from\('(?:tarot_readings|liuyao_divinations|mbti_readings|hepan_charts|palm_readings|face_readings|qimen_charts|daliuren_divinations)'\)/u,
    'history drawer should not query raw history tables from the browser layer',
  );
  assert.match(
    source,
    /loadHistorySummariesPage/u,
    'history drawer should load list data through the shared history client',
  );
  assert.match(
    source,
    /loadHistoryRestore/u,
    'history drawer should load restore payloads through the shared history client',
  );
  assert.match(
    source,
    /HISTORY_CONFIG/u,
    'history drawer should reuse the shared history registry for paths and session keys',
  );
});
