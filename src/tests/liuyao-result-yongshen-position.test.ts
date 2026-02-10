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
    const filePath = path.join(process.cwd(), 'src/app/liuyao/result/page.tsx');
    const content = fs.readFileSync(filePath, 'utf8');

    assert.equal(content.includes('const yongShenMarkers = new Set('), true);
    assert.equal(content.includes('return `${position}:${liuQin}`;'), true);
    assert.equal(content.includes("yongShenMarkers.has(`${y.position}:${y.liuQin}`)"), true);
    assert.equal(content.includes('const yongShenPositions = new Set('), false);
});
