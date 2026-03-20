import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const qimenResultPagePath = resolve(process.cwd(), 'src/app/qimen/result/page.tsx');

test('qimen result page should import copy formatter from a browser-safe shared module', async () => {
    const source = await readFile(qimenResultPagePath, 'utf-8');

    assert.match(
        source,
        /from ['"]@\/lib\/divination\/qimen-shared['"]/u,
        'qimen result page should import browser-safe copy helpers from qimen-shared',
    );
    assert.doesNotMatch(
        source,
        /import\s*\{\s*generateQimenResultText[^}]*\}\s*from ['"]@\/lib\/divination\/qimen['"]/u,
        'qimen result page should not import runtime copy helpers from the server-only qimen module',
    );
});
