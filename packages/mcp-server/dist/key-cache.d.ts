/**
 * MCP Key 内存验证缓存
 *
 * TTL 5 分钟，避免每次请求都查 DB
 */
export interface CachedKeyInfo {
    userId: string;
    keyId: string;
    cachedAt: number;
}
export declare function getCachedKey(keyCode: string): CachedKeyInfo | null;
export declare function setCachedKey(keyCode: string, info: Omit<CachedKeyInfo, 'cachedAt'>): void;
export declare function invalidateCachedKey(keyCode: string): void;
