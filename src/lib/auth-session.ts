/**
 * Session cookie 共享工具
 *
 * 从 /api/auth/route.ts 提取，供 OAuth 回调等场景复用
 */
import { NextResponse } from 'next/server';
import type { Session, User } from '@supabase/supabase-js';

export const ACCESS_COOKIE = 'sb-access-token';
export const REFRESH_COOKIE = 'sb-refresh-token';

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

export function setSessionCookies(response: NextResponse, session: Session | null) {
  const secure = process.env.NODE_ENV === 'production';

  if (!session) {
    response.cookies.delete(ACCESS_COOKIE);
    response.cookies.delete(REFRESH_COOKIE);
    return;
  }

  response.cookies.set(ACCESS_COOKIE, session.access_token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: Math.max(60, session.expires_in ?? 3600),
  });
  response.cookies.set(REFRESH_COOKIE, session.refresh_token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}
