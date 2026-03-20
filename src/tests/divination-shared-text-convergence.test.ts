import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const qimenLibPath = resolve(process.cwd(), 'src/lib/divination/qimen-shared.ts');
const qimenResultPagePath = resolve(process.cwd(), 'src/app/qimen/result/page.tsx');
const qimenDataSourcePath = resolve(process.cwd(), 'src/lib/data-sources/qimen.ts');
const qimenRoutePath = resolve(process.cwd(), 'src/app/api/qimen/route.ts');

const tarotLibPath = resolve(process.cwd(), 'src/lib/divination/tarot.ts');
const tarotResultPagePath = resolve(process.cwd(), 'src/app/tarot/result/page.tsx');
const tarotDataSourcePath = resolve(process.cwd(), 'src/lib/data-sources/tarot.ts');

const daliurenLibPath = resolve(process.cwd(), 'src/lib/divination/daliuren.ts');
const daliurenResultPagePath = resolve(process.cwd(), 'src/app/daliuren/result/page.tsx');
const daliurenDataSourcePath = resolve(process.cwd(), 'src/lib/data-sources/daliuren.ts');
const daliurenRoutePath = resolve(process.cwd(), 'src/app/api/daliuren/route.ts');

const ziweiLibPath = resolve(process.cwd(), 'src/lib/divination/ziwei.ts');
const ziweiDataSourcePath = resolve(process.cwd(), 'src/lib/data-sources/ziwei.ts');
const liuyaoDataSourcePath = resolve(process.cwd(), 'src/lib/data-sources/liuyao.ts');
const liuyaoResultPagePath = resolve(process.cwd(), 'src/app/liuyao/result/page.tsx');

test('qimen should converge copy text, data-source text, and AI chart text on one shared formatter', async () => {
    const [libSource, pageSource, dataSource, routeSource] = await Promise.all([
        readFile(qimenLibPath, 'utf-8'),
        readFile(qimenResultPagePath, 'utf-8'),
        readFile(qimenDataSourcePath, 'utf-8'),
        readFile(qimenRoutePath, 'utf-8'),
    ]);

    assert.match(libSource, /export function generateQimenResultText/u);
    assert.match(pageSource, /generateQimenResultText\(/u);
    assert.match(dataSource, /generateQimenResultText\(/u);
    assert.match(routeSource, /generateQimenResultText\(/u);
});

test('tarot should converge result-page copy text and data-source text on one shared formatter', async () => {
    const [libSource, pageSource, dataSource] = await Promise.all([
        readFile(tarotLibPath, 'utf-8'),
        readFile(tarotResultPagePath, 'utf-8'),
        readFile(tarotDataSourcePath, 'utf-8'),
    ]);

    assert.match(libSource, /export function generateTarotReadingText/u);
    assert.match(pageSource, /generateTarotReadingText\(/u);
    assert.match(dataSource, /generateTarotReadingText\(/u);
});

test('daliuren should expose and reuse a shared result formatter for copy, data-source, and AI prompt text', async () => {
    const [libSource, pageSource, dataSource, routeSource] = await Promise.all([
        readFile(daliurenLibPath, 'utf-8'),
        readFile(daliurenResultPagePath, 'utf-8'),
        readFile(daliurenDataSourcePath, 'utf-8'),
        readFile(daliurenRoutePath, 'utf-8'),
    ]);

    assert.match(libSource, /export function generateDaliurenResultText/u);
    assert.match(pageSource, /generateDaliurenResultText\(/u);
    assert.match(dataSource, /generateDaliurenResultText\(/u);
    assert.match(routeSource, /generateDaliurenResultText\(/u);
});

test('ziwei data-source should reuse the same chart text helper as copy and prompt contexts', async () => {
    const [libSource, dataSource] = await Promise.all([
        readFile(ziweiLibPath, 'utf-8'),
        readFile(ziweiDataSourcePath, 'utf-8'),
    ]);

    assert.match(libSource, /export function generateZiweiChartText/u);
    assert.match(dataSource, /generateZiweiChartText\(/u);
    assert.doesNotMatch(
        dataSource,
        /ziweiChartToText\(/u,
        'ziwei data-source should stop keeping a separate richer text path than copy/prompt contexts',
    );
});

test('liuyao should reuse buildTraditionalInfo for both result-page copy text and formal data-source output', async () => {
    const [dataSource, pageSource] = await Promise.all([
        readFile(liuyaoDataSourcePath, 'utf-8'),
        readFile(liuyaoResultPagePath, 'utf-8'),
    ]);

    assert.match(dataSource, /buildTraditionalInfo\(/u);
    assert.match(pageSource, /buildTraditionalInfo\(/u);
});
