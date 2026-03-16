import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const qimenWrapperPath = resolve(process.cwd(), 'src/lib/divination/qimen.ts');
const daliurenHistoryPath = resolve(process.cwd(), 'src/app/daliuren/history/page.tsx');
const daliurenResultPath = resolve(process.cwd(), 'src/app/daliuren/result/page.tsx');

test('qimen wrapper should forward zhiFuJiGong to mcp-core using canonical core enum values', async () => {
  const source = await readFile(qimenWrapperPath, 'utf-8');

  assert.match(source, /zhiFuJiGong/u, 'wrapper should continue accepting zhiFuJiGong from the web layer');
  assert.match(
    source,
    /ji_wugong|ji_liuyi/u,
    'wrapper should map the web-layer option to the core qimen enum values instead of dropping it',
  );
});

test('daliuren history and result pages should preserve conversationId so saved analyses can be restored', async () => {
  const [historySource, resultSource] = await Promise.all([
    readFile(daliurenHistoryPath, 'utf-8'),
    readFile(daliurenResultPath, 'utf-8'),
  ]);

  assert.match(
    historySource,
    /conversationId:\s*record\.conversation_id/u,
    'history page should persist the saved conversation id when opening an existing record',
  );
  assert.match(
    resultSource,
    /extractAnalysisFromConversation/u,
    'result page should restore saved AI analysis from the linked conversation when present',
  );
});
