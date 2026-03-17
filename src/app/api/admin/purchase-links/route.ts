import { type NextRequest } from 'next/server';
import { jsonError, jsonOk, requireAdminContext } from '@/lib/api-utils';
import {
  getAllPurchaseLinks,
  setPurchaseLink,
  type PurchaseLinkType,
} from '@/lib/app-settings';

function isPurchaseLinkType(value: unknown): value is PurchaseLinkType {
  return value === 'plus' || value === 'pro' || value === 'credits';
}

export async function GET(request: NextRequest) {
  const auth = await requireAdminContext(request);
  if ('error' in auth) {
    return jsonError(auth.error.message, auth.error.status);
  }

  const links = await getAllPurchaseLinks();
  return jsonOk({ links });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAdminContext(request);
  if ('error' in auth) {
    return jsonError(auth.error.message, auth.error.status);
  }

  let body: { type?: unknown; url?: unknown };
  try {
    body = await request.json() as { type?: unknown; url?: unknown };
  } catch {
    return jsonError('请求体不是合法 JSON', 400);
  }

  if (!isPurchaseLinkType(body.type)) {
    return jsonError('无效的购买链接类型', 400);
  }

  if (typeof body.url !== 'string') {
    return jsonError('缺少有效的购买链接', 400);
  }

  const success = await setPurchaseLink(body.type, body.url.trim(), undefined, auth.user.id);
  if (!success) {
    return jsonError('保存购买链接失败', 500);
  }

  return jsonOk({ success: true });
}
