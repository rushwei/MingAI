/**
 * Linux DO OAuth 回调端点
 *
 * GET /api/auth/linuxdo/callback
 *   → 校验 state → 换 token → 取 userinfo
 *   → 查/创建用户 → 设 session cookie → 302 跳转首页
 */
import { NextRequest, NextResponse } from 'next/server';
import type { Session } from '@supabase/supabase-js';
import {
  exchangeCode,
  fetchUserInfo,
  generateDeterministicPassword,
  type LinuxDoUser,
} from '@/lib/oauth/linuxdo';
import { createAnonClient, getAuthAdminClient, getSystemAdminClient } from '@/lib/api-utils';
import { setSessionCookies } from '@/lib/auth-session';

const OAUTH_STATE_COOKIE = 'linuxdo-oauth-state';

function redirectWithError(origin: string, error: string) {
  const url = new URL('/', origin);
  url.searchParams.set('error', error);
  return NextResponse.redirect(url);
}

function isAlreadyRegisteredError(message: string | undefined) {
  return Boolean(
    message?.includes('already registered')
    || message?.includes('already been registered')
  );
}

function isPublicSignupBlocked(message: string | undefined) {
  const normalized = message?.toLowerCase() ?? '';
  return normalized.includes('email address not authorized')
    || normalized.includes('email address is not authorized');
}

async function signInWithLinuxDoPassword(
  anonClient: ReturnType<typeof createAnonClient>,
  email: string,
  password: string,
) {
  const { data, error } = await anonClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    return null;
  }

  return data.session;
}

function buildLinuxDoUserMetadata(linuxdoUser: LinuxDoUser, nickname: string) {
  return {
    nickname,
    avatar_url: linuxdoUser.picture || null,
    linuxdo_sub: linuxdoUser.sub,
    linuxdo_username: linuxdoUser.preferred_username,
    linuxdo_email: linuxdoUser.email,
  };
}

type AdminAuthClient = NonNullable<ReturnType<typeof getAuthAdminClient>>;
type AdminAuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

function canSyncLinuxDoAuthUser(
  authAdminClient: AdminAuthClient | null,
): authAdminClient is AdminAuthClient & {
  auth: {
    admin: {
      getUserById: (id: string) => Promise<{ data: { user: AdminAuthUser | null }; error: unknown }>;
      updateUserById: (
        id: string,
        payload: Record<string, unknown>,
      ) => Promise<{ data: { user: AdminAuthUser | null }; error: unknown }>;
    };
  };
} {
  return Boolean(
    authAdminClient
    && typeof authAdminClient.auth.admin.getUserById === 'function'
    && typeof authAdminClient.auth.admin.updateUserById === 'function',
  );
}

function canListLinuxDoAuthUsers(
  authAdminClient: AdminAuthClient | null,
): authAdminClient is AdminAuthClient & {
  auth: {
    admin: {
      listUsers: (options?: { page?: number; perPage?: number }) => Promise<{
        data: { users: AdminAuthUser[] };
        error: unknown;
      }>;
      updateUserById: (
        id: string,
        payload: Record<string, unknown>,
      ) => Promise<{ data: { user: AdminAuthUser | null }; error: unknown }>;
    };
  };
} {
  return Boolean(
    authAdminClient
    && typeof authAdminClient.auth.admin.listUsers === 'function'
    && typeof authAdminClient.auth.admin.updateUserById === 'function',
  );
}

async function syncLinuxDoAuthUser(
  authAdminClient: AdminAuthClient,
  userId: string,
  linuxdoUser: LinuxDoUser,
  deterministicPassword: string,
  nickname: string,
  existingMetadata?: Record<string, unknown> | null,
): Promise<AdminAuthUser | null> {
  const { data, error } = await authAdminClient.auth.admin.updateUserById(userId, {
    password: deterministicPassword,
    email_confirm: true,
    user_metadata: {
      ...(existingMetadata ?? {}),
      ...buildLinuxDoUserMetadata(linuxdoUser, nickname),
    },
  });

  if (error || !data.user) {
    console.error('[linuxdo-callback] Auth sync failed:', error);
    return null;
  }

  return data.user as AdminAuthUser;
}

