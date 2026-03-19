/**
 * 对话管理状态 hook
 *
 * 管理对话列表、当前对话、加载状态、侧边栏状态等
 */
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { ChatMessage, Conversation, Mention } from '@/types';
import type { SelectedCharts } from '@/components/chat/BaziChartSelector';
import { DEFAULT_MODEL_ID } from '@/lib/ai/ai-config';
import {
    loadConversations,
    loadConversation,
    saveConversation,
    deleteConversation,
    renameConversation,
} from '@/lib/chat/conversation';
import { chatStreamManager } from '@/lib/chat/chat-stream-manager';
import type { AttachmentState } from '@/types';
import { useFeatureToggles } from '@/lib/hooks/useFeatureToggles';
import { sanitizeSelectedCharts } from '@/lib/chat/feature-normalization';

export interface ChatStateReturn {
    // Conversation list
    conversations: Conversation[];
    setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
    conversationsLoading: boolean;
    conversationLoading: boolean;
    hasLoadedConversations: boolean;
    setHasLoadedConversations: React.Dispatch<React.SetStateAction<boolean>>;
    pendingSidebarTitle: string | null;
    setPendingSidebarTitle: React.Dispatch<React.SetStateAction<string | null>>;
    titleGeneratingConversationIds: Set<string>;
    setTitleGeneratingConversationIds: React.Dispatch<React.SetStateAction<Set<string>>>;

    // Active conversation
    activeConversationId: string | null;
    setActiveConversationId: React.Dispatch<React.SetStateAction<string | null>>;
    activeConversationIdRef: React.MutableRefObject<string | null>;
    conversationValidatedRef: React.MutableRefObject<boolean>;
    conversationSelectRequestRef: React.MutableRefObject<number>;
    hasLoadedConversationsRef: React.MutableRefObject<boolean>;
    manualRenamedConversationIdsRef: React.MutableRefObject<Set<string>>;
    conversationsRef: React.MutableRefObject<Conversation[]>;

    // Sidebar
    sidebarOpen: boolean;
    setSidebarOpen: React.Dispatch<React.SetStateAction<boolean>>;
    sidebarCollapsed: boolean;
    setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;

    // Messages
    messages: ChatMessage[];
    setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
    inputValue: string;
    setInputValue: React.Dispatch<React.SetStateAction<string>>;
    isSendingToList: boolean;
    setIsSendingToList: React.Dispatch<React.SetStateAction<boolean>>;
    messagesEndRef: React.MutableRefObject<HTMLDivElement | null>;
    messageScrollContainerRef: React.MutableRefObject<HTMLDivElement | null>;
    shouldAutoScrollRef: React.MutableRefObject<boolean>;

    // Chart selector
    chartSelectorOpen: boolean;
    setChartSelectorOpen: React.Dispatch<React.SetStateAction<boolean>>;
    selectedCharts: SelectedCharts;
    setSelectedCharts: React.Dispatch<React.SetStateAction<SelectedCharts>>;
    chartFocusType: 'bazi' | 'ziwei' | undefined;
    setChartFocusType: React.Dispatch<React.SetStateAction<'bazi' | 'ziwei' | undefined>>;

    // Model & reasoning
    selectedModel: string;
    setSelectedModel: React.Dispatch<React.SetStateAction<string>>;
    reasoningEnabled: boolean;
    setReasoningEnabled: React.Dispatch<React.SetStateAction<boolean>>;

    // Attachments & mentions
    attachmentState: AttachmentState;
    setAttachmentState: React.Dispatch<React.SetStateAction<AttachmentState>>;
    mentions: Mention[];
    setMentions: React.Dispatch<React.SetStateAction<Mention[]>>;

    // Knowledge base modal
    kbModalOpen: boolean;
    setKbModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    kbTargetMessage: ChatMessage | null;
    setKbTargetMessage: React.Dispatch<React.SetStateAction<ChatMessage | null>>;

    // Dream mode
    dreamMode: boolean;
    setDreamMode: React.Dispatch<React.SetStateAction<boolean>>;
    dreamContext: { baziChartName?: string; dailyFortune?: string } | undefined;
    setDreamContext: React.Dispatch<React.SetStateAction<{ baziChartName?: string; dailyFortune?: string } | undefined>>;
    dreamContextLoading: boolean;
    setDreamContextLoading: React.Dispatch<React.SetStateAction<boolean>>;

