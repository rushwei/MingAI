import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('liuyao textual outputs should not expose rank score wording', () => {
    const files = [
        'src/app/api/liuyao/route.ts',
        'src/app/liuyao/result/page.tsx',
        'src/lib/data-sources/liuyao.ts',
    ];

    for (const file of files) {
        const content = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
        assert.equal(/rank=|rankScore|排序分/u.test(content), false, `${file} should not expose score wording`);
    }
});
