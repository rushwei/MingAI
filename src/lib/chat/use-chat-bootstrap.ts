'use client';

import { useCallback, useEffect, useState } from 'react';
import { EMPTY_CHAT_BOOTSTRAP, loadChatBootstrap, type ChatBootstrapData } from '@/lib/chat/bootstrap';

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
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const [data, setData] = useState<ChatBootstrapData>(EMPTY_CHAT_BOOTSTRAP);

  const refreshBootstrap = useCallback(async (targetUserId?: string | null) => {
    const effectiveUserId = targetUserId ?? user?.id ?? null;
    if (!effectiveUserId) {
      setData(EMPTY_CHAT_BOOTSTRAP);
      setBootstrapLoading(false);
      return EMPTY_CHAT_BOOTSTRAP;
    }

    setData((previous) => ({
      ...previous,
      userId: effectiveUserId,
    }));
    setBootstrapLoading(true);

    const nextData = (await loadChatBootstrap()) ?? {
      userId: effectiveUserId,
      membership: null,
      promptKnowledgeBaseIds: [],
      promptKnowledgeBases: [],
    };

    const normalized: ChatBootstrapData = {
      userId: nextData.userId ?? effectiveUserId,
      membership: nextData.membership ?? null,
      promptKnowledgeBaseIds: nextData.promptKnowledgeBaseIds ?? [],
      promptKnowledgeBases: knowledgeBaseEnabled
        ? (nextData.promptKnowledgeBases ?? [])
        : [],
    };

    setData(normalized);
    setBootstrapLoading(false);
    return normalized;
  }, [knowledgeBaseEnabled, user?.id]);

  const markCreditsExhausted = useCallback(() => {
    setData((previous) => ({
      ...previous,
      membership: previous.membership
        ? {
          ...previous.membership,
          aiChatCount: 0,
        }
        : previous.membership,
    }));
  }, []);

  useEffect(() => {
    let isActive = true;

    const run = async () => {
      if (sessionLoading) return;
      if (!user?.id) {
        if (!isActive) return;
        setData(EMPTY_CHAT_BOOTSTRAP);
        setBootstrapLoading(false);
        return;
      }

      const nextData = await refreshBootstrap(user.id);
      if (!isActive) return;
      setData(nextData);
    };

    void run();

    return () => {
      isActive = false;
    };
  }, [refreshBootstrap, sessionLoading, user?.id]);

  return {
    userId: data.userId,
    membership: data.membership,
    credits: data.membership?.aiChatCount ?? null,
    promptKnowledgeBases: data.promptKnowledgeBases,
    promptKnowledgeBaseIds: data.promptKnowledgeBaseIds,
    bootstrapLoading,
    refreshBootstrap,
    markCreditsExhausted,
  };
}
