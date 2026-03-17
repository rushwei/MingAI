import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const aiAnalysisPath = resolve(process.cwd(), 'src/lib/ai/ai-analysis.ts');

test('ai analysis conversation persistence should build assistant messages as ChatMessage[]', async () => {
  const source = await readFile(aiAnalysisPath, 'utf-8');

  assert.match(
    source,
    /import type \{ AIPersonality, ChatMessage \} from '@\/types';|import type \{ ChatMessage, AIPersonality \} from '@\/types';/u,
    'ai-analysis should import ChatMessage alongside AIPersonality for strict message typing',
  );
  assert.match(
    source,
    /const messages:\s*ChatMessage\[\]\s*=\s*\[/u,
    'ai-analysis should type the persisted assistant message array as ChatMessage[]',
  );
});
