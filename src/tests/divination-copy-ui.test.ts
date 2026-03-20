import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const baziResultPagePath = resolve(process.cwd(), 'src/app/bazi/result/page.tsx');
const baziResultHeaderPath = resolve(process.cwd(), 'src/components/bazi/result/ResultHeader.tsx');
const tarotResultPagePath = resolve(process.cwd(), 'src/app/tarot/result/page.tsx');
const daliurenResultPagePath = resolve(process.cwd(), 'src/app/daliuren/result/page.tsx');

test('bazi result page should provide a copy action for the chart body instead of only sharing the URL', async () => {
    const pageSource = await readFile(baziResultPagePath, 'utf-8');
    const headerSource = await readFile(baziResultHeaderPath, 'utf-8');

    assert.match(
        pageSource,
        /const handleCopy = /u,
        'bazi result page should define a dedicated copy handler for the chart content',
    );
    assert.match(
        pageSource,
        /onCopy=\{handleCopy\}/u,
        'bazi result page should pass the chart copy action into the shared header',
    );
    assert.match(
        pageSource,
        /id:\s*'copy'/u,
        'bazi mobile header menu should expose a copy action',
    );
    assert.match(
        headerSource,
        /onCopy:\s*\(\)\s*=>\s*void/u,
        'bazi desktop header should accept a copy callback',
    );
    assert.match(
        headerSource,
        /Copy/u,
        'bazi desktop header should render a copy affordance',
    );
});

test('tarot result page should provide copy actions for the current reading on desktop and mobile', async () => {
    const source = await readFile(tarotResultPagePath, 'utf-8');

    assert.match(
        source,
        /const handleCopy = /u,
        'tarot result page should define a copy handler for the current reading',
    );
    assert.match(
        source,
        /id:\s*'copy'/u,
        'tarot mobile header menu should expose a copy action',
    );
    assert.match(
        source,
        /复制/u,
        'tarot desktop action area should render a copy button',
    );
});

test('daliuren result page should provide copy actions for the current chart on desktop and mobile', async () => {
    const source = await readFile(daliurenResultPagePath, 'utf-8');

    assert.match(
        source,
        /const handleCopy = /u,
        'daliuren result page should define a copy handler for the current chart',
    );
    assert.match(
        source,
        /id:\s*'copy'/u,
        'daliuren mobile header menu should expose a copy action',
    );
    assert.match(
        source,
        /复制/u,
        'daliuren desktop action area should render a copy button',
    );
});
