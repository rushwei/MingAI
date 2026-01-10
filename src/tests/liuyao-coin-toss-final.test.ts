import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('coin toss shows finalizing text instead of continue button', () => {
    const filePath = path.join(process.cwd(), 'src/components/liuyao/CoinToss.tsx');
    const content = fs.readFileSync(filePath, 'utf8');

    assert.equal(content.includes('生成卦象中'), true);
});
