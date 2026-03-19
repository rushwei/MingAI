// Architecture guard: ensures liuyao route imports from shared core, not local duplicates.
// If this test fails after refactoring, update assertions to match new import paths.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('web liuyao compatibility layer uses @mingai/core package imports', () => {
    const file = fs.readFileSync(path.join(process.cwd(), 'src/lib/divination/liuyao.ts'), 'utf8');

    assert.equal(file.includes('@mingai/core/liuyao-core'), true);
    assert.equal(file.includes('@mingai/core/data/hexagram-data'), true);
    assert.equal(file.includes('@mingai/core/data/shensha-data'), true);
    // 不应再有相对路径引用 dist
    assert.equal(file.includes('packages/core/dist/'), false);
});

test('root scripts keep web dev/build decoupled while test still prebuilds shared core', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')) as {
        scripts?: Record<string, string>;
    };
    const devScript = pkg.scripts?.dev || '';
    const buildScript = pkg.scripts?.build || '';
    const testScript = pkg.scripts?.test || '';

    assert.equal(devScript.includes('pnpm -C packages/core build'), false);
    assert.equal(buildScript.includes('pnpm -C packages/core build'), false);
    assert.equal(testScript.includes('pnpm -C packages/core build'), true);
    assert.equal(testScript.includes('packages/core/tests/*.test.mjs'), true);
});
