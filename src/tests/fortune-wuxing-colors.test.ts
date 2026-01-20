import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const dailyPath = path.join(process.cwd(), 'src/app/daily/page.tsx');
const monthlyPath = path.join(process.cwd(), 'src/app/monthly/page.tsx');
const almanacPath = path.join(process.cwd(), 'src/components/daily/CalendarAlmanac.tsx');

test('daily fortune uses wuxing colors for day stem and branch', () => {
    const content = fs.readFileSync(dailyPath, 'utf8');

    assert.match(content, /getStemElement/);
    assert.match(content, /getBranchElement/);
    assert.match(content, /getElementColor/);
});

test('monthly fortune uses wuxing colors for month stem and branch', () => {
    const content = fs.readFileSync(monthlyPath, 'utf8');

    assert.match(content, /getStemElement/);
    assert.match(content, /getBranchElement/);
    assert.match(content, /getElementColor/);
});

test('calendar almanac uses wuxing colors for gan zhi', () => {
    const content = fs.readFileSync(almanacPath, 'utf8');

    assert.match(content, /getStemElement/);
    assert.match(content, /getBranchElement/);
    assert.match(content, /getElementColor/);
});
