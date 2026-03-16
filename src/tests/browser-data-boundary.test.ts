import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOTS = [
  path.join(process.cwd(), 'src/app'),
  path.join(process.cwd(), 'src/components'),
];

function walk(dir: string, files: string[] = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }
    if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
      files.push(fullPath);
    }
  }
  return files;
}

test('page and component layers should not call supabase.from or supabase.rpc directly', () => {
  const offenders: string[] = [];

  for (const root of ROOTS) {
    for (const file of walk(root)) {
      if (file.includes(`${path.sep}api${path.sep}`)) continue;
      const content = fs.readFileSync(file, 'utf8');
      if (/supabase\.(from|rpc)\(/.test(content)) {
        offenders.push(path.relative(process.cwd(), file));
      }
    }
  }

  assert.deepEqual(offenders, []);
});
