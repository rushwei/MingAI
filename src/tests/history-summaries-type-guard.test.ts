import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const routePath = resolve(process.cwd(), 'src/app/api/history-summaries/route.ts');

test('history summaries route should normalize rows through a helper instead of direct record casts', async () => {
  const source = await readFile(routePath, 'utf-8');

  assert.match(
    source,
    /function toHistoryRow/u,
    'route should define a helper that normalizes loose supabase rows before title building',
  );
  assert.doesNotMatch(
    source,
    /item as Record<string, unknown>/u,
    'route should not directly cast every row into a generic record',
  );
});
