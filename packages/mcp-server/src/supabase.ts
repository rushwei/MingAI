/**
 * MCP Server 专用 Supabase 客户端
 *
 * 与 Web 端 src/lib/supabase-server.ts 同模式：
 * anon key + 系统管理员会话 access token → authenticated 角色 → 通过 RLS
 */

import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js';

let serviceClient: SupabaseClient | null = null;
let authClient: SupabaseClient | null = null;

let cachedAccessToken: string | null = null;
let cachedAccessTokenExpiresAt = 0;
let tokenPromise: Promise<string> | null = null;

function getUrl(): string {
  const url = process.env.SUPABASE_URL;
  if (!url) throw new Error('Missing SUPABASE_URL');
  return url;
}

function getAnonKey(): string {
  const key = process.env.SUPABASE_ANON_KEY;
  if (!key) throw new Error('Missing SUPABASE_ANON_KEY');
  return key;
}

function getSystemAuthClient(): SupabaseClient {
  if (authClient) return authClient;
  authClient = createClient(getUrl(), getAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return authClient;
}

function getSystemAdminCredentials(): { email: string; password: string } {
  const email = process.env.SUPABASE_SYSTEM_ADMIN_EMAIL;
  const password = process.env.SUPABASE_SYSTEM_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error('Missing SUPABASE_SYSTEM_ADMIN_EMAIL or SUPABASE_SYSTEM_ADMIN_PASSWORD');
  }

  return { email, password };
}

async function signInSystemAdmin(): Promise<Session> {
  const creds = getSystemAdminCredentials();
  const client = getSystemAuthClient();
  const { data, error } = await client.auth.signInWithPassword({
    email: creds.email,
    password: creds.password,
  });

  if (error || !data.session) {
    throw new Error(`Failed to sign in system admin: ${error?.message ?? 'unknown error'}`);
  }

  return data.session;
}

async function getSystemAccessToken(): Promise<string> {
  const now = Date.now();
  if (cachedAccessToken && cachedAccessTokenExpiresAt - now > 60_000) {
    return cachedAccessToken;
  }

  if (tokenPromise) return tokenPromise;

  tokenPromise = (async () => {
    const session = await signInSystemAdmin();
    cachedAccessToken = session.access_token;
    cachedAccessTokenExpiresAt = (session.expires_at ?? Math.floor(now / 1000) + 3000) * 1000;
    return cachedAccessToken;
  })();

  try {
    return await tokenPromise;
  } finally {
    tokenPromise = null;
  }
}

/**
 * 获取纯 anon 客户端（无 accessToken），用于 auth.signInWithPassword 等认证操作。
 * 配置了 accessToken 的客户端会禁止调用 auth.* 方法。
 */
export function getSupabaseAuthClient(): SupabaseClient {
  return getSystemAuthClient();
}

/**
 * 获取 MCP Server 专用 Supabase 客户端（系统管理员会话）
 *
 * 使用 anon key + accessToken 回调，按需获取系统管理员 token。
 * 身份为 authenticated 角色，可通过 RLS 策略。
 */
export function getSupabaseClient(): SupabaseClient {
  if (serviceClient) return serviceClient;

  serviceClient = createClient(getUrl(), getAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    accessToken: async () => getSystemAccessToken(),
  });

  return serviceClient;
}
