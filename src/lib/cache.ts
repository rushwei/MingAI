type CacheEntry<T> = {
    value: T;
    expiresAt: number;
};

export function createMemoryCache<T>(defaultTtlMs: number) {
    const store = new Map<string, CacheEntry<T>>();

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
    };

    const remove = (key: string) => {
        store.delete(key);
    };

    const clear = () => {
        store.clear();
    };

    return { get, set, remove, clear };
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
        const parsed = JSON.parse(raw) as LocalCachePayload<T> | T;
        if (typeof parsed === 'object' && parsed !== null && 'cachedAt' in parsed && 'value' in parsed) {
            const payload = parsed as LocalCachePayload<T>;
            if (!payload.cachedAt || Date.now() - payload.cachedAt > maxAgeMs) {
                return null;
            }
            return payload.value;
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
