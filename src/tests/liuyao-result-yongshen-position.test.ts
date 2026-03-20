import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('result page highlights yongshen star only when liuqin matches visible yao', () => {
    const filePath = path.join(process.cwd(), 'src/app/liuyao/result/page.tsx');
    const content = fs.readFileSync(filePath, 'utf8');

    assert.equal(content.includes('line.liuQin === group.selected.liuQin'), true);
});

test('result page copy text marks yongshen only when line and liuqin both match', () => {
    const resultPath = path.join(process.cwd(), 'src/app/liuyao/result/page.tsx');
    const resultContent = fs.readFileSync(resultPath, 'utf8');

    assert.equal(resultContent.includes('buildTraditionalInfo('), true);
    assert.equal(resultContent.includes('const yongShenPositions = new Set('), false);

    // shared util contains the actual Set construction with position:liuQin key
    const utilPath = path.join(process.cwd(), 'src/lib/divination/liuyao-format-utils.ts');
    const utilContent = fs.readFileSync(utilPath, 'utf8');
    assert.equal(utilContent.includes('new Set('), true);
    assert.equal(utilContent.includes('return `${position}:${liuQin}`;'), true);
    assert.equal(utilContent.includes('yongShenMarkers?.has(`${y.position}:${y.liuQin}`)'), true);
});
