import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('liuyao result uses MarkdownContent for interpretation', () => {
    const filePath = path.join(process.cwd(), 'src/app/liuyao/result/page.tsx');
    const content = fs.readFileSync(filePath, 'utf8');

    assert.equal(content.includes('MarkdownContent'), true);
    assert.equal(content.includes('<MarkdownContent'), true);
});
