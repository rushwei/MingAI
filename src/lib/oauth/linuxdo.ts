/**
 * Linux DO Connect OAuth2 协议封装
 *
 * 支持 PKCE (S256)、授权码流程、token 交换、userinfo 获取
 */
import { createHmac, randomBytes, createHash } from 'crypto';

const AUTHORIZE_URL = 'https://connect.linux.do/oauth2/authorize';
const TOKEN_URL = 'https://connect.linux.do/oauth2/token';
const USERINFO_URL = 'https://connect.linux.do/api/user';

function getClientId(): string {
  const v = process.env.LINUXDO_CLIENT_ID;
  if (!v) throw new Error('LINUXDO_CLIENT_ID is not set');
  return v;
}

function getClientSecret(): string {
  const v = process.env.LINUXDO_CLIENT_SECRET;
  if (!v) throw new Error('LINUXDO_CLIENT_SECRET is not set');
  return v;
}

// --- PKCE helpers ---

function base64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = base64url(randomBytes(32));
  const codeChallenge = base64url(createHash('sha256').update(codeVerifier).digest());
  return { codeVerifier, codeChallenge };
}

export function generateState(): string {
  return randomBytes(32).toString('hex');
}

// --- URL builder ---

export function buildAuthUrl(state: string, codeChallenge: string, redirectUri: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: getClientId(),
    redirect_uri: redirectUri,
    scope: 'openid profile email',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `${AUTHORIZE_URL}?${params.toString()}`;
}

// --- Token exchange ---

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  id_token?: string;
  refresh_token?: string;
}

export async function exchangeCode(code: string, codeVerifier: string, redirectUri: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: getClientId(),
    client_secret: getClientSecret(),
    code_verifier: codeVerifier,
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<TokenResponse>;
}

// --- UserInfo ---

export interface LinuxDoUser {
  sub: string;
  preferred_username: string;
  name: string;
  email: string;
  email_verified: boolean;
  groups?: string[];
  picture?: string;
}

export async function fetchUserInfo(accessToken: string): Promise<LinuxDoUser> {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`UserInfo request failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<LinuxDoUser>;
}

// --- Deterministic password ---

export function generateDeterministicPassword(sub: string): string {
  return createHmac('sha256', getClientSecret())
    .update(`linuxdo:${sub}`)
    .digest('hex');
}
