import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const execFileAsync = promisify(execFile);
const repoRoot = path.resolve(import.meta.dirname, '..', '..');
const scriptPath = path.join(repoRoot, 'scripts', 'prepare-github-package.mjs');
const coreManifestPath = path.join(repoRoot, 'packages', 'core', 'package.json');

async function runPrintManifest(packageKey) {
  const { stdout } = await execFileAsync(process.execPath, [
    scriptPath,
    '--package',
    packageKey,
    '--print-manifest',
  ], {
    cwd: repoRoot,
  });

  return JSON.parse(stdout);
}

test('prepare-github-package rewrites core metadata for GitHub Packages', async () => {
  const sourceCoreManifest = JSON.parse(await readFile(coreManifestPath, 'utf8'));
  const manifest = await runPrintManifest('core');

  assert.equal(manifest.name, '@hhszzzz/mingai-core');
  assert.equal(manifest.version, sourceCoreManifest.version);
  assert.equal(manifest.publishConfig.registry, 'https://npm.pkg.github.com');
  assert.deepEqual(manifest.repository, {
    type: 'git',
    url: 'https://github.com/hhszzzz/MingAI.git',
  });
});

test('prepare-github-package rewrites workspace dependencies for GitHub Packages', async () => {
  const sourceCoreManifest = JSON.parse(await readFile(coreManifestPath, 'utf8'));
  const manifest = await runPrintManifest('mcp');

  assert.equal(manifest.name, '@hhszzzz/mingai-mcp');
  assert.equal(manifest.dependencies['@hhszzzz/mingai-core'], sourceCoreManifest.version);
  assert.equal(manifest.dependencies['@mingai/core'], undefined);
  assert.equal(manifest.publishConfig.registry, 'https://npm.pkg.github.com');
  assert.deepEqual(manifest.repository, {
    type: 'git',
    url: 'https://github.com/hhszzzz/MingAI.git',
  });
});
