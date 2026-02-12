/**
 * MCP Key 内存验证缓存
 *
 * TTL 5 分钟，避免每次请求都查 DB
 */
const KEY_CACHE_TTL = 5 * 60 * 1000; // 5 分钟
const cache = new Map();
export function getCachedKey(keyCode) {
    const entry = cache.get(keyCode);
    if (!entry)
        return null;
    if (Date.now() - entry.cachedAt > KEY_CACHE_TTL) {
        cache.delete(keyCode);
        return null;
    }
    return entry;
}
export function setCachedKey(keyCode, info) {
    cache.set(keyCode, { ...info, cachedAt: Date.now() });
}
export function invalidateCachedKey(keyCode) {
    cache.delete(keyCode);
}
// 定期清理过期缓存
const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of cache) {
        if (now - entry.cachedAt > KEY_CACHE_TTL) {
            cache.delete(key);
        }
    }
}, 60 * 1000);
cleanupTimer.unref?.();
