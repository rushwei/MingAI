/**
 * 全局对话列表 Context
 *
 * 从 useChatState 提取对话列表管理逻辑，使主侧边栏在所有页面
 * 都能展示对话列表。仅登录用户才加载数据。
 *
 * 'use client' 标记说明：
 * - 使用 React hooks 管理全局对话列表状态
 */
'use client';

import {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import type { Conversation } from '@/types';
import {
  loadConversations,
  loadConversationWindow,
  deleteConversation,
  renameConversation,
} from '@/lib/chat/conversation';
import { useSessionSafe } from '@/components/providers/ClientProviders';

interface ConversationListContextType {
  conversations: Conversation[];
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  conversationsLoading: boolean;
  loadingMoreConversations: boolean;
  hasLoadedConversations: boolean;
  hasMoreConversations: boolean;
  setHasLoadedConversations: React.Dispatch<React.SetStateAction<boolean>>;
  pendingSidebarTitle: string | null;
  setPendingSidebarTitle: React.Dispatch<React.SetStateAction<string | null>>;
  titleGeneratingConversationIds: Set<string>;
  setTitleGeneratingConversationIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  refreshConversationList: (targetUserId?: string | null) => Promise<void>;
  triggerConversationListLoad: (source: 'idle' | 'interaction') => void;
  loadMoreConversations: () => Promise<void>;
  handleDeleteConversation: (id: string) => Promise<void>;
  handleRenameConversation: (id: string, title: string) => Promise<void>;
  handleNewChat: () => Promise<void>;
  manualRenamedConversationIdsRef: React.MutableRefObject<Set<string>>;
  conversationsRef: React.MutableRefObject<Conversation[]>;
}

const ConversationListContext = createContext<ConversationListContextType | undefined>(undefined);
const INITIAL_CONVERSATION_LOAD_LIMIT = 20;

function mergeConversations(current: Conversation[], incoming: Conversation[]) {
  if (incoming.length === 0) {
    return current;
  }

  const seen = new Set(current.map((conversation) => conversation.id));
  const appended = incoming.filter((conversation) => !seen.has(conversation.id));
  return appended.length > 0 ? [...current, ...appended] : current;
}

export function ConversationListProvider({ children }: { children: ReactNode }) {
  const { user, loading: sessionLoading } = useSessionSafe();
  const pathname = usePathname();
  const userId = user?.id ?? null;

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationsLoading, setConversationsLoading] = useState(false);
  const [loadingMoreConversations, setLoadingMoreConversations] = useState(false);
  const [hasLoadedConversations, setHasLoadedConversations] = useState(false);
  const [hasMoreConversations, setHasMoreConversations] = useState(false);
  const [pendingSidebarTitle, setPendingSidebarTitle] = useState<string | null>(null);
  const [titleGeneratingConversationIds, setTitleGeneratingConversationIds] = useState<Set<string>>(new Set());

  const manualRenamedConversationIdsRef = useRef<Set<string>>(new Set());
  const conversationsRef = useRef(conversations);
  const hasLoadedRef = useRef(false);
  const userIdRef = useRef<string | null>(userId);
  const nextOffsetRef = useRef<number | null>(null);
  const activeRequestIdRef = useRef(0);
  const prevUserIdRef = useRef<string | null>(null);
  const loadingRef = useRef(false);
  const loadingMoreRef = useRef(false);
  const requestControllerRef = useRef<AbortController | null>(null);
  const idleCallbackHandleRef = useRef<number | null>(null);
  const idleTimeoutHandleRef = useRef<ReturnType<typeof globalThis.setTimeout> | null>(null);

  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);
  useEffect(() => { hasLoadedRef.current = hasLoadedConversations; }, [hasLoadedConversations]);
  useEffect(() => { userIdRef.current = userId; }, [userId]);
  useEffect(() => { loadingRef.current = conversationsLoading; }, [conversationsLoading]);
  useEffect(() => { loadingMoreRef.current = loadingMoreConversations; }, [loadingMoreConversations]);

  const clearScheduledIdleLoad = useCallback(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (idleCallbackHandleRef.current !== null && 'cancelIdleCallback' in window) {
      (window as Window & {
        cancelIdleCallback: (handle: number) => void;
      }).cancelIdleCallback(idleCallbackHandleRef.current);
      idleCallbackHandleRef.current = null;
    }

    if (idleTimeoutHandleRef.current !== null) {
      window.clearTimeout(idleTimeoutHandleRef.current);
      idleTimeoutHandleRef.current = null;
    }
  }, []);

  const resetConversationState = useCallback(() => {
    activeRequestIdRef.current += 1;
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;
    nextOffsetRef.current = null;
    setConversations([]);
    setConversationsLoading(false);
    setLoadingMoreConversations(false);
    setHasLoadedConversations(false);
    setHasMoreConversations(false);
    setPendingSidebarTitle(null);
    setTitleGeneratingConversationIds(new Set());
    manualRenamedConversationIdsRef.current.clear();
  }, []);

  const requestConversationPage = useCallback(async ({
    targetUserId,
    offset,
    append,
  }: {
    targetUserId: string;
    offset: number;
    append: boolean;
  }) => {
    const requestId = activeRequestIdRef.current + 1;
    activeRequestIdRef.current = requestId;
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;

    if (append) {
      setLoadingMoreConversations(true);
    } else {
      setConversationsLoading(true);
    }

    try {
      const payload = await loadConversations(targetUserId, {
        limit: INITIAL_CONVERSATION_LOAD_LIMIT,
        offset,
        signal: controller.signal,
      });

      if (
        !payload
        || controller.signal.aborted
        || activeRequestIdRef.current !== requestId
        || userIdRef.current !== targetUserId
      ) {
        return false;
      }

      nextOffsetRef.current = payload.pagination.nextOffset;
      setHasMoreConversations(payload.pagination.hasMore);
      setHasLoadedConversations(true);
      setConversations((current) => (
        append
          ? mergeConversations(current, payload.conversations)
          : payload.conversations
      ));

      return true;
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.error('[conversation] 对话列表分页加载失败', error);
      }
      return false;
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
      }

      if (activeRequestIdRef.current === requestId) {
        if (append) {
          setLoadingMoreConversations(false);
        } else {
          setConversationsLoading(false);
        }
      }
    }
  }, []);

  const refreshConversationList = useCallback(async (targetUserId?: string | null) => {
    const id = targetUserId ?? userId;
    if (!id) return;

    const requestId = activeRequestIdRef.current + 1;
    activeRequestIdRef.current = requestId;
    requestControllerRef.current?.abort();
    const controller = new AbortController();
    requestControllerRef.current = controller;
    setConversationsLoading(true);

    try {
      const loadedCount = conversationsRef.current.length;
      const loadedConversationIds = conversationsRef.current.map((conversation) => conversation.id);
      const payload = await loadConversationWindow(id, {
        targetCount: loadedCount > 0 ? loadedCount : INITIAL_CONVERSATION_LOAD_LIMIT,
        preserveIds: loadedConversationIds,
        pageSize: INITIAL_CONVERSATION_LOAD_LIMIT,
        signal: controller.signal,
      });

      if (
        !payload
        || controller.signal.aborted
        || activeRequestIdRef.current !== requestId
        || userIdRef.current !== id
      ) {
        return;
      }

      nextOffsetRef.current = payload.pagination.nextOffset;
      setHasMoreConversations(payload.pagination.hasMore);
      setHasLoadedConversations(true);
      setConversations(payload.conversations);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.error('[conversation] 对话列表刷新失败', error);
      }
    } finally {
      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
      }

      if (activeRequestIdRef.current === requestId) {
        setConversationsLoading(false);
      }
    }
  }, [userId]);

  const triggerConversationListLoad = useCallback((source: 'idle' | 'interaction') => {
    if (hasLoadedRef.current || !userId || loadingRef.current || loadingMoreRef.current) return;
    void source;
    void refreshConversationList(userId);
  }, [refreshConversationList, userId]);

  const loadMoreConversations = useCallback(async () => {
    if (
      !userId
      || !hasLoadedRef.current
      || !hasMoreConversations
      || nextOffsetRef.current == null
      || loadingRef.current
      || loadingMoreRef.current
    ) {
      return;
    }

    await requestConversationPage({
      targetUserId: userId,
      offset: nextOffsetRef.current,
      append: true,
    });
  }, [hasMoreConversations, requestConversationPage, userId]);

  // Reset state when the active auth user changes.
  useEffect(() => {
    if (sessionLoading) return;

    if (prevUserIdRef.current === userId) {
      return;
    }

    prevUserIdRef.current = userId;
    clearScheduledIdleLoad();
    resetConversationState();
  }, [clearScheduledIdleLoad, resetConversationState, sessionLoading, userId]);

  // Only preload the first page while already on the chat route.
  useEffect(() => {
    clearScheduledIdleLoad();

    if (
      sessionLoading
      || !userId
      || hasLoadedRef.current
      || !pathname?.startsWith('/chat')
    ) {
      return;
    }

    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
      idleCallbackHandleRef.current = (
        window as Window & { requestIdleCallback: (cb: () => void) => number }
      ).requestIdleCallback(() => {
        idleCallbackHandleRef.current = null;
        triggerConversationListLoad('idle');
      });
      return clearScheduledIdleLoad;
    }

    idleTimeoutHandleRef.current = globalThis.setTimeout(() => {
      idleTimeoutHandleRef.current = null;
      triggerConversationListLoad('idle');
    }, 1200);

    return clearScheduledIdleLoad;
  }, [clearScheduledIdleLoad, pathname, sessionLoading, triggerConversationListLoad, userId]);

  const handleDeleteConversation = useCallback(async (id: string) => {
    const previousConversations = conversationsRef.current;
    setConversations(prev => prev.filter(c => c.id !== id));
    const success = await deleteConversation(id);
    if (!success) {
      setConversations(previousConversations);
    }
  }, []);

  const handleRenameConversation = useCallback(async (id: string, title: string) => {
    manualRenamedConversationIdsRef.current.add(id);
    const previousConversations = conversationsRef.current;
    setConversations(prev => prev.map(c => c.id === id ? { ...c, title } : c));
    const success = await renameConversation(id, title);
    if (!success) {
      setConversations(previousConversations);
    }
  }, []);

  const handleNewChat = useCallback(async () => {
    window.dispatchEvent(new CustomEvent('mingai:chat:new'));
  }, []);

  return (
    <ConversationListContext.Provider value={{
      conversations,
      setConversations,
      conversationsLoading,
      loadingMoreConversations,
      hasLoadedConversations,
      hasMoreConversations,
      setHasLoadedConversations,
      pendingSidebarTitle,
      setPendingSidebarTitle,
      titleGeneratingConversationIds,
      setTitleGeneratingConversationIds,
      refreshConversationList,
      triggerConversationListLoad,
      loadMoreConversations,
      handleDeleteConversation,
      handleRenameConversation,
      handleNewChat,
      manualRenamedConversationIdsRef,
      conversationsRef,
    }}>
      {children}
    </ConversationListContext.Provider>
  );
}

export function useConversationList() {
  const ctx = useContext(ConversationListContext);
  if (!ctx) {
    throw new Error('useConversationList must be used within ConversationListProvider');
  }
  return ctx;
}
