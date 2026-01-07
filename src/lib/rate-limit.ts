/**
 * 基于 Supabase 的分布式速率限制
 * 
 * 支持多实例部署，数据持久化
 */

import { createClient } from '@supabase/supabase-js';

const getServiceClient = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
        return null;
    }

    return createClient(url, serviceKey, {
        auth: { persistSession: false }
    });
};

interface RateLimitConfig {
    maxRequests: number;  // 最大请求数
    windowMs: number;     // 时间窗口（毫秒）
}

interface RateLimitResult {
    allowed: boolean;
    remaining: number;
    resetAt: Date;
}

/**
 * 检查并更新速率限制
 */
export async function checkRateLimit(
    identifier: string,
    endpoint: string,
    config: RateLimitConfig
): Promise<RateLimitResult> {
    const supabase = getServiceClient();

    // 如果没有 Supabase 配置，回退到内存限制（开发环境）
    if (!supabase) {
        return memoryRateLimit(identifier, endpoint, config);
    }

    const now = new Date();
    const windowStart = new Date(now.getTime() - config.windowMs);

    try {
        // 查询当前窗口内的请求记录
        const { data: existing } = await supabase
            .from('rate_limits')
            .select('id, request_count, window_start')
            .eq('identifier', identifier)
            .eq('endpoint', endpoint)
            .gte('window_start', windowStart.toISOString())
            .order('window_start', { ascending: false })
            .limit(1)
            .single();

        if (existing) {
            // 已有记录，检查是否超限
            if (existing.request_count >= config.maxRequests) {
                const resetAt = new Date(new Date(existing.window_start).getTime() + config.windowMs);
                return {
                    allowed: false,
                    remaining: 0,
                    resetAt,
                };
            }

            // 增加计数
            await supabase
                .from('rate_limits')
                .update({ request_count: existing.request_count + 1 })
                .eq('id', existing.id);

            return {
                allowed: true,
                remaining: config.maxRequests - existing.request_count - 1,
                resetAt: new Date(new Date(existing.window_start).getTime() + config.windowMs),
            };
        } else {
            // 新记录
            await supabase
                .from('rate_limits')
                .upsert({
                    identifier,
                    endpoint,
                    request_count: 1,
                    window_start: now.toISOString(),
                }, {
                    onConflict: 'identifier,endpoint',
                });

            return {
                allowed: true,
                remaining: config.maxRequests - 1,
                resetAt: new Date(now.getTime() + config.windowMs),
            };
        }
    } catch (error) {
        console.error('Rate limit check failed:', error);
        // 出错时允许请求（fail open）
        return { allowed: true, remaining: config.maxRequests, resetAt: now };
    }
}

// 内存速率限制（开发环境备用）
const memoryLimits = new Map<string, { count: number; resetAt: number }>();

function memoryRateLimit(
    identifier: string,
    endpoint: string,
    config: RateLimitConfig
): RateLimitResult {
    const key = `${endpoint}:${identifier}`;
    const now = Date.now();
    const record = memoryLimits.get(key);

    if (!record || now > record.resetAt) {
        memoryLimits.set(key, { count: 1, resetAt: now + config.windowMs });
        return {
            allowed: true,
            remaining: config.maxRequests - 1,
            resetAt: new Date(now + config.windowMs),
        };
    }

    if (record.count >= config.maxRequests) {
        return {
            allowed: false,
            remaining: 0,
            resetAt: new Date(record.resetAt),
        };
    }

    record.count++;
    return {
        allowed: true,
        remaining: config.maxRequests - record.count,
        resetAt: new Date(record.resetAt),
    };
}

/**
 * 获取客户端 IP
 */
export function getClientIP(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return request.headers.get('x-real-ip') || 'unknown';
}
