import test from 'node:test';
import assert from 'node:assert/strict';

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
    getLinuxDoAuthErrorMessage('signup_requires_admin_key'),
    'Linux.do 登录失败：站点缺少 Supabase 管理密钥配置，请联系管理员处理'
  );
  assert.equal(
    getLinuxDoAuthErrorMessage('provider_sync_failed'),
    'Linux.do 登录失败：账号绑定同步失败，请稍后重试'
  );
  assert.equal(
    getLinuxDoAuthErrorMessage('unknown_code'),
    null
  );
});
