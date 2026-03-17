import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

test('chat preview route should delegate prompt-context assembly to the shared chat prompt helper', async () => {
  const source = await readFile(resolve(process.cwd(), 'src/app/api/chat/preview/route.ts'), 'utf-8');

  assert.doesNotMatch(source, /buildPromptWithSources/u);
  assert.doesNotMatch(source, /searchKnowledge/u);
  assert.match(source, /from '@\/lib\/server\/chat\/prompt-context'/u);
});
