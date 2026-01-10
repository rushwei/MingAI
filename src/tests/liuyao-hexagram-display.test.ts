import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('hexagram display provides aligned base and changed containers', () => {
    const filePath = path.join(process.cwd(), 'src/components/liuyao/HexagramDisplay.tsx');
    const content = fs.readFileSync(filePath, 'utf8');

    assert.equal(content.includes('data-hexagram=\"base\"'), true);
    assert.equal(content.includes('data-hexagram=\"changed\"'), true);
});
