import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const promptContextPath = resolve(process.cwd(), 'src/lib/server/chat/prompt-context.ts');

test('chat prompt context should not pass deprecated membershipType into knowledge search options', async () => {
  const source = await readFile(promptContextPath, 'utf-8');

  assert.match(
    source,
    /searchKnowledge\(cleanedQuery,\s*\{[\s\S]*accessToken:\s*accessTokenForKB \|\| undefined,/u,
    'prompt-context should continue calling searchKnowledge with the current option shape',
  );
  assert.doesNotMatch(
    source,
    /accessToken:\s*accessTokenForKB \|\| undefined,\s*\n\s*membershipType,/u,
    'prompt-context should not pass the removed membershipType field inside searchKnowledge options',
  );
});
