/**
 * 消息发送、流式响应、中止、重试逻辑 hook
 */
import { useCallback, useEffect, useMemo } from 'react';
import type { ChatMessage, Conversation, DifyContext, Mention, AIMessageMetadata, DreamInterpretationInfo } from '@/types';
import { ANONYMOUS_DISPLAY_NAME } from '@/types';
import { createConversation, deleteConversation, renameConversation } from '@/lib/chat/conversation';
import { buildDraftTitle } from '@/lib/chat/draft-title';
import { isNearBottom } from '@/lib/chat/chat-scroll';
import { chatStreamManager } from '@/lib/chat/chat-stream-manager';
import { supabase } from '@/lib/auth';
import { resolveClientModelName } from '@/lib/ai/model-name-cache';
import type { ChatStateReturn } from '@/lib/chat/use-chat-state';
import { useFeatureToggles } from '@/lib/hooks/useFeatureToggles';
import { getEnabledDataSourceTypes } from '@/lib/data-sources/catalog';
import {
    buildChatMessageChartInfo,
    buildChatRequestChartIds,
    sanitizeChatMentions,
} from '@/lib/chat/feature-normalization';

// AI 生成对话标题
async function generateAITitle(messages: ChatMessage[]): Promise<string> {
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (!firstUserMessage) return '新对话';
    try {
        const response = await fetch('/api/chat/title', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages }),
        });
        if (!response.ok) {
            console.warn('Title generation failed:', response.status);
            return firstUserMessage.content.slice(0, 15);
        }
        const data = await response.json();
        return data.title || firstUserMessage.content.slice(0, 15);
    } catch {
        return firstUserMessage.content.slice(0, 15);
    }
}

interface UseChatMessagingParams {
    state: ChatStateReturn;
    userId: string | null;
    user: { user_metadata?: { nickname?: string } } | null;
    membership: { type: string; isActive: boolean } | null;
    credits: number | null;
    refreshBootstrap: (targetUserId?: string | null) => Promise<unknown>;
    markBootstrapCreditsExhausted: () => void;
    showToast: ReturnType<typeof import('@/components/ui/Toast').useToast>['showToast'];
    router: ReturnType<typeof import('next/navigation').useRouter>;
    searchParams: ReturnType<typeof import('next/navigation').useSearchParams>;
}

