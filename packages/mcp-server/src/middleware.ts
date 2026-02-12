/**
 * MCP Server 中间件
 *
 * 挂载顺序：
 * express.json({ limit: '1mb' })
 *   → originValidationMiddleware
 *   → dualAuthMiddleware（OAuth JWT 优先，API Key fallback）
 *   → rateLimitMiddleware（userId 复合键）
 *   → sseConnectionLimitMiddleware（仅 GET）
 */

import type { Request, Response, NextFunction } from 'express';
import type { OAuthTokenVerifier } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import { getSupabaseClient } from './supabase.js';
import { getCachedKey, setCachedKey, invalidateCachedKey } from './key-cache.js';

// 扩展 Express Request 类型
export interface McpAuthInfo {
  userId: string;
  keyId: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      mcpAuth?: McpAuthInfo;
    }
  }
}

// ─── Origin 校验中间件（P0 — DNS rebinding 防护）───

export function originValidationMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.headers.origin;

  // 无 Origin 的非浏览器客户端正常放行
  if (!origin) return next();

  const allowedRaw = process.env.MCP_ALLOWED_ORIGINS;
  if (!allowedRaw) {
    return res.status(403).json({ error: 'Origin allowlist not configured' });
  }

  const allowed = allowedRaw.split(',').map((s) => s.trim()).filter(Boolean);
  if (allowed.length === 0) {
    return res.status(403).json({ error: 'Origin allowlist not configured' });
  }

  if (allowed.includes('*')) {
    return next();
  }

  if (!allowed.includes(origin)) {
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  next();
}

// ─── Host 校验中间件（P0 — DNS rebinding 辅助防护）───

export function hostValidationMiddleware(req: Request, res: Response, next: NextFunction) {
  const host = req.headers.host;
  const allowedRaw = process.env.MCP_ALLOWED_HOSTS;

  if (!allowedRaw) return next();

  const allowed = allowedRaw.split(',').map((s) => s.trim()).filter(Boolean);
  if (allowed.length === 0) return next();

  if (!host || !allowed.includes(host)) {
    return res.status(403).json({ error: 'Host not allowed' });
  }

  next();
}

// ─── Auth 中间件（per-user key 验证）───

function readPositiveIntEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function extractApiKey(req: Request): string | undefined {
  // x-api-key header
  const headerKey = req.headers['x-api-key'];
  if (typeof headerKey === 'string' && headerKey) return headerKey;

  // Authorization: Bearer <key>
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim() || undefined;
  }

  return undefined;
}

async function queryActiveKey(apiKey: string): Promise<{ id: string; user_id: string } | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('mcp_api_keys')
    .select('id, user_id')
    .eq('key_code', apiKey)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

async function touchLastUsedAt(keyId: string): Promise<void> {
  try {
    const supabase = getSupabaseClient();
    await supabase
      .from('mcp_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyId);
  } catch {
    // 审计字段更新失败不影响主流程
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const apiKey = extractApiKey(req);

  if (!apiKey) {
    return res.status(401).json({ error: 'Missing API key' });
  }

  // 查缓存（命中也要回源校验，确保重置/吊销立即生效）
  const cached = getCachedKey(apiKey);

  try {
    const activeKey = await queryActiveKey(apiKey);

    if (!activeKey) {
      if (cached) invalidateCachedKey(apiKey);
      return res.status(401).json({ error: 'Invalid API key' });
    }

    if (!cached || cached.userId !== activeKey.user_id || cached.keyId !== activeKey.id) {
      setCachedKey(apiKey, { userId: activeKey.user_id, keyId: activeKey.id });
    }
    req.mcpAuth = { userId: activeKey.user_id, keyId: activeKey.id };

    // 非阻塞更新 last_used_at
    void touchLastUsedAt(activeKey.id);

    next();
  } catch {
    return res.status(500).json({ error: 'Authentication service error' });
  }
}

// ─── 限流中间件（userId:ip:method 复合键）───

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 120; // 认证用户 120 次/分钟
const RATE_WINDOW = 60 * 1000;
const CLEANUP_INTERVAL = 5 * 60 * 1000;

let lastCleanup = Date.now();
function cleanupExpiredRecords() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, record] of rateLimitMap) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  cleanupExpiredRecords();

  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const userId = req.mcpAuth?.userId || 'anon';
  const method = req.method;
  const path = req.path || req.originalUrl || 'unknown';
  const compositeKey = `${userId}:${ip}:${method}:${path}`;
  const now = Date.now();

  const record = rateLimitMap.get(compositeKey);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(compositeKey, { count: 1, resetTime: now + RATE_WINDOW });
    return next();
  }

  if (record.count >= RATE_LIMIT) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  record.count++;
  next();
}

// ─── SSE 并发限制中间件 ───

const sseConnections = new Map<string, number>();
const MAX_SSE_PER_USER = readPositiveIntEnv('MCP_MAX_SSE_PER_USER', 3);

export function sseConnectionLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  // 仅限制 GET 请求（SSE）
  if (req.method !== 'GET') return next();

  const userId = req.mcpAuth?.userId;
  if (!userId) return next();

  const current = sseConnections.get(userId) || 0;
  if (current >= MAX_SSE_PER_USER) {
    return res.status(429).json({ error: 'Too many SSE connections' });
  }

  sseConnections.set(userId, current + 1);

  res.on('close', () => {
    const count = sseConnections.get(userId) || 1;
    if (count <= 1) {
      sseConnections.delete(userId);
    } else {
      sseConnections.set(userId, count - 1);
    }
  });

  next();
}

// ─── 双模式认证中间件（OAuth JWT 优先，API Key fallback）───

export function dualAuthMiddleware(verifier: OAuthTokenVerifier) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    const apiKeyHeader = req.headers['x-api-key'];

    // 优先：Bearer token → JWT 验证
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      if (token) {
        try {
          const authInfo = await verifier.verifyAccessToken(token);
          const userId = authInfo.extra?.userId as string | undefined;
          if (!userId) {
            return res.status(401).json({ error: 'Invalid token: missing user' });
          }
          req.mcpAuth = { userId, keyId: `oauth:${authInfo.clientId}` };
          return next();
        } catch {
          // Bearer token 存在但无效 → 不 fallback，直接拒绝
          return res.status(401).json({ error: 'Invalid or expired access token' });
        }
      }
    }

    // Fallback：x-api-key header → 旧 API Key 验证
    if (typeof apiKeyHeader === 'string' && apiKeyHeader) {
      return authMiddleware(req, res, next);
    }

    // 无认证信息
    return res.status(401).json({ error: 'Missing authentication' });
  };
}
