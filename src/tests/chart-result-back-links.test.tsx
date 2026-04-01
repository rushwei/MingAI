import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { renderToString } from 'react-dom/server';
import { ResultHeader } from '@/components/bazi/result/ResultHeader';

test('bazi result header should link generic return back to /bazi even for saved charts', () => {
    const markup = renderToString(
        <ResultHeader
            chartId="chart_123"
            saving={false}
            saved={false}
            copied={false}
            onEdit={() => {}}
            onSave={() => {}}
            onCopy={() => {}}
            onShare={() => {}}
        />
    );

    assert.match(markup, /href="\/bazi"/u);
    assert.doesNotMatch(markup, /\/user\/charts/u);
});

test('ziwei result page should not use charts panel as the generic return target', () => {
    const source = readFileSync(
        path.join(process.cwd(), 'src/app/ziwei/result/page.tsx'),
        'utf8',
    );

    assert.match(source, /<Link href="\/ziwei"[^>]*>返回<\/Link>/u);
    assert.doesNotMatch(source, /<SettingsCenterLink\s+tab="charts"[^>]*>返回<\/SettingsCenterLink>/u);
});
