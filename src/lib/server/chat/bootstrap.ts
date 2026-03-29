import 'server-only';

import { buildMembershipInfo } from '@/lib/user/membership';
import type { MembershipInfoSource } from '@/lib/user/membership';
import type { ChatBootstrapData, ChatBootstrapKnowledgeBase } from '@/lib/chat/bootstrap';
import { isFeatureModuleEnabled } from '@/lib/app-settings';

export type ChatBootstrapSupabase = {
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => PromiseLike<{ data: unknown; error: unknown }>;
        in: (column: string, values: string[]) => PromiseLike<{ data: unknown[] | null; error: unknown }>;
      };
    };
  };
};

type PromptSettingsRow = {
  prompt_kb_ids?: unknown;
};

function toPromptKnowledgeBaseIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

export async function buildChatBootstrap(
  supabase: ChatBootstrapSupabase,
  userId: string,
): Promise<ChatBootstrapData> {
  const knowledgeBaseFeatureEnabled = await isFeatureModuleEnabled('knowledge-base');
  const { data: membershipRow } = await supabase
    .from('users')
    .select('id, membership, membership_expires_at, ai_chat_count, last_credit_restore_at')
    .eq('id', userId)
    .maybeSingle();

  const membership = buildMembershipInfo((membershipRow ?? null) as MembershipInfoSource | null);

  const promptKbIds = membership?.type === 'free' || !knowledgeBaseFeatureEnabled
    ? []
    : await (async () => {
      const { data: settingsRow } = await supabase
        .from('user_settings')
        .select('prompt_kb_ids')
        .eq('user_id', userId)
        .maybeSingle();
      return toPromptKnowledgeBaseIds((settingsRow as PromptSettingsRow | null)?.prompt_kb_ids);
    })();

  if (membership?.type === 'free' || !knowledgeBaseFeatureEnabled || promptKbIds.length === 0) {
    return {
      userId,
      promptKnowledgeBaseIds: [],
      promptKnowledgeBases: [],
    };
  }

  const { data: kbRows } = await supabase
    .from('knowledge_bases')
    .select('id, name, description')
    .eq('user_id', userId)
    .in('id', promptKbIds);

  const kbMap = new Map(
    ((kbRows ?? []) as ChatBootstrapKnowledgeBase[]).map((kb) => [kb.id, kb] as const)
  );

  return {
    userId,
    promptKnowledgeBaseIds: promptKbIds,
    promptKnowledgeBases: promptKbIds
      .map((kbId) => kbMap.get(kbId))
      .filter((kb): kb is ChatBootstrapKnowledgeBase => !!kb),
  };
}
