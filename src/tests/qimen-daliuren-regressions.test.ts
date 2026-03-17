import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const qimenWrapperPath = resolve(process.cwd(), 'src/lib/divination/qimen.ts');
const qimenResultPath = resolve(process.cwd(), 'src/app/qimen/result/page.tsx');
const daliurenHistoryPath = resolve(process.cwd(), 'src/app/daliuren/history/page.tsx');
const daliurenResultPath = resolve(process.cwd(), 'src/app/daliuren/result/page.tsx');
const daliurenPagePath = resolve(process.cwd(), 'src/app/daliuren/page.tsx');
const historyDrawerPath = resolve(process.cwd(), 'src/components/layout/HistoryDrawer.tsx');

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
    /loadHistoryRestore\('daliuren',\s*record\.id,\s*defaultTimeZone\)/u,
    'history page should restore daliuren records through the shared restore payload contract',
  );
  assert.match(
    resultSource,
    /extractAnalysisFromConversation/u,
    'result page should restore saved AI analysis from the linked conversation when present',
  );
});

test('daliuren page and history page should preserve timezone when restoring a chart', async () => {
  const [pageSource, historySource] = await Promise.all([
    readFile(daliurenPagePath, 'utf-8'),
    readFile(daliurenHistoryPath, 'utf-8'),
  ]);

  assert.match(
    pageSource,
    /timezone:\s*localTimeZone/u,
    'daliuren page should write the local timezone into session params',
  );
  assert.match(
    historySource,
    /defaultTimeZone/u,
    'daliuren history page should forward the browser timezone to the shared restore payload loader',
  );
});

test('HistoryDrawer should continue supporting qimen and daliuren restores', async () => {
  const source = await readFile(historyDrawerPath, 'utf-8');

  assert.match(
    source,
    /type HistoryType/u,
    'HistoryDrawer should keep using the shared history type contract',
  );
  assert.match(
    source,
    /HISTORY_CONFIG/u,
    'HistoryDrawer should keep qimen and daliuren entries in the shared history registry',
  );
  assert.match(
    source,
    /loadHistoryRestore\(type,\s*itemId,\s*defaultTimeZone\)/u,
    'HistoryDrawer should forward the browser timezone when requesting a daliuren restore payload',
  );
  assert.match(
    source,
    /writeSessionJSON\(payload\.sessionKey,\s*payload\.sessionData\)/u,
    'HistoryDrawer should restore qimen and daliuren payloads through the shared restore payload contract',
  );
});

test('qimen result page should use the same AddToKnowledgeBaseModal contract as the history page', async () => {
  const source = await readFile(qimenResultPath, 'utf-8');

  assert.match(
    source,
    /<AddToKnowledgeBaseModal[\s\S]*open=\{showKbModal\}/u,
    'qimen result page should pass the current open prop name to AddToKnowledgeBaseModal',
  );
  assert.match(
    source,
    /sourceTitle=\{result\.question \|\| '奇门遁甲排盘'\}/u,
    'qimen result page should keep the same fallback knowledge-base title as qimen history restores',
  );
});
