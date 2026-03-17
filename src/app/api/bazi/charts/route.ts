import { type NextRequest } from 'next/server';
import { jsonError, jsonOk, requireUserContext } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  const auth = await requireUserContext(request);
  if ('error' in auth) return jsonError(auth.error.message, auth.error.status);

  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return jsonError('缺少命盘 ID', 400);
  }

  const { data, error } = await auth.supabase
    .from('bazi_charts')
    .select('*')
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (error) {
    return jsonError('获取命盘失败', 500);
  }

  if (!data) {
    return jsonError('命盘不存在', 404);
  }

  return jsonOk({ chart: data });
}

export async function POST(request: NextRequest) {
  const auth = await requireUserContext(request);
  if ('error' in auth) return jsonError(auth.error.message, auth.error.status);

  let body: { payload?: Record<string, unknown> };
  try {
    body = await request.json() as { payload?: Record<string, unknown> };
  } catch {
    return jsonError('请求体不是合法 JSON', 400);
  }

  if (!body.payload || typeof body.payload !== 'object' || Array.isArray(body.payload)) {
    return jsonError('缺少有效的命盘数据', 400);
  }

  const payload = {
    ...body.payload,
    user_id: auth.user.id,
  };

  const { data, error } = await auth.supabase
    .from('bazi_charts')
    .insert(payload)
    .select('id')
    .maybeSingle();

  if (error) {
    return jsonError('保存命盘失败', 500);
  }

  return jsonOk({ id: data?.id ?? null }, 201);
}
