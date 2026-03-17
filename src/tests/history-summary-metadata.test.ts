import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { buildHistorySummary } from '../lib/history/registry';

test('tarot history summary should preserve reversed card orientation in preview badges', async () => {
  const item = await buildHistorySummary('tarot', {
    id: 'tarot-1',
    spread_id: 'three-card',
    question: '这周感情如何',
    created_at: '2026-03-17T00:00:00.000Z',
    cards: [
      { card: { nameChinese: '愚者' }, orientation: 'upright' },
      { card: { nameChinese: '恋人' }, orientation: 'reversed' },
      { card: { nameChinese: '太阳' }, orientation: 'upright' },
    ],
  });

  assert.deepEqual(item.badges, ['愚者', '恋人 (逆)', '太阳']);
});

test('liuyao history summary should preserve changed line overview', async () => {
  const item = await buildHistorySummary('liuyao', {
    id: 'liuyao-1',
    hexagram_code: '111111',
    changed_hexagram_code: '000000',
    changed_lines: [1, 3, 6],
    question: '项目是否推进',
    created_at: '2026-03-17T00:00:00.000Z',
  });

  assert.equal(item.metric, '变爻：第1爻、第3爻、第6爻');
});

test('tarot history page should style reversed preview badges distinctly', async () => {
  const source = await readFile(resolve(process.cwd(), 'src/app/tarot/history/page.tsx'), 'utf-8');

  assert.match(
    source,
    /badge\.includes\('\(逆\)'\)/u,
    'tarot history page should branch preview badge style by reversed orientation marker',
  );
});

test('liuyao history page should render the shared changed-line summary', async () => {
  const source = await readFile(resolve(process.cwd(), 'src/app/liuyao/history/page.tsx'), 'utf-8');

  assert.match(
    source,
    /item\.metric/u,
    'liuyao history page should render the changed-line summary provided by HistorySummaryItem.metric',
  );
});
