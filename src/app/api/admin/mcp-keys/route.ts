/**
 * 管理员 MCP Key 管理 API
 *
 * GET    — 列出所有 MCP Key
 * DELETE — 吊销指定用户的 MCP Key
 */

import { type NextRequest } from 'next/server';
import { requireAdminUser, jsonOk, jsonError } from '@/lib/api-utils';
import { getAllMcpKeys, revokeMcpKey } from '@/lib/mcp-keys';

export async function GET(request: NextRequest) {
  const auth = await requireAdminUser(request);
  if ('error' in auth) return jsonError(auth.error.message, auth.error.status);

  const url = new URL(request.url);
  const isActive = url.searchParams.get('is_active');

  const filters: { isActive?: boolean } = {};
  if (isActive === 'true') filters.isActive = true;
  if (isActive === 'false') filters.isActive = false;

  const keys = await getAllMcpKeys(filters);
  return jsonOk({ keys });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminUser(request);
  if ('error' in auth) return jsonError(auth.error.message, auth.error.status);

  let userId = '';
  try {
    const body = await request.json() as { userId?: unknown };
    userId = typeof body.userId === 'string' ? body.userId.trim() : '';
  } catch {
    return jsonError('请求体不是合法 JSON', 400);
  }

  if (!userId) {
    return jsonError('缺少 userId 参数', 400);
  }

  const result = await revokeMcpKey(userId);
  if (!result.success) {
    return jsonError(result.error || '吊销失败', 400);
  }
  return jsonOk({ success: true });
}
