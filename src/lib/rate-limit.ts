/**
 * 基于 Supabase 的分布式速率限制
 * 
 * 支持多实例部署，数据持久化
 */

import { getServiceRoleClient } from './api-utils';

// 尝试获取服务端客户端，失败返回null
const getServiceClientSafe = () => {
    try {
        return getServiceRoleClient();
    } catch {
        return null;
    }
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

export function resolveRateLimitResetAt(
    rows: Array<{ window_start: string | Date }>,
    windowMs: number
): Date {
    if (rows.length === 0) return new Date();
    let earliest = Infinity;
    for (const row of rows) {
        const ts = new Date(row.window_start).getTime();
        if (!Number.isNaN(ts) && ts < earliest) {
            earliest = ts;
        }
    }
    const base = earliest === Infinity ? Date.now() : earliest;
    return new Date(base + windowMs);
}

/**
 * 检查并更新速率限制
 */
export async function checkRateLimit(
    identifier: string,
    endpoint: string,
    config: RateLimitConfig
): Promise<RateLimitResult> {
    const supabase = getServiceClientSafe();

    // 如果没有 Supabase 配置，回退到内存限制（开发环境）
    if (!supabase) {
        return memoryRateLimit(identifier, endpoint, config);
    }

    const now = new Date();
    const windowStart = new Date(now.getTime() - config.windowMs);

    try {
        // 查询当前窗口内的请求记录
        const { data: existingRows, error: existingError } = await supabase
            .from('rate_limits')
            .select('id, request_count, window_start')
            .eq('identifier', identifier)
            .eq('endpoint', endpoint)
            .gte('window_start', windowStart.toISOString())
            .order('window_start', { ascending: false })
            .limit(config.maxRequests + 5);

        if (existingError) {
            throw existingError;
        }

        const rows = (existingRows || []) as Array<{ id: number; request_count: number; window_start: string }>;
        const totalCount = rows.reduce((sum, row) => sum + (row.request_count || 0), 0);
        const latest = rows[0];
        const resetAt = resolveRateLimitResetAt(rows, config.windowMs);

        if (latest) {
            // 已有记录，检查是否超限
            if (totalCount >= config.maxRequests) {
                return {
                    allowed: false,
                    remaining: 0,
                    resetAt,
                };
            }

            // 增加计数
            const { error: updateError } = await supabase
                .from('rate_limits')
                .update({ request_count: latest.request_count + 1 })
                .eq('id', latest.id);
            if (updateError) {
                throw updateError;
            }

            return {
                allowed: true,
                remaining: config.maxRequests - totalCount - 1,
                resetAt,
            };
        } else {
            // 新记录
            const { error: insertError } = await supabase
                .from('rate_limits')
                .insert({
                    identifier,
                    endpoint,
                    request_count: 1,
                    window_start: now.toISOString(),
                });
            if (insertError) {
                throw insertError;
            }

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
    const vercelId = request.headers.get('x-vercel-id');
    const forwarded = vercelId
        ? (request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for'))
        : null;
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    return request.headers.get('x-real-ip') || 'unknown';
}
