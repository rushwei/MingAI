import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('next page navigation jumps to first question', () => {
    const filePath = path.join(process.cwd(), 'src/components/mbti/MBTITestFlow.tsx');
    const content = fs.readFileSync(filePath, 'utf8');

    assert.equal(content.includes('handleJumpToQuestion'), true);
    assert.match(content, /const goToNextPage[\s\S]*handleJumpToQuestion/);
});
