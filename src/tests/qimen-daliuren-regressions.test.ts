import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const qimenWrapperPath = resolve(process.cwd(), 'src/lib/divination/qimen.ts');
const qimenPagePath = resolve(process.cwd(), 'src/app/qimen/page.tsx');
const qimenRoutePath = resolve(process.cwd(), 'src/app/api/qimen/route.ts');
const qimenResultPath = resolve(process.cwd(), 'src/app/qimen/result/page.tsx');
const qimenGridPath = resolve(process.cwd(), 'src/components/qimen/QimenGrid.tsx');
const qimenDataSourcePath = resolve(process.cwd(), 'src/lib/data-sources/qimen.ts');
const daliurenHistoryPath = resolve(process.cwd(), 'src/app/daliuren/history/page.tsx');
const daliurenResultPath = resolve(process.cwd(), 'src/app/daliuren/result/page.tsx');
const daliurenPagePath = resolve(process.cwd(), 'src/app/daliuren/page.tsx');
const historyDrawerPath = resolve(process.cwd(), 'src/components/layout/HistoryDrawer.tsx');

test('qimen wrapper should forward zhiFuJiGong to core using canonical core enum values', async () => {
  const source = await readFile(qimenWrapperPath, 'utf-8');

  assert.match(source, /zhiFuJiGong/u, 'wrapper should continue accepting zhiFuJiGong from the web layer');
  assert.match(
    source,
    /ji_wugong|ji_liuyi/u,
    'wrapper should map the web-layer option to the core qimen enum values instead of dropping it',
  );
});

test('qimen web wrapper and route should not advertise unsupported feipan input', async () => {
  const [wrapperSource, routeSource] = await Promise.all([
    readFile(qimenWrapperPath, 'utf-8'),
    readFile(qimenRoutePath, 'utf-8'),
  ]);

  assert.doesNotMatch(
    wrapperSource,
    /panType:\s*'zhuan'\s*\|\s*'fei'/u,
    'qimen wrapper should not claim to support feipan before core exposes that capability',
  );
  assert.doesNotMatch(
    routeSource,
    /panType\?:\s*'zhuan'\s*\|\s*'fei'/u,
    'qimen route should not advertise feipan input while runtime only supports zhuan',
  );
  assert.match(
    routeSource,
    /panType\s*&&\s*panType\s*!==\s*'zhuan'/u,
    'qimen route should reject unsupported panType values explicitly instead of silently ignoring them',
  );
});

test('qimen page, wrapper, and route should preserve timezone when calculating a chart', async () => {
  const [pageSource, wrapperSource, routeSource] = await Promise.all([
    readFile(qimenPagePath, 'utf-8'),
    readFile(qimenWrapperPath, 'utf-8'),
    readFile(qimenRoutePath, 'utf-8'),
  ]);

  assert.match(
    pageSource,
    /timezone:\s*localTimeZone/u,
    'qimen page should submit the browser timezone with the chart request',
  );
  assert.match(
    wrapperSource,
    /timezone:\s*input\.timezone/u,
    'qimen wrapper should forward timezone into the core input',
  );
  assert.match(
    routeSource,
    /const \{ year, month, day, hour, minute, timezone/u,
    'qimen route should read timezone from the request body',
  );
  assert.match(
    routeSource,
    /year,\s*month,\s*day,\s*hour,\s*minute,\s*timezone,\s*question/u,
    'qimen route should pass timezone through to the qimen calculation wrapper',
  );
  assert.match(
    wrapperSource,
    /elementState:\s*p\.elementState/u,
    'qimen wrapper should expose palace elementState directly from core instead of dropping it',
  );
});

test('qimen web surfaces should not reference hiddenStem fields that core does not expose', async () => {
  const [wrapperSource, routeSource, gridSource, dataSource] = await Promise.all([
    readFile(qimenWrapperPath, 'utf-8'),
    readFile(qimenRoutePath, 'utf-8'),
    readFile(qimenGridPath, 'utf-8'),
    readFile(qimenDataSourcePath, 'utf-8'),
  ]);

  assert.doesNotMatch(
    wrapperSource,
    /hiddenStem/u,
    'qimen wrapper should not declare hiddenStem in the web contract when core does not return it',
  );
  assert.doesNotMatch(
    routeSource,
    /hiddenStem|暗干/u,
    'qimen analysis prompt should not mention hiddenStem data that the chart payload never contains',
  );
  assert.doesNotMatch(
    gridSource,
    /hiddenStem|暗干/u,
    'qimen grid should not render hiddenStem placeholders when core does not provide that field',
  );
  assert.doesNotMatch(
    dataSource,
    /hiddenStem|暗干/u,
    'qimen data-source formatting should stay aligned with the shared core chart contract',
  );
});

test('daliuren history and result pages should preserve conversationId so saved analyses can be restored', async () => {
  const [historySource, resultSource] = await Promise.all([
    readFile(daliurenHistoryPath, 'utf-8'),
    readFile(daliurenResultPath, 'utf-8'),
  ]);

  assert.match(
    historySource,
    /<HistoryPageTemplate[\s\S]*sourceType="daliuren"/u,
    'history page should use HistoryPageTemplate with daliuren sourceType',
  );
  assert.match(
    historySource,
    /restoreTimezone=\{defaultTimeZone\}/u,
    'history page should pass timezone to HistoryPageTemplate for restore',
  );
  assert.match(
    resultSource,
    /extractAnalysisFromConversation/u,
    'result page should restore saved AI analysis from the linked conversation when present',
  );
  assert.match(
    resultSource,
    /updateSessionJSON\('daliuren_params'/u,
    'result page should persist returned save identifiers back into session params',
  );
  assert.match(
    resultSource,
    /action:\s*'save'/u,
    'result page should auto-save the chart record instead of only saving inside AI interpretation flows',
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

test('qimen and daliuren pages should use SoundWaveLoader for visible loading states instead of legacy spinners', async () => {
  const [qimenPageSource, qimenResultSource, daliurenPageSource, daliurenResultSource] = await Promise.all([
    readFile(qimenPagePath, 'utf-8'),
    readFile(qimenResultPath, 'utf-8'),
    readFile(daliurenPagePath, 'utf-8'),
    readFile(daliurenResultPath, 'utf-8'),
  ]);

  assert.match(
    qimenPageSource,
    /SoundWaveLoader/u,
    'qimen entry page should use SoundWaveLoader for the chart creation button',
  );
  assert.doesNotMatch(
    qimenPageSource,
    /Loader2/u,
    'qimen entry page should not keep the old Loader2 spinner for chart creation',
  );

  assert.match(
    daliurenPageSource,
    /SoundWaveLoader/u,
    'daliuren entry page should use SoundWaveLoader for the chart creation button',
  );
  assert.doesNotMatch(
    daliurenPageSource,
    /Loader2/u,
    'daliuren entry page should not keep the old Loader2 spinner for chart creation',
  );

  assert.match(
    qimenResultSource,
    /SoundWaveLoader/u,
    'qimen result page should use SoundWaveLoader for result and AI interpretation loading states',
  );
  assert.doesNotMatch(
    qimenResultSource,
    /Loader2|animate-spin/u,
    'qimen result page should remove legacy spinner-based loading affordances',
  );

  assert.match(
    daliurenResultSource,
    /SoundWaveLoader/u,
    'daliuren result page should use SoundWaveLoader for result and AI interpretation loading states',
  );
  assert.doesNotMatch(
    daliurenResultSource,
    /animate-spin/u,
    'daliuren result page should remove legacy spinner-based loading affordances',
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
