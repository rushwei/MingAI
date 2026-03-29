/**
 * Session cookie 共享工具
 *
 * 从 /api/auth/route.ts 提取，供 OAuth 回调等场景复用
 */
import { NextResponse } from 'next/server';
import type { Session, User } from '@supabase/supabase-js';

export const ACCESS_COOKIE = 'sb-access-token';
export const REFRESH_COOKIE = 'sb-refresh-token';

type SessionCookieWriter = {
  set: (name: string, value: string, options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax';
    path: string;
    maxAge: number;
  }) => unknown;
  delete: (name: string) => unknown;
};

export function buildSessionFromUser(
  user: User,
  accessToken: string,
  refreshToken: string,
): Session {
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: expiresAt,
    user,
  };
}

type AuthSessionResolverClient = {
  auth: {
    getUser: (accessToken: string) => Promise<{
      data: { user: User | null };
      error: unknown;
    }>;
    refreshSession: (tokens: { refresh_token: string }) => Promise<{
      data: { session: Session | null };
      error: unknown;
    }>;
  };
};

export async function resolveSessionFromTokens(
  client: AuthSessionResolverClient,
  tokens: {
    accessToken?: string | null;
    refreshToken?: string | null;
  },
): Promise<{ session: Session | null; refreshed: boolean }> {
  const accessToken = tokens.accessToken || null;
  const refreshToken = tokens.refreshToken || null;

  if (accessToken) {
    const { data, error } = await client.auth.getUser(accessToken);
    if (!error && data.user) {
      return {
        session: buildSessionFromUser(data.user, accessToken, refreshToken || ''),
        refreshed: false,
      };
    }
  }

  if (refreshToken) {
    const { data, error } = await client.auth.refreshSession({
      refresh_token: refreshToken,
    });
    if (!error && data.session) {
      return {
        session: data.session,
        refreshed: true,
      };
    }
  }

  return { session: null, refreshed: false };
}

function applySessionCookies(writer: SessionCookieWriter, session: Session | null) {
  const secure = process.env.NODE_ENV === 'production';

  if (!session) {
    writer.delete(ACCESS_COOKIE);
    writer.delete(REFRESH_COOKIE);
    return;
  }

  writer.set(ACCESS_COOKIE, session.access_token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.max(60, session.expires_in ?? 3600),
  });
  writer.set(REFRESH_COOKIE, session.refresh_token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export function writeSessionCookies(cookieStore: SessionCookieWriter, session: Session | null) {
  applySessionCookies(cookieStore, session);
}

export function setSessionCookies(response: NextResponse, session: Session | null) {
  applySessionCookies(response.cookies, session);
}
