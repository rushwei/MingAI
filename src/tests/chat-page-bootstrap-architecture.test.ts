import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const chatPagePath = resolve(process.cwd(), 'src/app/chat/page.tsx');

test('chat page should load membership and prompt knowledge bases from bootstrap client', async () => {
  const source = await readFile(chatPagePath, 'utf-8');

  assert.equal(
    source.includes("from '@/lib/chat/use-chat-bootstrap'"),
    true,
    'chat page should import shared chat bootstrap hook'
  );
  assert.equal(
    source.includes('useChatBootstrap({'),
    true,
    'chat page should request a shared bootstrap payload'
  );
  assert.equal(
    source.includes('getMembershipInfo('),
    false,
    'chat page should not fetch membership separately after bootstrap is introduced'
  );
  assert.equal(
    source.includes('getCurrentUserProfileBundle('),
    false,
    'chat page should not derive prompt knowledge bases directly from profile bundle'
  );
});
