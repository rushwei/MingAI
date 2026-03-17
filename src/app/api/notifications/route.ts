import { type NextRequest } from 'next/server';
import { jsonError, jsonOk, requireUserContext } from '@/lib/api-utils';

function parseIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
}

export async function GET(request: NextRequest) {
  const auth = await requireUserContext(request);
  if ('error' in auth) return jsonError(auth.error.message, auth.error.status);

  const unreadOnly = request.nextUrl.searchParams.get('unread') === '1';
  const countOnly = request.nextUrl.searchParams.get('count') === '1';
  const limit = Math.min(Math.max(Number(request.nextUrl.searchParams.get('limit') || 20), 1), 100);

  let query = auth.supabase
    .from('notifications')
    .select('*', countOnly ? { count: 'exact', head: unreadOnly } : undefined)
    .eq('user_id', auth.user.id);

  if (unreadOnly) {
    query = query.eq('is_read', false);
  }

  if (!countOnly) {
    query = query.order('created_at', { ascending: false }).limit(limit);
  }

  const { data, error, count } = await query;
  if (error) {
    return jsonError('获取通知失败', 500);
  }

  if (countOnly) {
    return jsonOk({ count: count ?? 0 });
  }

  return jsonOk({ notifications: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireUserContext(request);
  if ('error' in auth) return jsonError(auth.error.message, auth.error.status);

  let body: { action?: unknown; id?: unknown; ids?: unknown };
  try {
    body = await request.json() as { action?: unknown; id?: unknown; ids?: unknown };
  } catch {
    return jsonError('请求体不是合法 JSON', 400);
  }

  const action = typeof body.action === 'string' ? body.action : '';
  if (action === 'mark-one' && typeof body.id === 'string') {
    const { error } = await auth.supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', body.id)
      .eq('user_id', auth.user.id);
    if (error) return jsonError('标记已读失败', 500);
    return jsonOk({ success: true });
  }

  if (action === 'mark-all') {
    const { error } = await auth.supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', auth.user.id)
      .eq('is_read', false);
    if (error) return jsonError('标记全部已读失败', 500);
    return jsonOk({ success: true });
  }

  if (action === 'mark-selected') {
    const ids = parseIds(body.ids);
    if (ids.length === 0) return jsonOk({ success: true });
    const { error } = await auth.supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', ids)
      .eq('user_id', auth.user.id);
    if (error) return jsonError('批量标记已读失败', 500);
    return jsonOk({ success: true });
  }

  return jsonError('无效的通知更新操作', 400);
}

export async function DELETE(request: NextRequest) {
  const auth = await requireUserContext(request);
  if ('error' in auth) return jsonError(auth.error.message, auth.error.status);

  let ids = parseIds(request.nextUrl.searchParams.getAll('id'));
  if (ids.length === 0) {
    try {
      const body = await request.json() as { id?: unknown; ids?: unknown };
      if (typeof body.id === 'string') {
        ids = [body.id];
      } else {
        ids = parseIds(body.ids);
      }
    } catch {
      ids = [];
    }
  }

  if (ids.length === 0) {
    return jsonError('缺少通知 ID', 400);
  }

  const { error } = await auth.supabase
    .from('notifications')
    .delete()
    .in('id', ids)
    .eq('user_id', auth.user.id);

  if (error) {
    return jsonError('删除通知失败', 500);
  }

  return jsonOk({ success: true });
}
