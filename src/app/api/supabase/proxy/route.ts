import { NextRequest } from 'next/server';
import { getAuthContext, jsonError, jsonOk, requireUserContext } from '@/lib/api-utils';

interface ChainStep {
  method: string;
  args: unknown[];
}

interface QueryPayload {
  kind: 'query';
  table: string;
  chain: ChainStep[];
}

interface RpcPayload {
  kind: 'rpc';
  fn: string;
  args?: Record<string, unknown>;
}

type ProxyPayload = QueryPayload | RpcPayload;

const TABLE_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;
const ALLOWED_PROXY_CLIENT = 'web';

const ALLOWED_QUERY_METHODS = new Set([
  'select',
  'insert',
  'upsert',
  'update',
  'delete',
  'eq',
  'neq',
  'gt',
  'gte',
  'lt',
  'lte',
  'like',
  'ilike',
  'is',
  'in',
  'contains',
  'containedBy',
  'rangeGt',
  'rangeGte',
  'rangeLt',
  'rangeLte',
  'rangeAdjacent',
  'overlaps',
  'textSearch',
  'match',
  'not',
  'or',
  'filter',
  'order',
  'limit',
  'range',
  'abortSignal',
  'single',
  'maybeSingle',
  'csv',
  'returns',
]);

const WRITE_QUERY_METHODS = new Set(['insert', 'upsert', 'update', 'delete']);

const PUBLIC_RPC_FUNCTIONS = new Set(['check_login_attempts', 'record_login_attempt']);

const AUTH_RPC_FUNCTIONS = new Set<string>();

const BLOCKED_RPC_FUNCTIONS = new Set([
  'mcp_verify_api_key',
  'mcp_touch_key_last_used',
  'activate_key_as_service',
  'batch_update_vectors_as_service',
  'admin_get_auth_user_emails',
]);

type ProxyResult = {
  data?: unknown;
  error?: unknown;
  count?: number | null;
  status?: number;
  statusText?: string;
} | null;

function serializeError(error: unknown): { message: string; code?: string } | null {
  if (!error) return null;
  if (typeof error === 'object' && error && 'message' in error) {
    const message = String((error as { message?: unknown }).message ?? 'Unknown error');
    const code = 'code' in error ? String((error as { code?: unknown }).code ?? '') : undefined;
    return code ? { message, code } : { message };
  }
  return { message: String(error) };
}

function proxyError(message: string, status = 400, code?: string) {
  const normalized = code ? { message, code } : { message };
  return jsonError(message, status, { data: null, error: normalized });
}

function isInternalProxyRequest(request: NextRequest): boolean {
  const clientHeader = request.headers.get('x-mingai-proxy-client');
  if (clientHeader !== ALLOWED_PROXY_CLIENT) {
    return false;
  }

  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  if (!origin || !host) {
    return false;
  }

  try {
    if (new URL(origin).host !== host) {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}

function isAllowedQueryMethod(method: string): boolean {
  if (!method || !ALLOWED_QUERY_METHODS.has(method)) {
    return false;
  }
  if (method === 'then' || method === 'catch' || method === 'finally') {
    return false;
  }
  return true;
}

function queryNeedsAuth(chain: ChainStep[]): boolean {
  return chain.some((step) => WRITE_QUERY_METHODS.has(step.method));
}

function isValidChain(chain: unknown): chain is ChainStep[] {
  if (!Array.isArray(chain)) return false;
  if (chain.length > 64) return false;
  return chain.every((step) => {
    if (!step || typeof step !== 'object') return false;
    const method = (step as { method?: unknown }).method;
    const args = (step as { args?: unknown }).args;
    if (typeof method !== 'string' || !method.trim()) return false;
    if (!isAllowedQueryMethod(method)) return false;
    return Array.isArray(args);
  });
}

export async function POST(request: NextRequest) {
  if (!isInternalProxyRequest(request)) {
    return proxyError('Forbidden proxy client', 403, 'FORBIDDEN_PROXY_CLIENT');
  }

  let payload: ProxyPayload;
  try {
    payload = (await request.json()) as ProxyPayload;
  } catch {
    return proxyError('Invalid JSON payload', 400);
  }

  try {
    if (payload.kind === 'rpc') {
      if (!payload.fn || typeof payload.fn !== 'string') {
        return proxyError('Invalid RPC function name', 400);
      }
      if (BLOCKED_RPC_FUNCTIONS.has(payload.fn)) {
        return proxyError('RPC function is blocked', 403, 'RPC_BLOCKED');
      }
      const rpcNeedsAuth = AUTH_RPC_FUNCTIONS.has(payload.fn);
      const rpcIsPublic = PUBLIC_RPC_FUNCTIONS.has(payload.fn);
      if (!rpcNeedsAuth && !rpcIsPublic) {
        return proxyError('Unsupported RPC function', 403, 'RPC_NOT_ALLOWED');
      }
      if (rpcNeedsAuth) {
        const auth = await requireUserContext(request);
        if ('error' in auth) {
          return proxyError(auth.error.message, auth.error.status, 'UNAUTHORIZED');
        }
      }

      const { supabase } = await getAuthContext(request);
      const result = await supabase.rpc(payload.fn, payload.args || {});
      return jsonOk({
        data: result.data ?? null,
        error: serializeError(result.error),
        count: result.count ?? null,
        status: result.status ?? 200,
        statusText: result.statusText ?? '',
      });
    }

    if (payload.kind === 'query') {
      if (!payload.table || typeof payload.table !== 'string' || !TABLE_NAME_PATTERN.test(payload.table)) {
        return proxyError('Invalid table name', 400);
      }
      if (!isValidChain(payload.chain)) {
        return proxyError('Invalid query chain', 400);
      }

      if (queryNeedsAuth(payload.chain)) {
        const auth = await requireUserContext(request);
        if ('error' in auth) {
          return proxyError(auth.error.message, auth.error.status, 'UNAUTHORIZED');
        }
      }

      const { supabase } = await getAuthContext(request);
      let query: unknown = supabase.from(payload.table);
      for (const step of payload.chain) {
        const fn = (query as Record<string, unknown> | null)?.[step.method];
        if (typeof fn !== 'function') {
          return proxyError(`Unsupported query method: ${step.method}`, 400);
        }
        query = fn.apply(query, step.args);
      }

      const result = (await Promise.resolve(query)) as ProxyResult;
      return jsonOk({
        data: result?.data ?? null,
        error: serializeError(result?.error),
        count: result?.count ?? null,
        status: result?.status ?? 200,
        statusText: result?.statusText ?? '',
      });
    }

    return proxyError('Unsupported proxy payload', 400);
  } catch (error) {
    return jsonError('Internal proxy error', 500, { data: null, error: serializeError(error) });
  }
}
