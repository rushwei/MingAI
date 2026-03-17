import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('web liuyao compatibility layer uses @mingai/mcp-core package imports', () => {
    const file = fs.readFileSync(path.join(process.cwd(), 'src/lib/divination/liuyao.ts'), 'utf8');

    assert.equal(file.includes('@mingai/mcp-core/liuyao-core'), true);
    assert.equal(file.includes('@mingai/mcp-core/data/hexagram-data'), true);
    assert.equal(file.includes('@mingai/mcp-core/data/shensha-data'), true);
    // 不应再有相对路径引用 dist
    assert.equal(file.includes('packages/mcp-core/dist/'), false);
});

test('root scripts keep web dev/build decoupled while test still prebuilds shared core', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8')) as {
        scripts?: Record<string, string>;
    };
    const devScript = pkg.scripts?.dev || '';
    const buildScript = pkg.scripts?.build || '';
    const testScript = pkg.scripts?.test || '';

    assert.equal(devScript.includes('pnpm -C packages/mcp-core build'), false);
    assert.equal(buildScript.includes('pnpm -C packages/mcp-core build'), false);
    assert.equal(testScript.includes('pnpm -C packages/mcp-core build'), true);
    assert.equal(testScript.includes('packages/mcp-core/tests/*.test.mjs'), true);
});
