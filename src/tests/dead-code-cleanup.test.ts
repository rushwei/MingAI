import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const REMOVED_FILES = [
  'src/components/bazi/form/BasicInfoSection.tsx',
  'src/components/bazi/form/PillarsInput.tsx',
  'src/components/chat/PersonalityCard.tsx',
  'src/components/membership/PayPerUse.tsx',
  'src/components/membership/PaymentModal.tsx',
  'src/components/notification/index.ts',
  'src/components/notification/NotificationBell.tsx',
  'src/components/notification/NotificationDropdown.tsx',
  'src/components/tarot/TarotShareCard.tsx',
  'src/lib/ai/streaming-utils.ts',
  'src/lib/api-route-handler.ts',
  'src/lib/divination/liuyao-shensha.ts',
  'src/lib/divination/shensha-tables.ts',
  'src/lib/divination/ziwei-to-text.ts',
  'src/lib/format-utils.ts',
  'src/lib/hooks/useShareCard.ts',
  'src/lib/knowledge-base/archive-status.ts',
  'src/lib/knowledge-base/index.ts',
  'src/lib/supabase.ts',
  'src/lib/user/charts.ts',
] as const;

test('dead-code cleanup should remove verified zero-reference modules', () => {
  for (const filePath of REMOVED_FILES) {
    assert.equal(
      existsSync(resolve(process.cwd(), filePath)),
      false,
      `${filePath} should be removed once it has no runtime imports`,
    );
  }
});

test('dead-code cleanup should remove the resend dependency and env variables', async () => {
  const [pkg, envExample] = await Promise.all([
    readFile(resolve(process.cwd(), 'package.json'), 'utf-8'),
    readFile(resolve(process.cwd(), '.env.example'), 'utf-8'),
  ]);

  assert.doesNotMatch(pkg, /"resend"\s*:/u);
  assert.doesNotMatch(envExample, /^RESEND_API_KEY=/mu);
  assert.doesNotMatch(envExample, /^RESEND_FROM=/mu);
});

test('tarot result page should not keep the removed share-card dead block', async () => {
  const source = await readFile(resolve(process.cwd(), 'src/app/tarot/result/page.tsx'), 'utf-8');

  assert.doesNotMatch(source, /TarotShareCard/u);
  assert.doesNotMatch(source, /珍藏与分享/u);
});

test('credit purchase route should not keep comments tied to removed pay-per-use component files', async () => {
  const source = await readFile(resolve(process.cwd(), 'src/app/api/membership/purchase-credits/route.ts'), 'utf-8');

  assert.doesNotMatch(source, /PayPerUse\.tsx/u);
});
