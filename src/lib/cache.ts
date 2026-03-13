type CacheEntry<T> = {
    value: T;
    expiresAt: number;
};

export function createMemoryCache<T>(defaultTtlMs: number, maxSize: number = 1000) {
    const store = new Map<string, CacheEntry<T>>();

    const evictOldest = () => {
        let toDelete = store.size - maxSize;
        if (toDelete <= 0) return;
        for (const key of store.keys()) {
            if (toDelete <= 0) break;
            store.delete(key);
            toDelete--;
        }
    };

    const get = (key: string): T | null => {
        const entry = store.get(key);
        if (!entry) return null;
        if (entry.expiresAt <= Date.now()) {
            store.delete(key);
            return null;
        }
        return entry.value;
    };

    const set = (key: string, value: T, ttlMs: number = defaultTtlMs) => {
        store.set(key, { value, expiresAt: Date.now() + ttlMs });
        if (store.size > maxSize) {
            evictOldest();
        }
    };

    const remove = (key: string) => {
        store.delete(key);
    };

    const clear = () => {
        store.clear();
    };

    const cleanup = () => {
        const now = Date.now();
        for (const [key, entry] of store) {
            if (entry.expiresAt <= now) {
                store.delete(key);
            }
        }
    };

    return { get, set, remove, clear, cleanup };
}

export function createSingleFlight<T>() {
    const inflight = new Map<string, Promise<T>>();

    const run = (key: string, task: () => Promise<T>) => {
        if (inflight.has(key)) {
            return inflight.get(key)!;
        }
        const promise = task().finally(() => {
            inflight.delete(key);
        });
        inflight.set(key, promise);
        return promise;
    };

    const clear = (key?: string) => {
        if (!key) {
            inflight.clear();
            return;
        }
        inflight.delete(key);
    };

    return { run, clear };
}

type LocalCachePayload<T> = {
    value: T;
    cachedAt: number;
};

export function readLocalCache<T>(key: string, maxAgeMs: number): T | null {
    if (typeof window === 'undefined') return null;
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    try {
        const parsed = JSON.parse(raw) as LocalCachePayload<T> | { ts?: number; value?: T } | T;
        if (typeof parsed === 'object' && parsed !== null) {
            if ('cachedAt' in parsed && 'value' in parsed) {
                const payload = parsed as LocalCachePayload<T>;
                if (!payload.cachedAt || Date.now() - payload.cachedAt > maxAgeMs) {
                    return null;
                }
                return payload.value;
            }
            if ('ts' in parsed && 'value' in parsed) {
                const legacyPayload = parsed as { ts?: number; value?: T };
                if (!legacyPayload.ts || Date.now() - legacyPayload.ts > maxAgeMs) {
                    return null;
                }
                return legacyPayload.value ?? null;
            }
        }
        return parsed as T;
    } catch {
        return null;
    }
}

export function writeLocalCache<T>(key: string, value: T) {
    if (typeof window === 'undefined') return;
    const payload: LocalCachePayload<T> = { value, cachedAt: Date.now() };
    window.localStorage.setItem(key, JSON.stringify(payload));
}

export function removeLocalCache(key: string) {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(key);
}

export function removeLocalCacheByPrefix(prefix: string) {
    if (typeof window === 'undefined') return;
    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(prefix)) {
            keys.push(key);
        }
    }
    for (const key of keys) {
        window.localStorage.removeItem(key);
    }
}

export type LocalCacheScope =
    | 'profile'
    | 'membership'
    | 'level'
    | 'models'
    | 'data_sources'
    | 'knowledge_bases'
    | 'sidebar_config'
    | 'default_bazi_chart';

const CACHE_SCOPE_PREFIXES: Record<Exclude<LocalCacheScope, 'default_bazi_chart'>, string> = {
    profile: 'mingai.profile.',
    membership: 'mingai.membership.',
    level: 'mingai.level.',
    models: 'mingai.models.',
    data_sources: 'mingai.data_sources.',
    knowledge_bases: 'mingai.knowledge_bases.',
    sidebar_config: 'mingai.sidebar_config.',
};

const CACHE_SCOPE_KEYS: Record<'default_bazi_chart', string[]> = {
    default_bazi_chart: ['mingai.pref.defaultBaziChartId', 'defaultBaziChartId'],
};

export function invalidateLocalCaches(scopes: LocalCacheScope[]) {
    if (typeof window === 'undefined' || scopes.length === 0) return;
    const uniqueScopes = Array.from(new Set(scopes));
    for (const scope of uniqueScopes) {
        if (scope === 'default_bazi_chart') {
            for (const key of CACHE_SCOPE_KEYS.default_bazi_chart) {
                removeLocalCache(key);
            }
            continue;
        }
        removeLocalCacheByPrefix(CACHE_SCOPE_PREFIXES[scope]);
    }
}

export function readSessionJSON<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

export function writeSessionJSON<T>(key: string, value: T) {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(key, JSON.stringify(value));
}

export function updateSessionJSON<T>(key: string, updater: (prev: T | null) => T) {
    const prev = readSessionJSON<T>(key);
    const next = updater(prev);
    writeSessionJSON<T>(key, next);
}
