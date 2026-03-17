import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const mentionPopoverPath = resolve(process.cwd(), 'src/components/chat/MentionPopover.tsx');

test('MentionPopover should keep a single lucide-react import that includes qimen and daliuren icons', async () => {
  const source = await readFile(mentionPopoverPath, 'utf-8');
  const importMatches = source.match(/from 'lucide-react';/g) || [];

  assert.equal(importMatches.length, 1, 'MentionPopover should not contain duplicate lucide-react imports');
  assert.match(source, /BookOpen/u, 'MentionPopover should import the daliuren icon');
  assert.match(source, /Compass/u, 'MentionPopover should import the qimen icon');
});

test('MentionPopover should expose qimen and daliuren labels and icons with valid object entries', async () => {
  const source = await readFile(mentionPopoverPath, 'utf-8');

  assert.match(source, /qimen_chart:\s*'奇门遁甲',/u);
  assert.match(source, /daliuren_divination:\s*'大六壬'/u);
  assert.match(source, /qimen_chart:\s*<Compass className="w-4 h-4"\s*\/>,/u);
  assert.match(source, /daliuren_divination:\s*<BookOpen className="w-4 h-4"\s*\/>/u);
});
