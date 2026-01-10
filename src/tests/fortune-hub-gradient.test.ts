import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('fortune hub today block does not use gradient background', () => {
    const filePath = path.join(process.cwd(), 'src/app/fortune-hub/page.tsx');
    const content = fs.readFileSync(filePath, 'utf8');

    assert.equal(content.includes('bg-gradient-to-r'), false);
});