export function useChatMessaging({
    state,
    userId,
    user,
    membership: _membership, // eslint-disable-line @typescript-eslint/no-unused-vars -- reserved for future credit checks
    credits: _credits, // eslint-disable-line @typescript-eslint/no-unused-vars -- reserved for future credit checks
    refreshBootstrap,
    markBootstrapCreditsExhausted,
    showToast,
    router,
    searchParams,
}: UseChatMessagingParams) {
    const {
        messages, setMessages,
        inputValue, setInputValue,
        isSendingToList, setIsSendingToList,
        activeConversationId, setActiveConversationId,
        activeConversationIdRef, conversationValidatedRef,
        manualRenamedConversationIdsRef, hasLoadedConversationsRef,
        messagesEndRef, messageScrollContainerRef, shouldAutoScrollRef,
        selectedCharts,
        selectedModel, reasoningEnabled,
        attachmentState, setAttachmentState,
        mentions, setMentions,
        dreamMode, dreamContextLoading,
        setDreamContext,
        setStreamingConversationIds,
        isLoading,
        setConversations,
        setHasLoadedConversations,
        setPendingSidebarTitle,
        setTitleGeneratingConversationIds,
        setKbModalOpen,
        setKbTargetMessage,
        setShowCreditsModal,
        refreshConversationList,
        saveMessages,
    } = state;
    const { isFeatureEnabled, isLoading: featureToggleLoading } = useFeatureToggles({ enabled: !!userId });
    const knowledgeBaseEnabled = !featureToggleLoading && isFeatureEnabled('knowledge-base');
    const baziFeatureEnabled = !featureToggleLoading && isFeatureEnabled('bazi');
    const ziweiFeatureEnabled = !featureToggleLoading && isFeatureEnabled('ziwei');
    const enabledDataSourceTypes = useMemo(
        () => (featureToggleLoading ? [] : getEnabledDataSourceTypes(isFeatureEnabled)),
        [featureToggleLoading, isFeatureEnabled]
    );
    const sanitizeOutgoingMentions = useCallback(
        (rawMentions: Mention[] | undefined) => sanitizeChatMentions(rawMentions, {
            knowledgeBaseEnabled,
            enabledDataSourceTypes,
        }),
        [enabledDataSourceTypes, knowledgeBaseEnabled]
    );
    const chatChartIds = useMemo(
        () => buildChatRequestChartIds(selectedCharts, {
            baziEnabled: baziFeatureEnabled,
            ziweiEnabled: ziweiFeatureEnabled,
        }),
        [baziFeatureEnabled, selectedCharts, ziweiFeatureEnabled]
    );
    const chatChartInfo = useMemo(
        () => buildChatMessageChartInfo(selectedCharts, {
            baziEnabled: baziFeatureEnabled,
            ziweiEnabled: ziweiFeatureEnabled,
        }),
        [baziFeatureEnabled, selectedCharts, ziweiFeatureEnabled]
    );

    const markCreditsExhausted = useCallback((message?: string) => {
        markBootstrapCreditsExhausted();
        setShowCreditsModal(true);
        if (message) {
            showToast('info', message);
        }
    }, [markBootstrapCreditsExhausted, setShowCreditsModal, showToast]);

    // Scroll helpers
    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
    }, [messagesEndRef]);

    const handleMessageListScroll = useCallback(() => {
        const container = messageScrollContainerRef.current;
        if (!container) return;
        shouldAutoScrollRef.current = isNearBottom({
            scrollHeight: container.scrollHeight,
            scrollTop: container.scrollTop,
            clientHeight: container.clientHeight,
        });
    }, [messageScrollContainerRef, shouldAutoScrollRef]);

    useEffect(() => {
        if (!messages.length || !shouldAutoScrollRef.current) return;
        scrollToBottom(isLoading ? 'auto' : 'smooth');
    }, [isLoading, messages, scrollToBottom, shouldAutoScrollRef]);

    // Dream context fetch
    useEffect(() => {
        let isActive = true;
        if (!dreamMode || !userId) {
            setDreamContext(undefined);
            return () => { isActive = false; };
        }
        const fetchDreamContext = async () => {
            state.setDreamContextLoading(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const headers: Record<string, string> = {};
                if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
                const response = await fetch('/api/dream-context', { headers });
                if (!response.ok) throw new Error('请求失败');
                const data = await response.json();
                if (!isActive) return;
                setDreamContext(data?.dreamContext);
            } catch (error) {
                if (!isActive) return;
                console.error('获取解梦上下文失败:', error);
                setDreamContext(undefined);
            } finally {
                if (isActive) state.setDreamContextLoading(false);
            }
        };
        fetchDreamContext();
        return () => { isActive = false; };
    }, [dreamMode, userId, setDreamContext, state]);

    // Stream manager subscription
    useEffect(() => {
        const unsubscribe = chatStreamManager.subscribe((event) => {
            const convId = event.task.conversationId;
            const currentActiveConversationId = activeConversationIdRef.current;
            const isActiveConversationEvent = convId === currentActiveConversationId;
            const taskDreamContext = (event.task.metadata as AIMessageMetadata | undefined)?.dreamContext;
            const isAuthRequired = event.errorCode === 'AUTH_REQUIRED'
                || event.errorMessage?.includes('请先登录') === true;

            if (event.type === 'task_started') {
                setStreamingConversationIds(prev => { const next = new Set(prev); next.add(convId); return next; });
            } else if (event.type === 'task_completed' || event.type === 'task_stopped' || event.type === 'task_failed') {
                setStreamingConversationIds(prev => { const next = new Set(prev); next.delete(convId); return next; });
            }

            if (isActiveConversationEvent) {
                if (
                    event.type === 'task_failed' &&
                    !isAuthRequired &&
                    event.errorCode !== 'INSUFFICIENT_CREDITS' &&
                    event.task.content.trim().length === 0
                ) {
                    const errorMessage: ChatMessage = {
                        id: `chat-error-${Date.now()}`,
                        role: 'assistant',
                        content: event.errorMessage || '抱歉，服务暂时不可用。请稍后再试。',
                        createdAt: new Date().toISOString(),
                    };
                    setMessages([...event.task.messages, errorMessage]);
                } else {
                    setMessages(event.task.messages);
                }
                if (taskDreamContext) setDreamContext(taskDreamContext);
            }

            if (event.type === 'task_billed' || event.type === 'task_completed' || event.type === 'task_stopped' || event.type === 'task_failed') {
                void refreshBootstrap();
            }
            if (hasLoadedConversationsRef.current && (event.type === 'task_completed' || event.type === 'task_stopped' || event.type === 'task_failed')) {
                void refreshConversationList();
            }
            if (event.type === 'task_failed' && event.errorCode === 'INSUFFICIENT_CREDITS' && isActiveConversationEvent) {
                markCreditsExhausted(event.errorMessage);
            }
            if (event.type === 'task_failed' && isAuthRequired) {
                showToast('info', event.errorMessage || '请先登录后再使用 AI 对话');
            }
        });
        return unsubscribe;
    }, [markCreditsExhausted, refreshBootstrap, refreshConversationList, showToast, activeConversationIdRef, hasLoadedConversationsRef, setMessages, setStreamingConversationIds, setDreamContext]);

    // KB event listeners
    useEffect(() => {
        const handler = (event: Event) => {
            const detail = (event as CustomEvent<{ sourceType?: string }>).detail;
            if (detail?.sourceType === 'conversation') void refreshConversationList();
        };
        window.addEventListener('mingai:knowledge-base:ingested', handler as EventListener);
        const onPromptUpdate = () => { void refreshBootstrap(); };
        window.addEventListener('mingai:knowledge-base:prompt-updated', onPromptUpdate as EventListener);
        return () => {
            window.removeEventListener('mingai:knowledge-base:ingested', handler as EventListener);
            window.removeEventListener('mingai:knowledge-base:prompt-updated', onPromptUpdate as EventListener);
        };
    }, [refreshBootstrap, refreshConversationList]);

    const handleArchiveMessage = useCallback((message: ChatMessage) => {
        if (!activeConversationId || !knowledgeBaseEnabled) return;
        setKbTargetMessage(message);
        setKbModalOpen(true);
    }, [activeConversationId, knowledgeBaseEnabled, setKbTargetMessage, setKbModalOpen]);

    const closeKbModal = useCallback(() => {
        setKbModalOpen(false);
        setKbTargetMessage(null);
    }, [setKbModalOpen, setKbTargetMessage]);

    // Stop AI reply
    const handleStop = useCallback(() => {
        if (!activeConversationId) return;
        chatStreamManager.stopTask(activeConversationId);
    }, [activeConversationId]);

    // Send message
    const handleSend = async () => {
        const trimmedInput = inputValue.trim();
        if (!trimmedInput || isLoading || isSendingToList) return;
        if (dreamMode && dreamContextLoading) return;
        setIsSendingToList(true);

        const messageMentions = sanitizeOutgoingMentions(mentions);
        const isNewConversation = !activeConversationId;
        const draftTitle = isNewConversation ? buildDraftTitle(trimmedInput) : null;
        let conversationId = activeConversationId;
        try {
            if (!isNewConversation && !conversationValidatedRef.current) {
                showToast('info', '会话加载中，请稍后再试');
                return;
            }
            if (isNewConversation && userId) {
                setPendingSidebarTitle(draftTitle || '新对话');
                setHasLoadedConversations(true);
                const newId = await createConversation({
                    userId,
                    personality: 'general',
                    title: draftTitle || '新对话',
                    baziChartId: chatChartIds?.baziId,
                    ziweiChartId: chatChartIds?.ziweiId,
                });
                if (newId) {
                    conversationId = newId;
                    activeConversationIdRef.current = newId;
                    conversationValidatedRef.current = true;
                    setActiveConversationId(newId);
                    if (searchParams.get('id') !== newId) router.replace(`/chat?id=${newId}`);
                    setPendingSidebarTitle(null);
                    setTitleGeneratingConversationIds(prev => { const next = new Set(prev); next.add(newId); return next; });
                    const nowIso = new Date().toISOString();
                    setConversations(prev => {
                        const nextConversation: Conversation = {
                            id: newId, userId, baziChartId: chatChartIds?.baziId, ziweiChartId: chatChartIds?.ziweiId,
                            personality: 'general', title: draftTitle || '新对话', messages: [],
                            createdAt: nowIso, updatedAt: nowIso, sourceType: 'chat', sourceData: {},
                            isArchived: false, archivedKbIds: [],
                        };
                        return [nextConversation, ...prev.filter(c => c.id !== newId)];
                    });
                    setHasLoadedConversations(true);
                    void refreshConversationList(userId);
                } else {
                    setPendingSidebarTitle(null);
                }
            }
            if (!conversationId) { showToast('error', '创建对话失败，请重试'); return; }
            if (chatStreamManager.isConversationRunning(conversationId)) { showToast('info', '当前会话正在生成中，请稍后再试'); return; }

            const dreamInfo: DreamInterpretationInfo | undefined = dreamMode ? {
                userName: user?.user_metadata?.nickname || ANONYMOUS_DISPLAY_NAME,
                dreamDate: new Date().toISOString(),
                dreamContent: trimmedInput.slice(0, 50),
            } : undefined;

            const userMessage: ChatMessage = {
                id: Date.now().toString(), role: 'user', content: trimmedInput, createdAt: new Date().toISOString(),
                mentions: messageMentions.length ? [...messageMentions] : undefined,
                attachments: (attachmentState.file || attachmentState.webSearchEnabled) ? { fileName: attachmentState.file?.name || '', webSearchEnabled: attachmentState.webSearchEnabled } : undefined,
                dreamInfo,
            };
            const newMessages = [...messages, userMessage];
            const assistantMessageId = (Date.now() + 1).toString();
            const initialAssistantMessage: ChatMessage = {
                id: assistantMessageId, role: 'assistant', content: '', createdAt: new Date().toISOString(), model: selectedModel,
                modelName: resolveClientModelName(selectedModel, selectedModel),
                chartInfo: chatChartInfo,
            };
            const optimisticMessages = [...newMessages, initialAssistantMessage];
            setMessages(optimisticMessages);
            setInputValue('');
            setMentions([]);
            const sessionPromise = supabase.auth.getSession();
            const saveSucceeded = await saveMessages(conversationId, newMessages, isNewConversation ? (draftTitle || undefined) : undefined);
            if (!saveSucceeded) {
                if (isNewConversation) {
                    await deleteConversation(conversationId);
                    if (activeConversationIdRef.current === conversationId) {
                        activeConversationIdRef.current = null;
                        conversationValidatedRef.current = false;
                        setActiveConversationId(null);
                        setMessages([]);
                        router.replace('/chat');
                    }
                    setConversations(prev => prev.filter(conv => conv.id !== conversationId));
                    setPendingSidebarTitle(null);
                    setHasLoadedConversations(true);
                    void refreshConversationList(userId);
                } else if (conversationId === activeConversationIdRef.current) {
                    setMessages(messages);
                }
                showToast('error', '保存对话失败，请重试');
                return;
            }

            if (isNewConversation && draftTitle) {
                const createdConversationId = conversationId;
                void (async () => {
                    try {
                        const nextTitle = (await generateAITitle([userMessage])).trim();
                        if (!nextTitle || nextTitle === draftTitle) return;
                        if (manualRenamedConversationIdsRef.current.has(createdConversationId)) return;
                        setConversations(prev => prev.map(conv => conv.id === createdConversationId && conv.title === draftTitle ? { ...conv, title: nextTitle } : conv));
                        await renameConversation(createdConversationId, nextTitle);
                    } catch { /* ignore */ } finally {
                        setTitleGeneratingConversationIds(prev => { const next = new Set(prev); next.delete(createdConversationId); return next; });
                    }
                })();
            }

            const { data: { session } } = await sessionPromise;
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

            let difyContext: DifyContext | undefined;
            if (attachmentState.file || attachmentState.webSearchEnabled) {
                const mode = attachmentState.file && attachmentState.webSearchEnabled ? 'all' : attachmentState.file ? 'file' : 'web';
                const formData = new FormData();
                formData.append('mode', mode);
                formData.append('query', trimmedInput);
                if (attachmentState.file) formData.append('file', attachmentState.file);
                const difyResponse = await fetch('/api/dify/enhance', { method: 'POST', headers: { 'Authorization': headers.Authorization || '' }, body: formData });
                if (difyResponse.ok) {
                    const difyResult = await difyResponse.json();
                    if (difyResult.success && difyResult.data) {
                        difyContext = { webContent: difyResult.data.web_content, fileContent: difyResult.data.file_content };
                        setAttachmentState(prev => ({ ...prev, file: undefined }));
                    }
                } else {
                    const errorData = await difyResponse.json();
                    if (errorData.code === 'MEMBERSHIP_REQUIRED') console.warn('Dify权限不足:', errorData.error);
                }
            }

            const startResult = await chatStreamManager.startTask({
                conversationId, requestHeaders: headers,
                requestBody: { messages: newMessages, personality: 'general', stream: true, model: selectedModel, chartIds: chatChartIds, reasoning: reasoningEnabled, difyContext, mentions: messageMentions, dreamMode },
                baseMessages: newMessages, assistantMessage: initialAssistantMessage,
            });
            if (!startResult.ok) {
                if (conversationId === activeConversationIdRef.current) setMessages(newMessages);
                if (startResult.code === 'INSUFFICIENT_CREDITS') markCreditsExhausted(startResult.message);
                else showToast(startResult.code === 'CONVERSATION_BUSY' ? 'info' : 'error', startResult.message);
            }
        } catch (error) {
            console.error('发送失败:', error);
            if (conversationId === activeConversationIdRef.current) {
                const errorMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: 'assistant', content: '抱歉，服务暂时不可用。请稍后再试。', createdAt: new Date().toISOString() };
                setMessages(prev => { const last = prev[prev.length - 1]; return last?.role === 'assistant' && !last.content ? [...prev.slice(0, -1), errorMessage] : [...prev, errorMessage]; });
            }
        } finally {
            setPendingSidebarTitle(null);
            setIsSendingToList(false);
        }
    };

    // Edit message and resend
    const handleEditMessage = async (messageId: string, newContent: string, nextMentions?: Mention[]) => {
        const targetConversationId = activeConversationIdRef.current;
        if (!targetConversationId) return;
        const isTargetActive = () => targetConversationId === activeConversationIdRef.current;
        const originalSnapshot = messages;
        const messageIndex = messages.findIndex(m => m.id === messageId);
        if (messageIndex === -1) return;

        const originalMessage = messages[messageIndex];
        const originalAiMessage = messages[messageIndex + 1];
        const originalAiContent = originalAiMessage?.role === 'assistant' ? originalAiMessage.content : '';
        const previousMessages = messages.slice(0, messageIndex);
        const subsequentMessages = messages.slice(messageIndex + 2);

        const existingVersions = [...(originalMessage.versions || [])];
        if (existingVersions.length === 0 && originalMessage.content) {
            existingVersions.push({ userContent: originalMessage.content, mentions: originalMessage.mentions ? [...originalMessage.mentions] : undefined, aiContent: originalAiContent, createdAt: originalMessage.createdAt, subsequentMessages: subsequentMessages.length > 0 ? subsequentMessages : undefined });
        } else if (existingVersions.length > 0 && subsequentMessages.length > 0) {
            const idx = originalMessage.currentVersionIndex ?? existingVersions.length - 1;
            if (existingVersions[idx] && !existingVersions[idx].subsequentMessages) existingVersions[idx] = { ...existingVersions[idx], subsequentMessages };
        }

        const messageMentions = sanitizeOutgoingMentions(Array.isArray(nextMentions) ? nextMentions : (originalMessage.mentions ?? []));
        const updatedUserMessage: ChatMessage = { ...originalMessage, content: newContent, mentions: messageMentions.length ? [...messageMentions] : undefined, versions: existingVersions, currentVersionIndex: existingVersions.length - 1 };
        const newMessages = [...previousMessages, updatedUserMessage];
        if (isTargetActive()) setMessages(newMessages);

        const assistantMessageId = (Date.now() + 1).toString();
        const initialAssistantMessage: ChatMessage = {
            id: assistantMessageId,
            role: 'assistant',
            content: '',
            createdAt: new Date().toISOString(),
            model: selectedModel,
            modelName: resolveClientModelName(selectedModel, selectedModel),
            chartInfo: chatChartInfo,
        };
        if (isTargetActive()) setMessages([...newMessages, initialAssistantMessage]);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

            const onBeforeSave = (finalMessages: ChatMessage[], assistantContent: string): ChatMessage[] => {
                const newVersion = { userContent: newContent, mentions: messageMentions.length ? [...messageMentions] : undefined, aiContent: assistantContent || '抱歉，我暂时无法回答这个问题。', createdAt: new Date().toISOString() };
                const updatedVersions = [...existingVersions, newVersion];
                const finalUserMessage: ChatMessage = { ...updatedUserMessage, versions: updatedVersions, currentVersionIndex: updatedVersions.length - 1 };
                return finalMessages.map(msg => msg.id === updatedUserMessage.id ? finalUserMessage : msg);
            };

            const startResult = await chatStreamManager.startTask({
                conversationId: targetConversationId, requestHeaders: headers,
                requestBody: { messages: newMessages, personality: 'general', stream: true, model: selectedModel, chartIds: chatChartIds, reasoning: reasoningEnabled, mentions: messageMentions, dreamMode },
                baseMessages: newMessages, assistantMessage: initialAssistantMessage, onBeforeSave,
            });
            if (!startResult.ok) {
                if (isTargetActive()) setMessages(originalSnapshot);
                if (startResult.code === 'INSUFFICIENT_CREDITS') markCreditsExhausted(startResult.message);
                else showToast(startResult.code === 'CONVERSATION_BUSY' ? 'info' : 'error', startResult.message);
            }
        } catch (error) {
            console.error('编辑发送失败:', error);
            if (isTargetActive()) setMessages(prev => [...prev.slice(0, -1), { id: (Date.now() + 1).toString(), role: 'assistant', content: '抱歉，服务暂时不可用。', createdAt: new Date().toISOString() }]);
        }
    };

    // Regenerate AI response
    const handleRegenerateResponse = async (messageId: string) => {
        const targetConversationId = activeConversationIdRef.current;
        if (!targetConversationId) return;
        const isTargetActive = () => targetConversationId === activeConversationIdRef.current;
        const originalSnapshot = messages;
        const messageIndex = messages.findIndex(m => m.id === messageId);
        if (messageIndex === -1 || messageIndex === 0) return;

        const oldAiMessage = messages[messageIndex];
        const oldAiContent = oldAiMessage.role === 'assistant' ? oldAiMessage.content : '';
        const previousMessages = messages.slice(0, messageIndex);
        const subsequentMessages = messages.slice(messageIndex + 1);

        const userMessageIndex = [...previousMessages].reverse().findIndex(msg => msg.role === 'user');
        const lastUserMessage = userMessageIndex >= 0 ? previousMessages[previousMessages.length - 1 - userMessageIndex] : undefined;
        const messageMentions = sanitizeOutgoingMentions(lastUserMessage?.mentions ?? []);

        let updatedPreviousMessages = previousMessages;
        let existingVersions: NonNullable<ChatMessage['versions']> = [];
        if (lastUserMessage) {
            existingVersions = [...(lastUserMessage.versions || [])];
            if (existingVersions.length === 0 && oldAiContent) {
                existingVersions.push({ userContent: lastUserMessage.content, mentions: lastUserMessage.mentions ? [...lastUserMessage.mentions] : undefined, aiContent: oldAiContent, createdAt: oldAiMessage.createdAt || new Date().toISOString(), subsequentMessages: subsequentMessages.length > 0 ? subsequentMessages : undefined });
            } else if (existingVersions.length > 0 && subsequentMessages.length > 0) {
                const currentVersionIdx = lastUserMessage.currentVersionIndex ?? existingVersions.length - 1;
                if (existingVersions[currentVersionIdx] && !existingVersions[currentVersionIdx].subsequentMessages) existingVersions[currentVersionIdx] = { ...existingVersions[currentVersionIdx], subsequentMessages };
            }
            const updatedUserMessage: ChatMessage = {
                ...lastUserMessage,
                mentions: messageMentions.length ? [...messageMentions] : undefined,
                versions: existingVersions,
                currentVersionIndex: existingVersions.length - 1,
            };
            updatedPreviousMessages = previousMessages.map(m => m.id === lastUserMessage.id ? updatedUserMessage : m);
        }

        const assistantMessageId = (Date.now() + 1).toString();
        const initialAssistantMessage: ChatMessage = {
            id: assistantMessageId,
            role: 'assistant',
            content: '',
            createdAt: new Date().toISOString(),
            model: selectedModel,
            modelName: resolveClientModelName(selectedModel, selectedModel),
        };
        if (isTargetActive()) setMessages([...updatedPreviousMessages, initialAssistantMessage]);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

            const onBeforeSave = lastUserMessage
                ? (finalMessages: ChatMessage[], assistantContent: string): ChatMessage[] => {
                    const newVersion = { userContent: lastUserMessage.content, mentions: messageMentions.length ? [...messageMentions] : undefined, aiContent: assistantContent || '抱歉，我暂时无法回答这个问题。', createdAt: new Date().toISOString() };
                    const updatedVersions = [...existingVersions, newVersion];
                    const finalUserMessage: ChatMessage = {
                        ...lastUserMessage,
                        mentions: messageMentions.length ? [...messageMentions] : undefined,
                        versions: updatedVersions,
                        currentVersionIndex: updatedVersions.length - 1,
                    };
                    return finalMessages.map(msg => msg.id === lastUserMessage.id ? finalUserMessage : msg);
                }
                : undefined;

            const startResult = await chatStreamManager.startTask({
                conversationId: targetConversationId, requestHeaders: headers,
                requestBody: { messages: updatedPreviousMessages, personality: 'general', stream: true, model: selectedModel, chartIds: chatChartIds, reasoning: reasoningEnabled, mentions: messageMentions, dreamMode },
                baseMessages: updatedPreviousMessages, assistantMessage: initialAssistantMessage, onBeforeSave,
            });
            if (!startResult.ok) {
                if (isTargetActive()) setMessages(originalSnapshot);
                if (startResult.code === 'INSUFFICIENT_CREDITS') markCreditsExhausted(startResult.message);
                else showToast(startResult.code === 'CONVERSATION_BUSY' ? 'info' : 'error', startResult.message);
            }
        } catch (error) {
            console.error('重新生成失败:', error);
            if (isTargetActive()) setMessages(prev => [...prev.slice(0, -1), { id: (Date.now() + 1).toString(), role: 'assistant', content: '抱歉，服务暂时不可用。', createdAt: new Date().toISOString() }]);
        }
    };

    // Switch message version
    const handleSwitchVersion = useCallback((messageId: string, versionIndex: number) => {
        setMessages(prev => {
            const messageIndex = prev.findIndex(m => m.id === messageId);
            if (messageIndex === -1) return prev;
            const message = prev[messageIndex];
            if (!message.versions || versionIndex < 0 || versionIndex >= message.versions.length) return prev;
            const version = message.versions[versionIndex];
            const previousMessages = prev.slice(0, messageIndex);
            const versionMentions = sanitizeOutgoingMentions(version.mentions ?? message.mentions);
            const updatedUserMessage: ChatMessage = { ...message, content: version.userContent, mentions: versionMentions ? [...versionMentions] : undefined, currentVersionIndex: versionIndex };
            const aiMessage: ChatMessage = { id: `ai-version-${versionIndex}-${Date.now()}`, role: 'assistant', content: version.aiContent, createdAt: version.createdAt };
            let newMessages = [...previousMessages, updatedUserMessage, aiMessage];
            if (version.subsequentMessages?.length) newMessages = [...newMessages, ...version.subsequentMessages];
            if (userId && activeConversationId) void saveMessages(activeConversationId, newMessages);
            return newMessages;
        });
    }, [activeConversationId, sanitizeOutgoingMentions, saveMessages, setMessages, userId]);

    return {
        scrollToBottom,
        handleMessageListScroll,
        markCreditsExhausted,
        handleArchiveMessage,
        closeKbModal,
        handleStop,
        handleSend,
        handleEditMessage,
        handleRegenerateResponse,
        handleSwitchVersion,
    };
}