async function findExistingLinuxDoAuthUser(
  authAdminClient: AdminAuthClient,
  linuxdoUser: LinuxDoUser,
): Promise<AdminAuthUser | null> {
  if (!canListLinuxDoAuthUsers(authAdminClient)) {
    return null;
  }

  const perPage = 200;

  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await authAdminClient.auth.admin.listUsers({ page, perPage });
    if (error) {
      console.error('[linuxdo-callback] Auth user lookup failed:', error);
      return null;
    }

    const users = data.users as AdminAuthUser[];
    const matchedUser = users.find((user) => {
      const metadata = user.user_metadata ?? {};
      return metadata.linuxdo_sub === linuxdoUser.sub || user.email === linuxdoUser.email;
    });
    if (matchedUser) {
      return matchedUser;
    }

    if (users.length < perPage) {
      break;
    }
  }

  return null;
}

async function recoverExistingLinuxDoSession(params: {
  authAdminClient: AdminAuthClient;
  anonClient: ReturnType<typeof createAnonClient>;
  linuxdoUser: LinuxDoUser;
  deterministicPassword: string;
  nickname: string;
}): Promise<Session | null> {
  const existingAuthUser = await findExistingLinuxDoAuthUser(params.authAdminClient, params.linuxdoUser);
  if (!existingAuthUser) {
    return null;
  }

  const syncedAuthUser = await syncLinuxDoAuthUser(
    params.authAdminClient,
    existingAuthUser.id,
    params.linuxdoUser,
    params.deterministicPassword,
    params.nickname,
    existingAuthUser.user_metadata,
  );
  const authEmail = syncedAuthUser?.email || existingAuthUser.email;
  if (!authEmail) {
    console.error('[linuxdo-callback] Auth user email missing during recovery');
    return null;
  }

  return signInWithLinuxDoPassword(params.anonClient, authEmail, params.deterministicPassword);
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

  const serviceClient = getSystemAdminClient();

  // 5. 查 user_oauth_providers
  const { data: existingProvider, error: existingProviderError } = await serviceClient
    .from('user_oauth_providers')
    .select('user_id')
    .eq('provider', 'linuxdo')
    .eq('provider_user_id', linuxdoUser.sub)
    .maybeSingle();

  if (existingProviderError) {
    console.error('[linuxdo-callback] Provider lookup failed:', existingProviderError);
    const res = redirectWithError(origin, 'provider_lookup_failed');
    clearCookie(res);
    return res;
  }

  const deterministicPassword = generateDeterministicPassword(linuxdoUser.sub);
  const nickname = linuxdoUser.name || linuxdoUser.preferred_username || '命理爱好者';
  const anonClient = createAnonClient();
  const authAdminClient = getAuthAdminClient();

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

    let authEmail = linuxdoUser.email;
    if (canSyncLinuxDoAuthUser(authAdminClient)) {
      const { data: authUserData, error: authUserError } = await authAdminClient.auth.admin.getUserById(
        existingProvider.user_id,
      );

      if (authUserError || !authUserData.user) {
        console.error('[linuxdo-callback] Bound auth user lookup failed:', authUserError);
        const res = redirectWithError(origin, 'user_not_found');
        clearCookie(res);
        return res;
      }

      const syncedAuthUser = await syncLinuxDoAuthUser(
        authAdminClient,
        existingProvider.user_id,
        linuxdoUser,
        deterministicPassword,
        nickname,
        authUserData.user.user_metadata,
      );
      authEmail = syncedAuthUser?.email || authUserData.user.email || linuxdoUser.email;
    }

    // 用确定性密码登录
    const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
      email: authEmail,
      password: deterministicPassword,
    });

    if (signInError || !signInData.session) {
      console.error('[linuxdo-callback] Sign in failed:', signInError);
      const res = redirectWithError(origin, 'login_failed');
      clearCookie(res);
      return res;
    }

    // 更新 provider 信息（头像、用户名可能变化）
    const { error: providerUpdateError } = await serviceClient
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

    if (providerUpdateError) {
      console.error('[linuxdo-callback] Provider update failed:', providerUpdateError);
      const res = redirectWithError(origin, 'provider_sync_failed');
      clearCookie(res);
      return res;
    }

    const response = NextResponse.redirect(new URL('/', origin));
    setSessionCookies(response, signInData.session);
    clearCookie(response);
    return response;
  }

  // 6. 无记录：新用户流程
  let session: Session | null = null;

  if (authAdminClient) {
    session = await recoverExistingLinuxDoSession({
      authAdminClient,
      anonClient,
      linuxdoUser,
      deterministicPassword,
      nickname,
    });

    if (!session) {
      const { data: createUserData, error: createUserError } = await authAdminClient.auth.admin.createUser({
        email: linuxdoUser.email,
        password: deterministicPassword,
        email_confirm: true,
        user_metadata: buildLinuxDoUserMetadata(linuxdoUser, nickname),
      });

      if (createUserError || !createUserData?.user) {
        console.error('[linuxdo-callback] Admin create user failed:', createUserError);
        if (isAlreadyRegisteredError(createUserError?.message)) {
          const recoveredSession = await recoverExistingLinuxDoSession({
            authAdminClient,
            anonClient,
            linuxdoUser,
            deterministicPassword,
            nickname,
          });
          if (!recoveredSession) {
            const res = redirectWithError(origin, 'email_exists');
            clearCookie(res);
            return res;
          }
          session = recoveredSession;
        } else {
          if (createUserError?.status === 401 || createUserError?.status === 403) {
            const res = redirectWithError(origin, 'signup_requires_admin_key');
            clearCookie(res);
            return res;
          }
          const res = redirectWithError(origin, 'signup_failed');
          clearCookie(res);
          return res;
        }
      }
    }

    if (!session) {
      const recoveredSession = await signInWithLinuxDoPassword(
        anonClient,
        linuxdoUser.email,
        deterministicPassword,
      );
      if (!recoveredSession) {
        console.error('[linuxdo-callback] Post-admin-signup sign in failed');
        const res = redirectWithError(origin, 'login_failed');
        clearCookie(res);
        return res;
      }
      session = recoveredSession;
    }
  } else {
    const { data: signUpData, error: signUpError } = await anonClient.auth.signUp({
      email: linuxdoUser.email,
      password: deterministicPassword,
      options: {
        data: buildLinuxDoUserMetadata(linuxdoUser, nickname),
        emailRedirectTo: undefined,
      },
    });

    if (signUpError) {
      console.error('[linuxdo-callback] SignUp failed:', signUpError);
      if (isAlreadyRegisteredError(signUpError.message)) {
        const recoveredSession = await signInWithLinuxDoPassword(
          anonClient,
          linuxdoUser.email,
          deterministicPassword,
        );
        if (!recoveredSession) {
          const res = redirectWithError(origin, 'email_exists');
          clearCookie(res);
          return res;
        }
        session = recoveredSession;
      } else {
        if (isPublicSignupBlocked(signUpError.message)) {
          const res = redirectWithError(origin, 'signup_requires_admin_key');
          clearCookie(res);
          return res;
        }
        const res = redirectWithError(origin, 'signup_failed');
        clearCookie(res);
        return res;
      }
    }

    session = session ?? signUpData.session;
    if (!session) {
      const recoveredSession = await signInWithLinuxDoPassword(
        anonClient,
        linuxdoUser.email,
        deterministicPassword,
      );
      if (!recoveredSession) {
        console.error('[linuxdo-callback] Post-signup sign in failed');
        const res = redirectWithError(origin, 'login_failed');
        clearCookie(res);
        return res;
      }
      session = recoveredSession;
    }
  }

  const userId = session.user.id;

  // 写 public.users 表（等价 ensureUserRecord）
  await serviceClient.from('users').upsert(
    {
      id: userId,
      nickname,
      avatar_url: linuxdoUser.picture || null,
      membership: 'free',
      ai_chat_count: 3,
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );

  // 写 user_oauth_providers
  const { error: providerInsertError } = await serviceClient.from('user_oauth_providers').insert({
    user_id: userId,
    provider: 'linuxdo',
    provider_user_id: linuxdoUser.sub,
    provider_email: linuxdoUser.email,
    provider_username: linuxdoUser.preferred_username,
    provider_avatar_url: linuxdoUser.picture || null,
    provider_metadata: linuxdoUser as unknown as Record<string, unknown>,
  });

  if (providerInsertError) {
    console.error('[linuxdo-callback] Provider insert failed:', providerInsertError);
    const res = redirectWithError(origin, 'provider_sync_failed');
    clearCookie(res);
    return res;
  }

  const response = NextResponse.redirect(new URL('/', origin));
  setSessionCookies(response, session);
  clearCookie(response);
  return response;
}
