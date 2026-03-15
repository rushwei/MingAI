/**
 * Linux DO OAuth 回调端点
 *
 * GET /api/auth/linuxdo/callback
 *   → 校验 state → 换 token → 取 userinfo
 *   → 查/创建用户 → 设 session cookie → 302 跳转首页
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  exchangeCode,
  fetchUserInfo,
  generateDeterministicPassword,
} from '@/lib/oauth/linuxdo';
import { createAnonClient, getServiceRoleClient } from '@/lib/api-utils';
import { setSessionCookies } from '@/lib/auth-session';

const OAUTH_STATE_COOKIE = 'linuxdo-oauth-state';

function redirectWithError(origin: string, error: string) {
  const url = new URL('/', origin);
  url.searchParams.set('error', error);
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const { searchParams } = request.nextUrl;

  // 1. 从 query 取 code / state
  const code = searchParams.get('code');
  const returnedState = searchParams.get('state');
  const oauthError = searchParams.get('error');

  if (oauthError) {
    console.error('[linuxdo-callback] OAuth error:', oauthError);
    return redirectWithError(origin, 'oauth_denied');
  }

  if (!code || !returnedState) {
    return redirectWithError(origin, 'missing_params');
  }

  // 2. 从 cookie 取并校验 state，读 codeVerifier
  const stateCookie = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!stateCookie) {
    return redirectWithError(origin, 'missing_state');
  }

  let savedState: string;
  let codeVerifier: string;
  try {
    const parsed = JSON.parse(stateCookie) as { state: string; codeVerifier: string };
    savedState = parsed.state;
    codeVerifier = parsed.codeVerifier;
  } catch {
    return redirectWithError(origin, 'invalid_state');
  }

  if (returnedState !== savedState) {
    return redirectWithError(origin, 'state_mismatch');
  }

  // 清除 state cookie
  const clearCookie = (res: NextResponse) => {
    res.cookies.delete(OAUTH_STATE_COOKIE);
  };

  // 3. 换 token
  const redirectUri = `${origin}/api/auth/linuxdo/callback`;
  let accessToken: string;
  try {
    const tokenData = await exchangeCode(code, codeVerifier, redirectUri);
    accessToken = tokenData.access_token;
  } catch (err) {
    console.error('[linuxdo-callback] Token exchange failed:', err);
    const res = redirectWithError(origin, 'token_exchange_failed');
    clearCookie(res);
    return res;
  }

  // 4. 取 userinfo
  let linuxdoUser;
  try {
    linuxdoUser = await fetchUserInfo(accessToken);
  } catch (err) {
    console.error('[linuxdo-callback] UserInfo failed:', err);
    const res = redirectWithError(origin, 'userinfo_failed');
    clearCookie(res);
    return res;
  }

  // Linux.do 旧版 userinfo 不一定显式返回 email_verified，仅在明确为 false 时拒绝
  if (linuxdoUser.email_verified === false) {
    const res = redirectWithError(origin, 'email_not_verified');
    clearCookie(res);
    return res;
  }

  const serviceClient = getServiceRoleClient();

  // 5. 查 user_oauth_providers
  const { data: existingProvider } = await serviceClient
    .from('user_oauth_providers')
    .select('user_id')
    .eq('provider', 'linuxdo')
    .eq('provider_user_id', linuxdoUser.sub)
    .maybeSingle();

  const deterministicPassword = generateDeterministicPassword(linuxdoUser.sub);
  const anonClient = createAnonClient();

  if (existingProvider) {
    // 已有记录：直接登录
    const { data: existingUser } = await serviceClient
      .from('users')
      .select('id')
      .eq('id', existingProvider.user_id)
      .maybeSingle();

    if (!existingUser) {
      const res = redirectWithError(origin, 'user_not_found');
      clearCookie(res);
      return res;
    }

    // 用确定性密码登录
    const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
      email: linuxdoUser.email,
      password: deterministicPassword,
    });

    if (signInError || !signInData.session) {
      console.error('[linuxdo-callback] Sign in failed:', signInError);
      const res = redirectWithError(origin, 'login_failed');
      clearCookie(res);
      return res;
    }

    // 更新 provider 信息（头像、用户名可能变化）
    await serviceClient
      .from('user_oauth_providers')
      .update({
        provider_email: linuxdoUser.email,
        provider_username: linuxdoUser.preferred_username,
        provider_avatar_url: linuxdoUser.picture || null,
        provider_metadata: linuxdoUser as unknown as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      })
      .eq('provider', 'linuxdo')
      .eq('provider_user_id', linuxdoUser.sub);

    const response = NextResponse.redirect(new URL('/', origin));
    setSessionCookies(response, signInData.session);
    clearCookie(response);
    return response;
  }

  // 6. 无记录：新用户流程
  // 直接尝试 signUp，如果邮箱已存在会报错（邮箱冲突检测）
  const { data: signUpData, error: signUpError } = await anonClient.auth.signUp({
    email: linuxdoUser.email,
    password: deterministicPassword,
    options: {
      data: {
        nickname: linuxdoUser.name || linuxdoUser.preferred_username || '命理爱好者',
        avatar_url: linuxdoUser.picture || null,
      },
      emailRedirectTo: undefined,
    },
  });

  if (signUpError) {
    console.error('[linuxdo-callback] SignUp failed:', signUpError);
    // 邮箱已被占用
    if (signUpError.message?.includes('already registered') || signUpError.message?.includes('already been registered')) {
      const res = redirectWithError(origin, 'email_exists');
      clearCookie(res);
      return res;
    }
    const res = redirectWithError(origin, 'signup_failed');
    clearCookie(res);
    return res;
  }

  // signUp 可能不返回 session（需要邮箱确认时），此时用 signIn 补偿
  let session = signUpData.session;
  if (!session) {
    // 对于 OAuth 注册的用户，直接用密码登录
    const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
      email: linuxdoUser.email,
      password: deterministicPassword,
    });
    if (signInError || !signInData.session) {
      console.error('[linuxdo-callback] Post-signup sign in failed:', signInError);
      const res = redirectWithError(origin, 'login_failed');
      clearCookie(res);
      return res;
    }
    session = signInData.session;
  }

  const userId = session.user.id;

  // 写 public.users 表（等价 ensureUserRecord）
  await serviceClient.from('users').upsert(
    {
      id: userId,
      nickname: linuxdoUser.name || linuxdoUser.preferred_username || '命理爱好者',
      avatar_url: linuxdoUser.picture || null,
      membership: 'free',
      ai_chat_count: 3,
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );

  // 写 user_oauth_providers
  await serviceClient.from('user_oauth_providers').insert({
    user_id: userId,
    provider: 'linuxdo',
    provider_user_id: linuxdoUser.sub,
    provider_email: linuxdoUser.email,
    provider_username: linuxdoUser.preferred_username,
    provider_avatar_url: linuxdoUser.picture || null,
    provider_metadata: linuxdoUser as unknown as Record<string, unknown>,
  });

  const response = NextResponse.redirect(new URL('/', origin));
  setSessionCookies(response, session);
  clearCookie(response);
  return response;
}
