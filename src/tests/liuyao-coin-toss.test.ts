import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('coin toss completed line does not add extra flex gap', () => {
    const filePath = path.join(process.cwd(), 'src/components/liuyao/CoinToss.tsx');
    const content = fs.readFileSync(filePath, 'utf8');

    assert.equal(content.includes('flex items-center gap-1'), false);
});
