import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('mbti intro modal is rendered after start click', () => {
    const filePath = path.join(process.cwd(), 'src/app/mbti/page.tsx');
    const content = fs.readFileSync(filePath, 'utf8');

    assert.equal(content.includes('data-role=\"mbti-intro-modal\"'), true);
});
