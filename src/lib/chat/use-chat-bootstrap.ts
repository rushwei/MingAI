'use client';

import { useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { EMPTY_CHAT_BOOTSTRAP, loadChatBootstrap, type ChatBootstrapData } from '@/lib/chat/bootstrap';
import { queryKeys } from '@/lib/query/keys';

type ChatBootstrapParams = {
  user: { id: string } | null;
  sessionLoading: boolean;
  knowledgeBaseEnabled: boolean;
};

export function useChatBootstrap({
  user,
  sessionLoading,
  knowledgeBaseEnabled,
}: ChatBootstrapParams) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.chatBootstrap(user?.id ?? null);
  const cachedData = user?.id
    ? queryClient.getQueryData<ChatBootstrapData>(queryKey)
    : undefined;

  const query = useQuery({
    queryKey,
    queryFn: loadChatBootstrap,
    enabled: !sessionLoading && !!user?.id,
    ...(cachedData ? { initialData: cachedData } : {}),
    staleTime: 30_000,
  });

  const data = useMemo<ChatBootstrapData>(() => {
    const nextData: ChatBootstrapData = query.data ?? EMPTY_CHAT_BOOTSTRAP;
    return {
      userId: nextData.userId ?? user?.id ?? null,
      promptKnowledgeBaseIds: nextData.promptKnowledgeBaseIds ?? [],
      promptKnowledgeBases: knowledgeBaseEnabled
        ? (nextData.promptKnowledgeBases ?? [])
        : [],
    };
  }, [knowledgeBaseEnabled, query.data, user?.id]);

  const refreshBootstrap = useCallback(async (targetUserId?: string | null) => {
    const effectiveUserId = targetUserId ?? user?.id ?? null;
    if (!effectiveUserId) {
      queryClient.setQueryData(queryKeys.chatBootstrap(null), EMPTY_CHAT_BOOTSTRAP);
      return EMPTY_CHAT_BOOTSTRAP;
    }

    await queryClient.invalidateQueries({ queryKey: queryKeys.chatBootstrap(effectiveUserId) });
    return (await queryClient.fetchQuery({
      queryKey: queryKeys.chatBootstrap(effectiveUserId),
      queryFn: loadChatBootstrap,
      staleTime: 30_000,
    })) ?? {
      ...EMPTY_CHAT_BOOTSTRAP,
      userId: effectiveUserId,
    };
  }, [queryClient, user?.id]);

  return {
    userId: data.userId,
    promptKnowledgeBases: data.promptKnowledgeBases,
    promptKnowledgeBaseIds: data.promptKnowledgeBaseIds,
    bootstrapLoading: sessionLoading || (!!user?.id && query.isLoading),
    refreshBootstrap,
  };
}
