import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const userProfilePath = resolve(process.cwd(), 'src/lib/user/profile.ts');

test('browser user profile contract should keep membership narrowed to MembershipType', async () => {
  const source = await readFile(userProfilePath, 'utf-8');

  assert.match(
    source,
    /import type \{ MembershipType \} from '@\/lib\/user\/membership';/u,
    'user profile contract should reuse the shared MembershipType enum from the membership module',
  );
  assert.match(
    source,
    /membership:\s*MembershipType \| null;/u,
    'user profile membership should stay aligned with the constrained free|plus|pro domain',
  );
});
