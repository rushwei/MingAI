/**
 * MCP Server 中间件
 */

import type { Request, Response, NextFunction } from 'express';

// 简单内存限流
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 60; // 每分钟请求数
const RATE_WINDOW = 60 * 1000; // 1分钟
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5分钟清理一次

// 定期清理过期记录
let lastCleanup = Date.now();
function cleanupExpiredRecords() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;

  lastCleanup = now;
  for (const [ip, record] of rateLimitMap) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const headerKey = req.headers['x-api-key'];
  const queryKey = req.query.api_key;
  const apiKey = typeof headerKey === 'string' ? headerKey : (typeof queryKey === 'string' ? queryKey : undefined);

  if (!process.env.MCP_API_KEY) {
    return next();
  }

  if (!apiKey || apiKey !== process.env.MCP_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  // 定期清理过期记录
  cleanupExpiredRecords();

  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return next();
  }

  if (record.count >= RATE_LIMIT) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  record.count++;
  next();
}
