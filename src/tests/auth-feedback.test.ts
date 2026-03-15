import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const clientProvidersPath = resolve(process.cwd(), 'src/components/providers/ClientProviders.tsx');

test('linuxdo auth error mapper should translate known callback errors into user-facing messages', async () => {
  const { getLinuxDoAuthErrorMessage } = await import('../lib/auth-feedback');

  assert.equal(
    getLinuxDoAuthErrorMessage('oauth_denied'),
    'Linux.do 登录已取消，请重试'
  );
  assert.equal(
    getLinuxDoAuthErrorMessage('token_exchange_failed'),
    'Linux.do 登录失败：授权令牌获取失败，请稍后重试'
  );
  assert.equal(
    getLinuxDoAuthErrorMessage('state_mismatch'),
    'Linux.do 登录失败：登录状态已过期，请重新发起登录'
  );
  assert.equal(
    getLinuxDoAuthErrorMessage('unknown_code'),
    null
  );
});

test('client providers should surface linuxdo auth callback errors through toast and clear the error param', async () => {
  const source = await readFile(clientProvidersPath, 'utf-8');

  assert.ok(
    source.includes('getLinuxDoAuthErrorMessage'),
    'client providers should use shared auth error message mapper'
  );
  assert.ok(
    source.includes("url.searchParams.get('error')"),
    'client providers should inspect auth callback error query param'
  );
  assert.ok(
    source.includes("showToast('error'"),
    'client providers should display auth callback failures with toast'
  );
  assert.ok(
    source.includes("url.searchParams.delete('error')"),
    'client providers should clear handled auth error query param'
  );
  assert.ok(
    source.includes('window.history.replaceState'),
    'client providers should rewrite URL after handling auth callback error'
  );
});
