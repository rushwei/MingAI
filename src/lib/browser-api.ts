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
      : (!response.ok ? normalizeBrowserApiError((payload as { error?: unknown } | null)?.error ?? null) : null);

    return {
      ok: response.ok,
      status: response.status,
      result: {
        data: (hasEnvelope
          ? ((payload as { data?: T | null }).data ?? null)
          : ((payload ?? null) as T | null)),
        error: normalizedError,
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
