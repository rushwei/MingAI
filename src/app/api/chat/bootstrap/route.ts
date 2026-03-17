import { NextRequest } from 'next/server';
import { jsonError, jsonOk, requireUserContext } from '@/lib/api-utils';
import { buildChatBootstrap, type ChatBootstrapSupabase } from '@/lib/server/chat/bootstrap';

export async function GET(request: NextRequest) {
  const auth = await requireUserContext(request);
  if ('error' in auth) {
    return jsonError(auth.error.message, auth.error.status);
  }

  const data = await buildChatBootstrap(auth.supabase as unknown as ChatBootstrapSupabase, auth.user.id);
  return jsonOk({ data });
}
