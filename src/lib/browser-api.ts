import { invalidateLocalCaches, type LocalCacheScope } from '@/lib/cache';

export type BrowserApiError = {
  message: string;
  code?: string;
};

export type BrowserApiPayload<T = unknown> = {
  data: T | null;
  error: BrowserApiError | null;
  count?: number | null;
  status?: number;
  statusText?: string;
};

export function normalizeBrowserApiError(raw: unknown): BrowserApiError | null {
  if (!raw) return null;
  if (typeof raw === 'object' && raw && 'message' in raw) {
    const message = String((raw as { message?: unknown }).message ?? 'Unknown error');
    const code = 'code' in raw ? String((raw as { code?: unknown }).code ?? '') : undefined;
    return code ? { message, code } : { message };
  }
  return { message: String(raw) };
}

function shouldHandleApiWrite(pathname: string, method: string) {
  if (!pathname.startsWith('/api/')) return false;
  if (pathname.startsWith('/api/supabase/')) return false;
  if (pathname.startsWith('/api/chat')) return false;
  if (pathname.startsWith('/api/dify/')) return false;
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
}

function resolveCacheScopesByPath(pathname: string): LocalCacheScope[] {
  if (pathname.startsWith('/api/admin/ai-models')) return ['models'];
  if (pathname.startsWith('/api/knowledge-base')) return ['knowledge_bases', 'data_sources'];
  if (pathname.startsWith('/api/data-sources')) return ['data_sources', 'knowledge_bases'];
  if (pathname.startsWith('/api/records')) return ['data_sources'];
  if (pathname.startsWith('/api/bazi')) return ['data_sources', 'default_bazi_chart'];
  if (
    pathname.startsWith('/api/hepan')
    || pathname.startsWith('/api/liuyao')
    || pathname.startsWith('/api/tarot')
    || pathname.startsWith('/api/face')
    || pathname.startsWith('/api/palm')
    || pathname.startsWith('/api/mbti')
    || pathname.startsWith('/api/ziwei')
    || pathname.startsWith('/api/qimen')
    || pathname.startsWith('/api/daliuren')
  ) {
    return ['data_sources'];
  }
  if (pathname.startsWith('/api/membership')) return ['profile', 'membership', 'level'];
  if (pathname.startsWith('/api/credits')) return ['membership', 'level'];
  if (pathname.startsWith('/api/checkin')) return ['level'];
  if (pathname.startsWith('/api/activation-keys')) return ['profile', 'membership', 'level'];
  if (pathname.startsWith('/api/auth')) return ['profile', 'membership', 'level'];
  if (pathname.startsWith('/api/user/settings')) return ['profile', 'default_bazi_chart'];
  return [];
}

export function dispatchApiWriteEvents(pathname: string, method: string) {
  if (typeof window === 'undefined' || !shouldHandleApiWrite(pathname, method)) {
    return;
  }

  const cacheScopes = resolveCacheScopesByPath(pathname);
  if (cacheScopes.length > 0) {
    invalidateLocalCaches(cacheScopes);
  }

  const table = pathname.startsWith('/api/notifications') ? 'notifications' : undefined;
  window.dispatchEvent(
    new CustomEvent('mingai:api-write', {
      detail: { pathname, method, table, at: Date.now() },
    }),
  );

  if (
    pathname.startsWith('/api/knowledge-base')
    || pathname.startsWith('/api/data-sources')
    || pathname.startsWith('/api/records')
    || pathname.startsWith('/api/community')
    || pathname.startsWith('/api/bazi')
    || pathname.startsWith('/api/hepan')
    || pathname.startsWith('/api/liuyao')
    || pathname.startsWith('/api/tarot')
    || pathname.startsWith('/api/face')
    || pathname.startsWith('/api/palm')
    || pathname.startsWith('/api/mbti')
    || pathname.startsWith('/api/ziwei')
    || pathname.startsWith('/api/qimen')
    || pathname.startsWith('/api/daliuren')
  ) {
    window.dispatchEvent(new CustomEvent('mingai:data-index:invalidate'));
  }

  if (
    pathname.startsWith('/api/membership')
    || pathname.startsWith('/api/credits')
    || pathname.startsWith('/api/checkin')
    || pathname.startsWith('/api/activation-keys')
    || pathname.startsWith('/api/payment-status')
    || pathname.startsWith('/api/auth')
    || pathname.startsWith('/api/user/mcp-key')
    || pathname.startsWith('/api/user/settings')
  ) {
    window.dispatchEvent(new CustomEvent('mingai:user-data:invalidate', { detail: { pathname } }));
  }

  if (pathname.startsWith('/api/admin/ai-models')) {
    window.dispatchEvent(new CustomEvent('mingai:models:invalidate', { detail: { pathname } }));
  }

  if (pathname.startsWith('/api/notifications')) {
    window.dispatchEvent(new CustomEvent('mingai:notifications:invalidate', { detail: { pathname } }));
  }
}

export async function fetchBrowserJson<T>(input: RequestInfo, init?: RequestInit): Promise<{
  ok: boolean;
  status: number;
  result: BrowserApiPayload<T>;
}> {
  try {
    const response = await fetch(input, {
      credentials: 'include',
      headers: {
        ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(init?.headers || {}),
      },
      ...init,
    });

    const payload = await response.json().catch(() => null) as
      | { data?: T | null; error?: unknown; count?: number | null; status?: number; statusText?: string }
      | T
      | null;

    try {
      const method = (
        init?.method
        || (input instanceof Request ? input.method : 'GET')
        || 'GET'
      ).toUpperCase();
      const rawUrl = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      const url = new URL(rawUrl, window.location.origin);
      if (response.ok) {
        dispatchApiWriteEvents(url.pathname, method);
      }
    } catch {
      // ignore client-side invalidation failures
    }

    const hasEnvelope = !!payload
      && typeof payload === 'object'
      && (
        'data' in payload
        || 'error' in payload
        || 'count' in payload
        || 'status' in payload
        || 'statusText' in payload
      );

    const normalizedError = hasEnvelope
      ? normalizeBrowserApiError((payload as { error?: unknown }).error ?? null)
      : (!response.ok ? normalizeBrowserApiError(payload ?? null) : null);
    const resolvedError = !response.ok && !normalizedError
      ? { message: response.statusText || `Request failed (${response.status})` }
      : normalizedError;

    return {
      ok: response.ok,
      status: response.status,
      result: {
        data: (hasEnvelope
          ? ((payload as { data?: T | null }).data ?? null)
          : ((payload ?? null) as T | null)),
        error: resolvedError,
        count: hasEnvelope ? ((payload as { count?: number | null }).count ?? null) : null,
        status: hasEnvelope ? (payload as { status?: number }).status : undefined,
        statusText: hasEnvelope ? (payload as { statusText?: string }).statusText : undefined,
      },
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      result: {
        data: null,
        error: normalizeBrowserApiError(error) || { message: 'Request failed' },
      },
    };
  }
}

export async function requestBrowserJson<T>(url: string, init?: RequestInit): Promise<BrowserApiPayload<T>> {
  const { result } = await fetchBrowserJson<T>(url, init);
  return result;
}
