import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const chartPickerModalPath = resolve(process.cwd(), 'src/components/common/ChartPickerModal.tsx');

test('ChartPickerModal should narrow query results before mapping chart rows', async () => {
  const source = await readFile(chartPickerModalPath, 'utf-8');

  assert.match(
    source,
    /function toChartRows\(value: unknown\): ChartQueryRow\[\][\s\S]*Array\.isArray\(value\)/u,
    'ChartPickerModal should guard API payloads as arrays before iterating over them',
  );
  assert.doesNotMatch(
    source,
    /as ChartQueryRow\[\]/u,
    'ChartPickerModal should not coerce unknown payloads into chart arrays without narrowing',
  );
});
