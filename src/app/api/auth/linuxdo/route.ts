/**
 * Linux DO OAuth 发起端点
 *
 * GET /api/auth/linuxdo → 生成 state + PKCE，存 cookie，302 到 connect.linux.do
 */
import { NextRequest, NextResponse } from 'next/server';
import { generateState, generatePKCE, buildAuthUrl, normalizeLinuxDoReturnTo } from '@/lib/oauth/linuxdo';

const OAUTH_STATE_COOKIE = 'linuxdo-oauth-state';
const CLAIM_INTENT = 'membership-claim';

export async function GET(request: NextRequest) {
  const state = generateState();
  const { codeVerifier, codeChallenge } = generatePKCE();
  const intent = request.nextUrl.searchParams.get('intent');
  const returnTo = normalizeLinuxDoReturnTo(request.nextUrl.searchParams.get('returnTo'));

  const origin = request.nextUrl.origin;
  const redirectUri = `${origin}/api/auth/linuxdo/callback`;
  const authUrl = buildAuthUrl(state, codeChallenge, redirectUri);

  const response = NextResponse.redirect(authUrl);
  const secure = process.env.NODE_ENV === 'production';

  // 将 state + codeVerifier 存入 httpOnly cookie，回调时校验
  response.cookies.set(OAUTH_STATE_COOKIE, JSON.stringify({
    state,
    codeVerifier,
    intent: intent === CLAIM_INTENT ? CLAIM_INTENT : 'login',
    returnTo,
  }), {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 分钟
  });

  return response;
}
