import test from 'node:test';
import assert from 'node:assert/strict';

test('getUserEmailDisplay should keep normal email addresses unchanged', async () => {
  const { getUserEmailDisplay } = await import('../lib/user-email');

  assert.equal(
    getUserEmailDisplay({ email: 'alice@example.com' }),
    'alice@example.com',
  );
});

test('getUserEmailDisplay should replace linuxdo relay email with friendly label', async () => {
  const { getUserEmailDisplay } = await import('../lib/user-email');

  assert.equal(
    getUserEmailDisplay({ email: 'relay-token@privaterelay.linux.do' }),
    'Linux.do 隐私邮箱',
  );
});