    // Streaming
    streamingConversationIds: Set<string>;
    setStreamingConversationIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    isLoading: boolean;

    // Credits modal
    showCreditsModal: boolean;
    setShowCreditsModal: React.Dispatch<React.SetStateAction<boolean>>;

    // Actions
    refreshConversationList: (targetUserId?: string | null) => Promise<void>;
    triggerConversationListLoad: (source: 'idle' | 'interaction') => void;
    handleSelectConversation: (id: string, options?: { updateUrl?: boolean }) => Promise<void>;
    handleNewChat: () => Promise<void>;
    handleDeleteConversation: (id: string) => Promise<void>;
    handleRenameConversation: (id: string, title: string) => Promise<void>;
    saveMessages: (conversationId: string, newMessages: ChatMessage[], title?: string) => Promise<boolean | undefined>;
}

export function useChatState({
    userId,
    sessionLoading,
    bootstrapLoading,
    router,
    searchParams,
}: {
    userId: string | null;
    sessionLoading: boolean;
    bootstrapLoading: boolean;
    router: ReturnType<typeof import('next/navigation').useRouter>;
    searchParams: ReturnType<typeof import('next/navigation').useSearchParams>;
}): ChatStateReturn {
    const { isFeatureEnabled, isLoading: featureToggleLoading } = useFeatureToggles();
    const baziFeatureEnabled = !featureToggleLoading && isFeatureEnabled('bazi');
    const ziweiFeatureEnabled = !featureToggleLoading && isFeatureEnabled('ziwei');

    // Conversation list state
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [conversationsLoading, setConversationsLoading] = useState(true);
    const [hasLoadedConversations, setHasLoadedConversations] = useState(false);
    const [pendingSidebarTitle, setPendingSidebarTitle] = useState<string | null>(null);
    const [titleGeneratingConversationIds, setTitleGeneratingConversationIds] = useState<Set<string>>(new Set());
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [conversationLoading, setConversationLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(() => false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
        typeof window !== 'undefined' && window.innerWidth >= 1024
    );
    const [showCreditsModal, setShowCreditsModal] = useState(false);

    // Messages state
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isSendingToList, setIsSendingToList] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const messageScrollContainerRef = useRef<HTMLDivElement | null>(null);
    const shouldAutoScrollRef = useRef(true);
    const manualRenamedConversationIdsRef = useRef<Set<string>>(new Set());
    const activeConversationIdRef = useRef<string | null>(null);
    const hasLoadedConversationsRef = useRef(false);
    const conversationSelectRequestRef = useRef(0);
    const conversationsRef = useRef(conversations);
    const conversationValidatedRef = useRef(false);

    // Update ref in effect to avoid render-time mutation
    useEffect(() => {
        conversationsRef.current = conversations;
    }, [conversations]);

    // Chart selector state
    const [chartSelectorOpen, setChartSelectorOpen] = useState(false);
    const [selectedCharts, setSelectedCharts] = useState<SelectedCharts>({});
    const [chartFocusType, setChartFocusType] = useState<'bazi' | 'ziwei' | undefined>(undefined);

    // Model & reasoning
    const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL_ID);
    const [reasoningEnabled, setReasoningEnabled] = useState(false);

    // Attachments & mentions
    const [attachmentState, setAttachmentState] = useState<AttachmentState>({ file: undefined, webSearchEnabled: false });
    const [mentions, setMentions] = useState<Mention[]>([]);
    const [kbModalOpen, setKbModalOpen] = useState(false);
    const [kbTargetMessage, setKbTargetMessage] = useState<ChatMessage | null>(null);

    // Dream mode
    const [dreamMode, setDreamMode] = useState(false);
    const [dreamContext, setDreamContext] = useState<{ baziChartName?: string; dailyFortune?: string } | undefined>(undefined);
    const [dreamContextLoading, setDreamContextLoading] = useState(false);

    // Streaming state
    const [streamingConversationIds, setStreamingConversationIds] = useState<Set<string>>(new Set());
    const isLoading = activeConversationId ? streamingConversationIds.has(activeConversationId) : false;
    const visibleSelectedCharts = useMemo(
        () => sanitizeSelectedCharts(selectedCharts, {
            baziEnabled: baziFeatureEnabled,
            ziweiEnabled: ziweiFeatureEnabled,
        }),
        [baziFeatureEnabled, selectedCharts, ziweiFeatureEnabled]
    );

    // Sync refs
    useEffect(() => { activeConversationIdRef.current = activeConversationId; }, [activeConversationId]);
    useEffect(() => { hasLoadedConversationsRef.current = hasLoadedConversations; }, [hasLoadedConversations]);

    // Actions
    const refreshConversationList = useCallback(async (targetUserId?: string | null) => {
        const id = targetUserId ?? userId;
        if (!id) return;
        const list = await loadConversations(id);
        setConversations(list);
        setHasLoadedConversations(true);
        const currentActiveConversationId = activeConversationIdRef.current;
        if (currentActiveConversationId && !list.find(c => c.id === currentActiveConversationId)) {
            activeConversationIdRef.current = null;
            setActiveConversationId(null);
            setConversationLoading(false);
            setMessages([]);
        }
    }, [userId]);

    const triggerConversationListLoad = useCallback((source: 'idle' | 'interaction') => {
        if (hasLoadedConversations || !userId) return;
        setConversationsLoading(true);
        void refreshConversationList(userId).finally(() => {
            setConversationsLoading(false);
            if (source === 'interaction') {
                setHasLoadedConversations(true);
            }
        });
    }, [hasLoadedConversations, refreshConversationList, userId]);

    // Init: load conversations
    useEffect(() => {
        let isActive = true;
        const init = async () => {
            if (sessionLoading || bootstrapLoading) return;
            if (!userId) {
                if (!isActive) return;
                setConversations([]);
                setMessages([]);
                activeConversationIdRef.current = null;
                conversationSelectRequestRef.current += 1;
                setConversationLoading(false);
                setActiveConversationId(null);
                setConversationsLoading(false);
                setHasLoadedConversations(false);
                return;
            }
            setConversationsLoading(false);
            const idleCallback = (cb: () => void) => {
                if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
                    (window as Window & { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(cb);
                    return;
                }
                setTimeout(cb, 1200);
            };
            idleCallback(() => {
                if (!isActive) return;
                triggerConversationListLoad('idle');
            });
        };
        void init();
        return () => { isActive = false; };
    }, [bootstrapLoading, sessionLoading, triggerConversationListLoad, userId]);

    // Load conversations when sidebar opens
    useEffect(() => {
        if (!sidebarOpen) return;
        triggerConversationListLoad('interaction'); // eslint-disable-line react-hooks/set-state-in-effect -- intentional: sidebar open triggers data fetch
    }, [sidebarOpen, triggerConversationListLoad]);

    // Select conversation
    const handleSelectConversation = useCallback(async (
        id: string,
        options?: { updateUrl?: boolean }
    ) => {
        shouldAutoScrollRef.current = true;
        const requestId = conversationSelectRequestRef.current + 1;
        conversationSelectRequestRef.current = requestId;

        activeConversationIdRef.current = id;
        setActiveConversationId(id);
        setSidebarOpen(false);
        conversationValidatedRef.current = false;

        const runningMessages = chatStreamManager.getTaskMessages(id);
        if (runningMessages) {
            setConversationLoading(false);
            setMessages(runningMessages);
        } else {
            const cachedConversation = conversationsRef.current.find(conv => conv.id === id);
            const cachedMessages = cachedConversation?.messages || [];
            setConversationLoading(cachedMessages.length === 0);
            setMessages(cachedMessages);
        }

        if (options?.updateUrl !== false && searchParams.get('id') !== id) {
            router.replace(`/chat?id=${id}`);
        }

        const conv = await loadConversation(id);
        if (requestId !== conversationSelectRequestRef.current) return;
        setConversationLoading(false);
        if (!conv) {
            activeConversationIdRef.current = null;
            setConversationLoading(false);
            setActiveConversationId(null);
            setMessages([]);
            conversationValidatedRef.current = false;
            router.replace('/chat');
            return;
        }

        conversationValidatedRef.current = true;
        const taskMessages = chatStreamManager.getTaskMessages(id);
        const sourceMessages = taskMessages || conv.messages;
        setMessages(sourceMessages);

        // Restore chart display from last AI message
        const lastAIMessage = [...sourceMessages].reverse().find(m => m.role === 'assistant' && m.chartInfo);
        const chartInfo = lastAIMessage?.chartInfo;
        const newChartSelection: SelectedCharts = {};
        if (chartInfo?.baziName) {
            newChartSelection.bazi = { id: '', name: chartInfo.baziName, info: '(历史)' };
        }
        if (chartInfo?.ziweiName) {
            newChartSelection.ziwei = { id: '', name: chartInfo.ziweiName, info: '(历史)' };
        }
        setSelectedCharts(sanitizeSelectedCharts(newChartSelection, {
            baziEnabled: baziFeatureEnabled,
            ziweiEnabled: ziweiFeatureEnabled,
        }));
    }, [baziFeatureEnabled, router, searchParams, ziweiFeatureEnabled]);

    // New chat
    const handleNewChat = useCallback(async () => {
        shouldAutoScrollRef.current = true;
        conversationSelectRequestRef.current += 1;
        activeConversationIdRef.current = null;
        setConversationLoading(false);
        setActiveConversationId(null);
        setMessages([]);
        setSelectedCharts({});
        setSidebarOpen(false);
        if (searchParams.get('id')) {
            router.replace('/chat');
        }
    }, [router, searchParams]);

    // URL-based conversation selection
    useEffect(() => {
        if (!userId) return;
        const targetConversationId = searchParams.get('id');
        if (!targetConversationId || targetConversationId === activeConversationIdRef.current) return;
        void handleSelectConversation(targetConversationId, { updateUrl: false }); // eslint-disable-line react-hooks/set-state-in-effect -- intentional: URL change triggers conversation selection
    }, [handleSelectConversation, searchParams, userId]);

    // Delete conversation (optimistic)
    const handleDeleteConversation = useCallback(async (id: string) => {
        const previousConversations = conversations;
        setConversations(prev => prev.filter(c => c.id !== id));
        if (activeConversationIdRef.current === id) {
            activeConversationIdRef.current = null;
            setActiveConversationId(null);
            setConversationLoading(false);
            setMessages([]);
        }
        const success = await deleteConversation(id);
        if (!success) {
            setConversations(previousConversations);
        }
    }, [conversations]);

    // Rename conversation (optimistic)
    const handleRenameConversation = useCallback(async (id: string, title: string) => {
        manualRenamedConversationIdsRef.current.add(id);
        const previousConversations = conversations;
        setConversations(prev => prev.map(c => c.id === id ? { ...c, title } : c));
        const success = await renameConversation(id, title);
        if (!success) {
            setConversations(previousConversations);
        }
    }, [conversations]);

    // Save messages
    const saveMessagesAction = useCallback(async (conversationId: string, newMessages: ChatMessage[], title?: string) => {
        if (!userId) return false;
        return saveConversation(conversationId, newMessages, title);
    }, [userId]);

    return {
        conversations, setConversations,
        conversationsLoading, conversationLoading, hasLoadedConversations, setHasLoadedConversations,
        pendingSidebarTitle, setPendingSidebarTitle,
        titleGeneratingConversationIds, setTitleGeneratingConversationIds,
        activeConversationId, setActiveConversationId,
        activeConversationIdRef, conversationValidatedRef,
        conversationSelectRequestRef, hasLoadedConversationsRef,
        manualRenamedConversationIdsRef, conversationsRef,
        sidebarOpen, setSidebarOpen,
        sidebarCollapsed, setSidebarCollapsed,
        messages, setMessages,
        inputValue, setInputValue,
        isSendingToList, setIsSendingToList,
        messagesEndRef, messageScrollContainerRef, shouldAutoScrollRef,
        chartSelectorOpen, setChartSelectorOpen,
        selectedCharts: visibleSelectedCharts, setSelectedCharts,
        chartFocusType, setChartFocusType,
        selectedModel, setSelectedModel,
        reasoningEnabled, setReasoningEnabled,
        attachmentState, setAttachmentState,
        mentions, setMentions,
        kbModalOpen, setKbModalOpen,
        kbTargetMessage, setKbTargetMessage,
        dreamMode, setDreamMode,
        dreamContext, setDreamContext,
        dreamContextLoading, setDreamContextLoading,
        streamingConversationIds, setStreamingConversationIds,
        isLoading,
        showCreditsModal, setShowCreditsModal,
        refreshConversationList,
        triggerConversationListLoad,
        handleSelectConversation,
        handleNewChat,
        handleDeleteConversation,
        handleRenameConversation,
        saveMessages: saveMessagesAction,
    };
}
