import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const mentionConstantsPath = resolve(process.cwd(), 'src/components/chat/mention/mention-constants.tsx');

test('MentionPopover module should keep qimen and daliuren icons available', async () => {
  const source = await readFile(mentionConstantsPath, 'utf-8');
  const importMatches = source.match(/from 'lucide-react';/g) || [];

  assert.ok(importMatches.length >= 1, 'mention-constants should import from lucide-react');
  assert.match(source, /BookOpen/u, 'mention-constants should import the daliuren icon');
  assert.match(source, /Compass/u, 'mention-constants should import the qimen icon');
});

test('MentionPopover constants should expose qimen and daliuren labels and icons', async () => {
  const source = await readFile(mentionConstantsPath, 'utf-8');

  assert.match(source, /qimen_chart:\s*'奇门遁甲'/u);
  assert.match(source, /daliuren_divination:\s*'大六壬'/u);
  assert.match(source, /qimen_chart:\s*<Compass className="w-4 h-4"\s*\/>/u);
  assert.match(source, /daliuren_divination:\s*<BookOpen className="w-4 h-4"\s*\/>/u);
});
