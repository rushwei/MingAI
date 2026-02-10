import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('result page highlights yongshen star only when liuqin matches visible yao', () => {
    const filePath = path.join(process.cwd(), 'src/app/liuyao/result/page.tsx');
    const content = fs.readFileSync(filePath, 'utf8');

    assert.equal(content.includes('line.liuQin === group.selected.liuQin'), true);
});
