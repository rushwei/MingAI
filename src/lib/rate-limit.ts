/**
 * 基于 Supabase 的分布式速率限制
 * 
 * 支持多实例部署，数据持久化
 */

import { getServiceRoleClient } from '@/lib/api-utils';

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

    try {
        // 注意：rate_limits 表在生产环境有 (identifier, endpoint) 唯一约束，
        // 因此这里只能维护“单行计数 + window_start”的模型。
        const { data: existingRow, error: existingError } = await supabase
            .from('rate_limits')
            .select('id, request_count, window_start')
            .eq('identifier', identifier)
            .eq('endpoint', endpoint)
            .maybeSingle();

        if (existingError) {
            throw existingError;
        }

        const row = existingRow as { id: number; request_count: number | null; window_start: string | null } | null;

        // 无记录：先尝试插入（并处理并发冲突）
        if (!row) {
            const insertPayload = {
                identifier,
                endpoint,
                request_count: 1,
                window_start: now.toISOString(),
            };
            const { error: insertError } = await supabase
                .from('rate_limits')
                .insert(insertPayload);

            if (insertError) {
                // 并发场景：另一个请求已经插入同一 (identifier, endpoint)
                if ((insertError as { code?: string })?.code === '23505') {
                    const { data: retryRow, error: retryError } = await supabase
                        .from('rate_limits')
                        .select('id, request_count, window_start')
                        .eq('identifier', identifier)
                        .eq('endpoint', endpoint)
                        .maybeSingle();
                    if (retryError) throw retryError;
                    if (!retryRow) {
                        // 极端情况：重试仍为空，则放行（fail open）
                        return { allowed: true, remaining: config.maxRequests, resetAt: now };
                    }
                    // 走“已有记录”的逻辑
                    const retry = retryRow as { id: number; request_count: number | null; window_start: string | null };
                    return handleExistingRow(supabase, retry, now, config);
                }
                throw insertError;
            }

            return {
                allowed: true,
                remaining: config.maxRequests - 1,
                resetAt: new Date(now.getTime() + config.windowMs),
            };
        }

        return handleExistingRow(supabase, row, now, config);
    } catch (error) {
        console.error('Rate limit check failed:', error);
        // 出错时允许请求（fail open）
        return { allowed: true, remaining: config.maxRequests, resetAt: now };
    }
}

async function handleExistingRow(
    supabase: ReturnType<typeof getServiceRoleClient>,
    row: { id: number; request_count: number | null; window_start: string | null },
    now: Date,
    config: RateLimitConfig
): Promise<RateLimitResult> {
    const windowStartMs = row.window_start ? new Date(row.window_start).getTime() : 0;
    const nowMs = now.getTime();
    const count = row.request_count ?? 0;
    const windowExpired = !windowStartMs || (nowMs - windowStartMs >= config.windowMs);

    if (windowExpired) {
        const { error: updateError } = await supabase
            .from('rate_limits')
            .update({
                request_count: 1,
                window_start: now.toISOString(),
            })
            .eq('id', row.id);
        if (updateError) throw updateError;

        return {
            allowed: true,
            remaining: config.maxRequests - 1,
            resetAt: new Date(nowMs + config.windowMs),
        };
    }

    const resetAt = new Date(windowStartMs + config.windowMs);
    if (count >= config.maxRequests) {
        return {
            allowed: false,
            remaining: 0,
            resetAt,
        };
    }

    const nextCount = count + 1;
    const { error: updateError } = await supabase
        .from('rate_limits')
        .update({ request_count: nextCount })
        .eq('id', row.id);
    if (updateError) throw updateError;

    return {
        allowed: true,
        remaining: Math.max(0, config.maxRequests - nextCount),
        resetAt,
    };
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
    const candidates = [
        request.headers.get('cf-connecting-ip'),
        request.headers.get('x-vercel-forwarded-for'),
        request.headers.get('x-forwarded-for'),
        request.headers.get('x-real-ip'),
        request.headers.get('x-client-ip'),
    ];
    for (const value of candidates) {
        if (!value) continue;
        return value.split(',')[0].trim();
    }
    return 'unknown';
}
