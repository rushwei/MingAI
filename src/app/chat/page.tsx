/**
 * AI 对话页面
 * 
 * 'use client' 标记说明：
 * - 页面包含实时对话交互，需要在客户端运行
 */
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Lock, BookOpenText, MessageCircleHeart } from 'lucide-react';
import Link from 'next/link';
import type { ChatMessage, Conversation, AttachmentState, DifyContext, Mention, AIMessageMetadata, DreamInterpretationInfo } from '@/types';
import { ANONYMOUS_DISPLAY_NAME } from '@/types';

import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { VirtualizedChatMessageList } from '@/components/chat/VirtualizedChatMessageList';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { DEFAULT_MODEL_ID } from '@/lib/ai-config';
import { ConversationSidebar } from '@/components/chat/ConversationSidebar';
import { BaziChartSelector, type SelectedCharts } from '@/components/chat/BaziChartSelector';
import { AddToKnowledgeBaseModal } from '@/components/knowledge-base/AddToKnowledgeBaseModal';
import { LoginOverlay } from '@/components/auth/LoginOverlay';
import { CreditsModal } from '@/components/ui/CreditsModal';
import { useSessionSafe } from '@/components/providers/ClientProviders';
import { usePaymentPause } from '@/lib/usePaymentPause';
import { useHeaderMenu } from '@/components/layout/HeaderMenuContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import {
    loadConversations,
    loadConversation,
    createConversation,
    saveConversation,
    deleteConversation,
    renameConversation,
} from '@/lib/conversation';
import { supabase } from '@/lib/supabase';
import { getMembershipInfo, type MembershipInfo } from '@/lib/membership';
import { buildDraftTitle } from '@/lib/draft-title';
import { isNearBottom } from '@/lib/chat-scroll';
import { chatStreamManager } from '@/lib/chat-stream-manager';


// AI 生成对话标题（使用专用 API，不消耗积分）
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

export default function ChatPage() {
    // 路由和菜单
    const router = useRouter();
    const searchParams = useSearchParams();
    const { showToast } = useToast();
    const { setMenuItems, clearMenuItems } = useHeaderMenu();

    // 对话管理状态
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [conversationsLoading, setConversationsLoading] = useState(true);
    const [hasLoadedConversations, setHasLoadedConversations] = useState(false);
    const [pendingSidebarTitle, setPendingSidebarTitle] = useState<string | null>(null);
    const [titleGeneratingConversationIds, setTitleGeneratingConversationIds] = useState<Set<string>>(new Set());
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [credits, setCredits] = useState<number | null>(null);
    const [membership, setMembership] = useState<MembershipInfo | null>(null);
    const [showCreditsModal, setShowCreditsModal] = useState(false);
    const { isPaused: isPaymentPaused } = usePaymentPause();
    const { user, loading: sessionLoading } = useSessionSafe();

    // 消息状态
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isSendingToList, setIsSendingToList] = useState(false); // 点击发送后，消息写入列表前的短暂阶段
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const messageScrollContainerRef = useRef<HTMLDivElement | null>(null);
    const shouldAutoScrollRef = useRef(true);
    const manualRenamedConversationIdsRef = useRef<Set<string>>(new Set());
    const activeConversationIdRef = useRef<string | null>(null);
    const hasLoadedConversationsRef = useRef(false);
    const conversationSelectRequestRef = useRef(0);
    const conversationsRef = useRef(conversations);
    conversationsRef.current = conversations;
    const conversationValidatedRef = useRef(false); // 会话是否已通过 loadConversation 验证

    // 命盘选择器状态
    const [chartSelectorOpen, setChartSelectorOpen] = useState(false);
    const [selectedCharts, setSelectedCharts] = useState<SelectedCharts>({});
    const [chartFocusType, setChartFocusType] = useState<'bazi' | 'ziwei' | undefined>(undefined);

    // 模型和推理状态
    const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL_ID);
    const [reasoningEnabled, setReasoningEnabled] = useState(false);

    // 附件和搜索状态
    const [attachmentState, setAttachmentState] = useState<AttachmentState>({
        file: undefined,
        webSearchEnabled: false,
    });
    const [mentions, setMentions] = useState<Mention[]>([]);
    const [promptKnowledgeBases, setPromptKnowledgeBases] = useState<Array<{ id: string; name: string; description: string | null }>>([]);
    const [kbModalOpen, setKbModalOpen] = useState(false);
    const [kbTargetMessage, setKbTargetMessage] = useState<ChatMessage | null>(null);

    // 解梦模式状态
    const [dreamMode, setDreamMode] = useState(false);
    const [dreamContext, setDreamContext] = useState<{ baziChartName?: string; dailyFortune?: string } | undefined>(undefined);
    const [dreamContextLoading, setDreamContextLoading] = useState(false);

    // 通过 state 跟踪正在流式生成的会话，确保 streaming 状态变化能触发重渲染
    const [streamingConversationIds, setStreamingConversationIds] = useState<Set<string>>(new Set());
    const isLoading = activeConversationId
        ? streamingConversationIds.has(activeConversationId)
        : false;

    useEffect(() => {
        activeConversationIdRef.current = activeConversationId;
    }, [activeConversationId]);

    useEffect(() => {
        hasLoadedConversationsRef.current = hasLoadedConversations;
    }, [hasLoadedConversations]);

    // 注册移动端顶部菜单项（个性化和知识库）
    useEffect(() => {
        const menuItems = [
            {
                id: 'ai-settings',
                label: '个性化',
                icon: <MessageCircleHeart className="w-4 h-4" />,
                onClick: () => router.push('/user/settings/ai'),
            },
        ];

        // 非免费用户显示知识库入口
        if (membership?.type !== 'free') {
            menuItems.push({
                id: 'knowledge-base',
                label: '知识库',
                icon: <BookOpenText className="w-4 h-4" />,
                onClick: () => router.push('/user/knowledge-base'),
            });
        }

        setMenuItems(menuItems);
        return () => clearMenuItems();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [membership?.type]);

    // 当解梦模式开启时获取参考数据（仅用于 UI 显示，服务端会始终获取最新数据）
    useEffect(() => {
        let isActive = true;
        if (!dreamMode || !userId) {
            setDreamContext(undefined);
            setDreamContextLoading(false);
            return () => {
                isActive = false;
            };
        }

        const fetchDreamContext = async () => {
            setDreamContextLoading(true);
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const headers: Record<string, string> = {};
                if (session?.access_token) {
                    headers.Authorization = `Bearer ${session.access_token}`;
                }

                const response = await fetch('/api/dream-context', {
                    headers,
                });

                if (!response.ok) {
                    throw new Error('请求失败');
                }

                const data = await response.json();
                if (!isActive) return;
                setDreamContext(data?.dreamContext);
            } catch (error) {
                if (!isActive) return;
                console.error('获取解梦上下文失败:', error);
                setDreamContext(undefined);
            } finally {
                if (isActive) {
                    setDreamContextLoading(false);
                }
            }
        };

        fetchDreamContext();
        return () => {
            isActive = false;
        };
    }, [dreamMode, userId]);

    // 仅当用户仍贴近底部时自动跟随，避免用户上滑查看历史时被强制拉回
    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        messagesEndRef.current?.scrollIntoView({ behavior, block: 'end' });
    }, []);

    const handleMessageListScroll = useCallback(() => {
        const container = messageScrollContainerRef.current;
        if (!container) return;
        shouldAutoScrollRef.current = isNearBottom({
            scrollHeight: container.scrollHeight,
            scrollTop: container.scrollTop,
            clientHeight: container.clientHeight,
        });
    }, []);

    useEffect(() => {
        if (!messages.length || !shouldAutoScrollRef.current) return;
        scrollToBottom(isLoading ? 'auto' : 'smooth');
    }, [isLoading, messages, scrollToBottom]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        // 手机端默认关闭侧边栏，桌面端默认折叠显示
        setSidebarOpen(false);
        setSidebarCollapsed(window.innerWidth >= 1024);
    }, []);

    const handleArchiveMessage = useCallback((message: ChatMessage) => {
        if (!activeConversationId) return;
        setKbTargetMessage(message);
        setKbModalOpen(true);
    }, [activeConversationId]);

    const closeKbModal = useCallback(() => {
        setKbModalOpen(false);
        setKbTargetMessage(null);
    }, []);

    const refreshMembership = useCallback(async (targetUserId?: string | null) => {
        const id = targetUserId ?? userId;
        if (!id) return;
        const memberInfo = await getMembershipInfo(id);
        if (memberInfo) {
            setMembership(memberInfo);
            setCredits(memberInfo.aiChatCount);
        }
    }, [userId]);

    const markCreditsExhausted = useCallback((message?: string) => {
        setCredits(0);
        setMembership(prev => prev ? { ...prev, aiChatCount: 0 } : prev);
        setShowCreditsModal(true);
        if (message) {
            showToast('info', message);
        }
    }, [showToast]);

    const refreshPromptKnowledgeBases = useCallback(async (targetUserId?: string | null) => {
        const id = targetUserId ?? userId;
        if (!id) return;
        const { data: settings } = await supabase
            .from('user_settings')
            .select('prompt_kb_ids')
            .eq('user_id', id)
            .maybeSingle();
        const rawIds = Array.isArray((settings as { prompt_kb_ids?: unknown })?.prompt_kb_ids)
            ? (settings as { prompt_kb_ids: unknown[] }).prompt_kb_ids
            : [];
        const kbIds = rawIds.filter((value): value is string => typeof value === 'string' && value.length > 0);
        if (kbIds.length === 0) {
            setPromptKnowledgeBases([]);
            return;
        }
        const { data: kbs } = await supabase
            .from('knowledge_bases')
            .select('id, name, description')
            .eq('user_id', id)
            .in('id', kbIds);
        const kbMap = new Map((kbs || []).map(kb => [kb.id, kb]));
        const ordered = kbIds.map(kbId => kbMap.get(kbId)).filter(Boolean) as Array<{ id: string; name: string; description: string | null }>;
        setPromptKnowledgeBases(ordered);
    }, [userId]);

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

    // 获取用户ID并加载对话列表
    useEffect(() => {
        let isActive = true;
        const init = async () => {
            if (sessionLoading) return;
            if (!user) {
                if (!isActive) return;
                setUserId(null);
                setConversations([]);
                setMessages([]);
                activeConversationIdRef.current = null;
                conversationSelectRequestRef.current += 1;
                setActiveConversationId(null);
                setConversationsLoading(false);
                setHasLoadedConversations(false);
                return;
            }
            setUserId(user.id);
            // 并行化 API 调用，提升 30-50% 加载速度
            await Promise.all([
                refreshMembership(user.id),
                refreshPromptKnowledgeBases(user.id),
            ]);
            if (!isActive) return;
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
        return () => {
            isActive = false;
        };
    }, [refreshMembership, refreshPromptKnowledgeBases, sessionLoading, user, triggerConversationListLoad]);

    useEffect(() => {
        if (!sidebarOpen) return;
        triggerConversationListLoad('interaction');
    }, [sidebarOpen, triggerConversationListLoad]);

    useEffect(() => {
        const handler = (event: Event) => {
            const detail = (event as CustomEvent<{ sourceType?: string }>).detail;
            if (detail?.sourceType === 'conversation') {
                void refreshConversationList();
            }
        };
        window.addEventListener('mingai:knowledge-base:ingested', handler as EventListener);
        const onPromptUpdate = () => {
            void refreshPromptKnowledgeBases();
        };
        window.addEventListener('mingai:knowledge-base:prompt-updated', onPromptUpdate as EventListener);
        return () => {
            window.removeEventListener('mingai:knowledge-base:ingested', handler as EventListener);
            window.removeEventListener('mingai:knowledge-base:prompt-updated', onPromptUpdate as EventListener);
        };
    }, [refreshConversationList, refreshPromptKnowledgeBases]);

    useEffect(() => {
        const unsubscribe = chatStreamManager.subscribe((event) => {
            const convId = event.task.conversationId;
            const currentActiveConversationId = activeConversationIdRef.current;
            const isActiveConversationEvent = convId === currentActiveConversationId;
            const taskDreamContext = (event.task.metadata as AIMessageMetadata | undefined)?.dreamContext;
            const isAuthRequired = event.errorCode === 'AUTH_REQUIRED'
                || event.errorMessage?.includes('请先登录') === true;

            // 更新 streaming 状态 set，驱动 isLoading 重渲染
            if (event.type === 'task_started') {
                setStreamingConversationIds(prev => {
                    const next = new Set(prev);
                    next.add(convId);
                    return next;
                });
            } else if (event.type === 'task_completed' || event.type === 'task_stopped' || event.type === 'task_failed') {
                setStreamingConversationIds(prev => {
                    const next = new Set(prev);
                    next.delete(convId);
                    return next;
                });
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

                if (taskDreamContext) {
                    setDreamContext(taskDreamContext);
                }
            }

            if (
                event.type === 'task_billed' ||
                event.type === 'task_completed' ||
                event.type === 'task_stopped' ||
                event.type === 'task_failed'
            ) {
                void refreshMembership();
            }

            if (
                hasLoadedConversationsRef.current &&
                (event.type === 'task_completed' || event.type === 'task_stopped' || event.type === 'task_failed')
            ) {
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
    }, [markCreditsExhausted, refreshConversationList, refreshMembership, showToast]);

    // 选择对话
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
        conversationValidatedRef.current = false; // 加载验证前标记为未验证

        const runningMessages = chatStreamManager.getTaskMessages(id);
        if (runningMessages) {
            setMessages(runningMessages);
        } else {
            const cachedConversation = conversationsRef.current.find(conv => conv.id === id);
            setMessages(cachedConversation?.messages || []);
        }

        if (options?.updateUrl !== false && searchParams.get('id') !== id) {
            router.replace(`/chat?id=${id}`);
        }

        const conv = await loadConversation(id);
        if (requestId !== conversationSelectRequestRef.current) {
            return;
        }
        if (!conv) {
            // 会话不存在或已删除，重置到空状态
            activeConversationIdRef.current = null;
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

        // 从最后一条 AI 消息恢复命盘显示
        const lastAIMessage = [...sourceMessages].reverse().find(m => m.role === 'assistant' && m.chartInfo);
        const chartInfo = lastAIMessage?.chartInfo;

        const newChartSelection: SelectedCharts = {};

        if (chartInfo?.baziName) {
            newChartSelection.bazi = {
                id: '', // 历史记录只有名字，没有ID
                name: chartInfo.baziName,
                info: '(历史)'
            };
        }

        if (chartInfo?.ziweiName) {
            newChartSelection.ziwei = {
                id: '',
                name: chartInfo.ziweiName,
                info: '(历史)'
            };
        }

        setSelectedCharts(newChartSelection);
    }, [router, searchParams]);

    // 新建对话
    const handleNewChat = useCallback(async () => {
        shouldAutoScrollRef.current = true;
        conversationSelectRequestRef.current += 1;
        activeConversationIdRef.current = null;
        setActiveConversationId(null);
        setMessages([]);
        setSelectedCharts({}); // 清空命盘显示
        // 保持当前选择的人格，不重置
        setSidebarOpen(false);
        if (searchParams.get('id')) {
            router.replace('/chat');
        }
    }, [router, searchParams]);

    useEffect(() => {
        if (!userId) return;
        const targetConversationId = searchParams.get('id');
        if (!targetConversationId || targetConversationId === activeConversationIdRef.current) return;
        void handleSelectConversation(targetConversationId, { updateUrl: false });
    }, [handleSelectConversation, searchParams, userId]);

    // 删除对话（乐观更新）
    const handleDeleteConversation = useCallback(async (id: string) => {
        // 乐观更新：先从 UI 移除
        const previousConversations = conversations;
        setConversations(prev => prev.filter(c => c.id !== id));
        if (activeConversationIdRef.current === id) {
            activeConversationIdRef.current = null;
            setActiveConversationId(null);
            setMessages([]);
        }

        // 后台执行删除
        const success = await deleteConversation(id);
        if (!success) {
            // 失败时回滚
            setConversations(previousConversations);
        }
    }, [conversations]);

    // 重命名对话（乐观更新）
    const handleRenameConversation = useCallback(async (id: string, title: string) => {
        manualRenamedConversationIdsRef.current.add(id);
        // 乐观更新：先更新 UI
        const previousConversations = conversations;
        setConversations(prev => prev.map(c =>
            c.id === id ? { ...c, title } : c
        ));

        // 后台执行重命名
        const success = await renameConversation(id, title);
        if (!success) {
            // 失败时回滚
            setConversations(previousConversations);
        }
    }, [conversations]);

    // 保存消息到对话
    const saveMessages = useCallback(async (conversationId: string, newMessages: ChatMessage[], title?: string) => {
        if (!userId) return false;
        return saveConversation(conversationId, newMessages, title);
    }, [userId]);

    // 发送消息
    const handleSend = async () => {
        const trimmedInput = inputValue.trim();
        if (!trimmedInput || isLoading || isSendingToList) return;
        if (dreamMode && dreamContextLoading) return;
        setIsSendingToList(true);

        const messageMentions = mentions;
        const isNewConversation = !activeConversationId;
        const draftTitle = isNewConversation ? buildDraftTitle(trimmedInput) : null;
        let conversationId = activeConversationId;
        try {
            // 非新会话：检查会话是否已通过加载验证，防止向无效会话发送消息
            if (!isNewConversation && !conversationValidatedRef.current) {
                showToast('info', '会话加载中，请稍后再试');
                return;
            }
            // 新对话：先创建对话并用用户消息作为临时标题（不等待 AI 标题）
            if (isNewConversation && userId) {
                setPendingSidebarTitle(draftTitle || '新对话');
                setHasLoadedConversations(true);
                const newId = await createConversation({
                    userId,
                    personality: 'general',
                    title: draftTitle || '新对话',
                    baziChartId: selectedCharts.bazi?.id,
                    ziweiChartId: selectedCharts.ziwei?.id,
                });
                if (newId) {
                    conversationId = newId;
                    activeConversationIdRef.current = newId;
                    conversationValidatedRef.current = true;
                    setActiveConversationId(newId);
                    if (searchParams.get('id') !== newId) {
                        router.replace(`/chat?id=${newId}`);
                    }
                    setPendingSidebarTitle(null);
                    setTitleGeneratingConversationIds(prev => {
                        const next = new Set(prev);
                        next.add(newId);
                        return next;
                    });
                    const nowIso = new Date().toISOString();
                    setConversations(prev => {
                        const nextConversation: Conversation = {
                            id: newId,
                            userId,
                            baziChartId: selectedCharts.bazi?.id,
                            ziweiChartId: selectedCharts.ziwei?.id,
                            personality: 'general',
                            title: draftTitle || '新对话',
                            messages: [],
                            createdAt: nowIso,
                            updatedAt: nowIso,
                            sourceType: 'chat',
                            sourceData: {},
                            isArchived: false,
                            archivedKbIds: [],
                        };
                        const withoutDup = prev.filter(c => c.id !== newId);
                        return [nextConversation, ...withoutDup];
                    });
                    setHasLoadedConversations(true);
                    void refreshConversationList(userId);
                } else {
                    setPendingSidebarTitle(null);
                }
            }

            if (!conversationId) {
                showToast('error', '创建对话失败，请重试');
                return;
            }

            if (chatStreamManager.isConversationRunning(conversationId)) {
                showToast('info', '当前会话正在生成中，请稍后再试');
                return;
            }

            // 解梦模式下构建 dreamInfo
            const dreamInfo: DreamInterpretationInfo | undefined = dreamMode ? {
                userName: user?.user_metadata?.nickname || ANONYMOUS_DISPLAY_NAME,
                dreamDate: new Date().toISOString(),
                dreamContent: trimmedInput.slice(0, 50),
            } : undefined;

            const userMessage: ChatMessage = {
                id: Date.now().toString(),
                role: 'user',
                content: trimmedInput,
                createdAt: new Date().toISOString(),
                mentions: messageMentions.length ? [...messageMentions] : undefined,
                attachments: (attachmentState.file || attachmentState.webSearchEnabled) ? {
                    fileName: attachmentState.file?.name || '',
                    webSearchEnabled: attachmentState.webSearchEnabled,
                } : undefined,
                dreamInfo,
            };

            const newMessages = [...messages, userMessage];
            setMessages(newMessages);
            setInputValue('');
            setMentions([]);

            await saveMessages(conversationId, newMessages, isNewConversation ? (draftTitle || undefined) : undefined);

            // 新对话：先保存用户首条消息，再异步生成 AI 标题覆盖
            if (isNewConversation && draftTitle) {
                const createdConversationId = conversationId;
                void (async () => {
                    try {
                        const nextTitle = (await generateAITitle([userMessage])).trim();
                        if (!nextTitle || nextTitle === draftTitle) return;
                        if (manualRenamedConversationIdsRef.current.has(createdConversationId)) return;
                        setConversations(prev => prev.map(conv => (
                            conv.id === createdConversationId && conv.title === draftTitle
                                ? { ...conv, title: nextTitle }
                                : conv
                        )));
                        await renameConversation(createdConversationId, nextTitle);
                    } catch {
                        // ignore title generation failures
                    } finally {
                        setTitleGeneratingConversationIds(prev => {
                            const next = new Set(prev);
                            next.delete(createdConversationId);
                            return next;
                        });
                    }
                })();
            }

            const assistantMessageId = (Date.now() + 1).toString();
            const initialAssistantMessage: ChatMessage = {
                id: assistantMessageId,
                role: 'assistant',
                content: '',
                createdAt: new Date().toISOString(),
                model: selectedModel,
                chartInfo: (selectedCharts.bazi?.name || selectedCharts.ziwei?.name) ? {
                    baziName: selectedCharts.bazi?.name,
                    ziweiName: selectedCharts.ziwei?.name,
                } : undefined,
            };
            if (conversationId === activeConversationIdRef.current) {
                setMessages([...newMessages, initialAssistantMessage]);
            }

            const { data: { session } } = await supabase.auth.getSession();
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (session?.access_token) {
                headers.Authorization = `Bearer ${session.access_token}`;
            }

            // 如果有附件或搜索，先调用 Dify API
            let difyContext: DifyContext | undefined;
            if (attachmentState.file || attachmentState.webSearchEnabled) {
                const mode = attachmentState.file && attachmentState.webSearchEnabled
                    ? 'all'
                    : attachmentState.file
                        ? 'file'
                        : 'web';

                const formData = new FormData();
                formData.append('mode', mode);
                formData.append('query', trimmedInput);
                if (attachmentState.file) {
                    formData.append('file', attachmentState.file);
                }

                const difyResponse = await fetch('/api/dify/enhance', {
                    method: 'POST',
                    headers: {
                        'Authorization': headers.Authorization || '',
                    },
                    body: formData,
                });

                if (difyResponse.ok) {
                    const difyResult = await difyResponse.json();
                    if (difyResult.success && difyResult.data) {
                        difyContext = {
                            webContent: difyResult.data.web_content,
                            fileContent: difyResult.data.file_content,
                        };
                        setAttachmentState(prev => ({ ...prev, file: undefined }));
                    }
                } else {
                    const errorData = await difyResponse.json();
                    if (errorData.code === 'MEMBERSHIP_REQUIRED') {
                        console.warn('Dify权限不足:', errorData.error);
                    }
                }
            }

            const startResult = await chatStreamManager.startTask({
                conversationId,
                requestHeaders: headers,
                requestBody: {
                    messages: newMessages,
                    personality: 'general',
                    stream: true,
                    model: selectedModel,
                    chartIds: {
                        baziId: selectedCharts.bazi?.id,
                        ziweiId: selectedCharts.ziwei?.id,
                        baziAnalysisMode: selectedCharts.bazi?.analysisMode,
                    },
                    reasoning: reasoningEnabled,
                    difyContext,
                    mentions: messageMentions,
                    dreamMode,
                },
                baseMessages: newMessages,
                assistantMessage: initialAssistantMessage,
            });

            if (!startResult.ok) {
                if (conversationId === activeConversationIdRef.current) {
                    setMessages(newMessages);
                }
                if (startResult.code === 'INSUFFICIENT_CREDITS') {
                    markCreditsExhausted(startResult.message);
                } else {
                    showToast(startResult.code === 'CONVERSATION_BUSY' ? 'info' : 'error', startResult.message);
                }
            }
        } catch (error) {
            console.error('发送失败:', error);
            if (conversationId === activeConversationIdRef.current) {
                const errorMessage: ChatMessage = {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: '抱歉，服务暂时不可用。请稍后再试。',
                    createdAt: new Date().toISOString(),
                };
                setMessages(prev => {
                    const lastMessage = prev[prev.length - 1];
                    if (lastMessage?.role === 'assistant' && !lastMessage.content) {
                        return [...prev.slice(0, -1), errorMessage];
                    }
                    return [...prev, errorMessage];
                });
            }
        } finally {
            setPendingSidebarTitle(null);
            setIsSendingToList(false);
        }
    };

    // 停止AI回复
    const handleStop = useCallback(() => {
        if (!activeConversationId) return;
        chatStreamManager.stopTask(activeConversationId);
    }, [activeConversationId]);

    // 编辑用户消息并重新发送
    const handleEditMessage = async (messageId: string, newContent: string, nextMentions?: Mention[]) => {
        const targetConversationId = activeConversationIdRef.current;
        if (!targetConversationId) return;

        const isTargetConversationActive = () => targetConversationId === activeConversationIdRef.current;
        const originalMessagesSnapshot = messages;
        // 找到要编辑的消息索引
        const messageIndex = messages.findIndex(m => m.id === messageId);
        if (messageIndex === -1) return;

        const originalMessage = messages[messageIndex];
        // 获取原始 AI 回复（如果存在）
        const originalAiMessage = messages[messageIndex + 1];
        const originalAiContent = originalAiMessage?.role === 'assistant' ? originalAiMessage.content : '';

        // 获取该消息之前的所有消息 (不包含该消息)
        const previousMessages = messages.slice(0, messageIndex);

        // 获取该消息之后的所有消息（用于保存到版本历史）
        const subsequentMessages = messages.slice(messageIndex + 2); // 跳过用户消息和对应的AI回复

        // 构建版本历史
        const existingVersions = [...(originalMessage.versions || [])];
        // 如果没有版本历史，先把原始内容作为第一个版本（包含后续消息）
        if (existingVersions.length === 0 && originalMessage.content) {
            existingVersions.push({
                userContent: originalMessage.content,
                mentions: originalMessage.mentions ? [...originalMessage.mentions] : undefined,
                aiContent: originalAiContent,
                createdAt: originalMessage.createdAt,
                // 保存后续消息到版本历史，以便切换版本时恢复
                subsequentMessages: subsequentMessages.length > 0 ? subsequentMessages : undefined,
            });
        } else if (existingVersions.length > 0 && subsequentMessages.length > 0) {
            // 如果已有版本历史但当前版本有后续消息，更新当前版本
            const currentVersionIdx = originalMessage.currentVersionIndex ?? existingVersions.length - 1;
            if (existingVersions[currentVersionIdx] && !existingVersions[currentVersionIdx].subsequentMessages) {
                existingVersions[currentVersionIdx] = {
                    ...existingVersions[currentVersionIdx],
                    subsequentMessages: subsequentMessages,
                };
            }
        }

        // 更新用户消息（带版本信息，新版本稍后添加）
        const messageMentions = Array.isArray(nextMentions)
            ? nextMentions
            : (originalMessage.mentions ?? []);
        const updatedUserMessage: ChatMessage = {
            ...originalMessage,
            content: newContent,
            mentions: messageMentions.length ? [...messageMentions] : undefined,
            versions: existingVersions,
            currentVersionIndex: existingVersions.length - 1, // 流式过程中暂指向最后一个已有版本，onBeforeSave 会更新为新版本索引
        };

        // 创建新的消息列表（原有消息 + 更新的用户消息）
        const newMessages = [...previousMessages, updatedUserMessage];
        if (isTargetConversationActive()) {
            setMessages(newMessages);
        }

        // 创建新的 AI 消息用于流式更新
        const assistantMessageId = (Date.now() + 1).toString();
        const initialAssistantMessage: ChatMessage = {
            id: assistantMessageId,
            role: 'assistant',
            content: '',
            createdAt: new Date().toISOString(),
            model: selectedModel,
            // 保存当前命盘信息
            chartInfo: (selectedCharts.bazi?.name || selectedCharts.ziwei?.name) ? {
                baziName: selectedCharts.bazi?.name,
                ziweiName: selectedCharts.ziwei?.name,
            } : undefined,
        };
        if (isTargetConversationActive()) {
            setMessages([...newMessages, initialAssistantMessage]);
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (session?.access_token) {
                headers.Authorization = `Bearer ${session.access_token}`;
            }

            // 版本历史后处理钩子：在 manager 保存前插入版本信息
            const onBeforeSave = (finalMessages: ChatMessage[], assistantContent: string): ChatMessage[] => {
                const newVersion = {
                    userContent: newContent,
                    mentions: messageMentions.length ? [...messageMentions] : undefined,
                    aiContent: assistantContent || '抱歉，我暂时无法回答这个问题。',
                    createdAt: new Date().toISOString(),
                };
                const updatedVersions = [...existingVersions, newVersion];
                const finalUserMessage: ChatMessage = {
                    ...updatedUserMessage,
                    versions: updatedVersions,
                    currentVersionIndex: updatedVersions.length - 1,
                };
                // 替换 baseMessages 中的 updatedUserMessage 为带完整版本的 finalUserMessage
                return finalMessages.map(msg =>
                    msg.id === updatedUserMessage.id ? finalUserMessage : msg
                );
            };

            const startResult = await chatStreamManager.startTask({
                conversationId: targetConversationId,
                requestHeaders: headers,
                requestBody: {
                    messages: newMessages,
                    personality: 'general',
                    stream: true,
                    model: selectedModel,
                    chartIds: {
                        baziId: selectedCharts.bazi?.id,
                        ziweiId: selectedCharts.ziwei?.id,
                        baziAnalysisMode: selectedCharts.bazi?.analysisMode,
                    },
                    reasoning: reasoningEnabled,
                    mentions: messageMentions,
                    dreamMode,
                },
                baseMessages: newMessages,
                assistantMessage: initialAssistantMessage,
                onBeforeSave,
            });

            if (!startResult.ok) {
                if (isTargetConversationActive()) {
                    setMessages(originalMessagesSnapshot);
                }
                if (startResult.code === 'INSUFFICIENT_CREDITS') {
                    markCreditsExhausted(startResult.message);
                } else {
                    showToast(startResult.code === 'CONVERSATION_BUSY' ? 'info' : 'error', startResult.message);
                }
            }
        } catch (error) {
            console.error('编辑发送失败:', error);
            if (isTargetConversationActive()) {
                setMessages(prev => [...prev.slice(0, -1), {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: '抱歉，服务暂时不可用。',
                    createdAt: new Date().toISOString(),
                }]);
            }
        }
    };

    // 重新生成 AI 回复（带版本历史）
    const handleRegenerateResponse = async (messageId: string) => {
        const targetConversationId = activeConversationIdRef.current;
        if (!targetConversationId) return;

        const isTargetConversationActive = () => targetConversationId === activeConversationIdRef.current;
        const originalMessagesSnapshot = messages;
        // 找到该 AI 消息的索引
        const messageIndex = messages.findIndex(m => m.id === messageId);
        if (messageIndex === -1 || messageIndex === 0) return;

        const oldAiMessage = messages[messageIndex];
        const oldAiContent = oldAiMessage.role === 'assistant' ? oldAiMessage.content : '';

        // 获取该 AI 消息之前的所有消息（包括触发它的用户消息）
        const previousMessages = messages.slice(0, messageIndex);
        // 获取该 AI 消息之后的后续消息
        const subsequentMessages = messages.slice(messageIndex + 1);

        // 找到触发该 AI 回复的用户消息
        const userMessageIndex = [...previousMessages].reverse().findIndex((msg) => msg.role === 'user');
        const lastUserMessage = userMessageIndex >= 0
            ? previousMessages[previousMessages.length - 1 - userMessageIndex]
            : undefined;
        const messageMentions = lastUserMessage?.mentions ?? [];

        // 构建版本历史（记录在用户消息上）
        let updatedPreviousMessages = previousMessages;
        let existingVersions: NonNullable<ChatMessage['versions']> = [];
        if (lastUserMessage) {
            existingVersions = [...(lastUserMessage.versions || [])];
            // 如果没有版本历史，先把当前内容作为第一个版本
            if (existingVersions.length === 0 && oldAiContent) {
                existingVersions.push({
                    userContent: lastUserMessage.content,
                    mentions: lastUserMessage.mentions ? [...lastUserMessage.mentions] : undefined,
                    aiContent: oldAiContent,
                    createdAt: oldAiMessage.createdAt || new Date().toISOString(),
                    subsequentMessages: subsequentMessages.length > 0 ? subsequentMessages : undefined,
                });
            } else if (existingVersions.length > 0 && subsequentMessages.length > 0) {
                const currentVersionIdx = lastUserMessage.currentVersionIndex ?? existingVersions.length - 1;
                if (existingVersions[currentVersionIdx] && !existingVersions[currentVersionIdx].subsequentMessages) {
                    existingVersions[currentVersionIdx] = {
                        ...existingVersions[currentVersionIdx],
                        subsequentMessages,
                    };
                }
            }

            const updatedUserMessage: ChatMessage = {
                ...lastUserMessage,
                versions: existingVersions,
                currentVersionIndex: existingVersions.length - 1,
            };
            updatedPreviousMessages = previousMessages.map(m =>
                m.id === lastUserMessage.id ? updatedUserMessage : m
            );
        }

        // 创建新的 AI 消息
        const assistantMessageId = (Date.now() + 1).toString();
        const initialAssistantMessage: ChatMessage = {
            id: assistantMessageId,
            role: 'assistant',
            content: '',
            createdAt: new Date().toISOString(),
            model: selectedModel,
        };
        if (isTargetConversationActive()) {
            setMessages([...updatedPreviousMessages, initialAssistantMessage]);
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (session?.access_token) {
                headers.Authorization = `Bearer ${session.access_token}`;
            }

            // 版本历史后处理钩子：在 manager 保存前插入新版本
            const onBeforeSave = lastUserMessage
                ? (finalMessages: ChatMessage[], assistantContent: string): ChatMessage[] => {
                    const newVersion = {
                        userContent: lastUserMessage.content,
                        mentions: lastUserMessage.mentions ? [...lastUserMessage.mentions] : undefined,
                        aiContent: assistantContent || '抱歉，我暂时无法回答这个问题。',
                        createdAt: new Date().toISOString(),
                    };
                    const updatedVersions = [...existingVersions, newVersion];
                    const finalUserMessage: ChatMessage = {
                        ...lastUserMessage,
                        versions: updatedVersions,
                        currentVersionIndex: updatedVersions.length - 1,
                    };
                    return finalMessages.map(msg =>
                        msg.id === lastUserMessage.id ? finalUserMessage : msg
                    );
                }
                : undefined;

            const startResult = await chatStreamManager.startTask({
                conversationId: targetConversationId,
                requestHeaders: headers,
                requestBody: {
                    messages: previousMessages,
                    personality: 'general',
                    stream: true,
                    model: selectedModel,
                    chartIds: {
                        baziId: selectedCharts.bazi?.id,
                        ziweiId: selectedCharts.ziwei?.id,
                        baziAnalysisMode: selectedCharts.bazi?.analysisMode,
                    },
                    reasoning: reasoningEnabled,
                    mentions: messageMentions,
                    dreamMode,
                },
                baseMessages: updatedPreviousMessages,
                assistantMessage: initialAssistantMessage,
                onBeforeSave,
            });

            if (!startResult.ok) {
                if (isTargetConversationActive()) {
                    setMessages(originalMessagesSnapshot);
                }
                if (startResult.code === 'INSUFFICIENT_CREDITS') {
                    markCreditsExhausted(startResult.message);
                } else {
                    showToast(startResult.code === 'CONVERSATION_BUSY' ? 'info' : 'error', startResult.message);
                }
            }
        } catch (error) {
            console.error('重新生成失败:', error);
            if (isTargetConversationActive()) {
                setMessages(prev => [...prev.slice(0, -1), {
                    id: (Date.now() + 1).toString(),
                    role: 'assistant',
                    content: '抱歉，服务暂时不可用。',
                    createdAt: new Date().toISOString(),
                }]);
            }
        }
    };

    // 切换消息版本
    const handleSwitchVersion = useCallback((messageId: string, versionIndex: number) => {
        setMessages(prev => {
            const messageIndex = prev.findIndex(m => m.id === messageId);
            if (messageIndex === -1) return prev;

            const message = prev[messageIndex];
            if (!message.versions || versionIndex < 0 || versionIndex >= message.versions.length) {
                return prev;
            }

            const version = message.versions[versionIndex];

            // 获取该消息之前的所有消息
            const previousMessages = prev.slice(0, messageIndex);

            // 更新用户消息
            const versionMentions = version.mentions ?? message.mentions;
            const updatedUserMessage: ChatMessage = {
                ...message,
                content: version.userContent,
                mentions: versionMentions ? [...versionMentions] : undefined,
                currentVersionIndex: versionIndex,
            };

            // 创建 AI 回复消息
            const aiMessage: ChatMessage = {
                id: `ai-version-${versionIndex}-${Date.now()}`,
                role: 'assistant',
                content: version.aiContent,
                createdAt: version.createdAt,
            };

            // 构建新消息列表：之前的消息 + 用户消息 + AI回复 + 该版本的后续消息
            let newMessages = [...previousMessages, updatedUserMessage, aiMessage];

            // 如果这个版本有保存的后续消息，恢复它们
            if (version.subsequentMessages && version.subsequentMessages.length > 0) {
                newMessages = [...newMessages, ...version.subsequentMessages];
            }

            // 保存到数据库
            if (userId && activeConversationId) {
                void saveMessages(activeConversationId, newMessages);
            }

            return newMessages;
        });
    }, [userId, activeConversationId, saveMessages]);


    const isUnlimited = membership ? membership.type !== 'free' && membership.isActive : false;
    const isCreditLocked = !isUnlimited && credits === 0;

    // 获取最后一条 AI 消息的命盘信息（用于在 Composer 中显示）
    return (
        <LoginOverlay message="登录后即可使用 AI 对话功能">
            <div className="flex h-[calc(100vh-var(--mobile-header-height)-5rem)] lg:h-screen">
                {/* 对话历史侧边栏 */}
                <ConversationSidebar
                    conversations={conversations}
                    activeId={activeConversationId || undefined}
                    pendingTitle={pendingSidebarTitle}
                    generatingTitleConversationIds={titleGeneratingConversationIds}
                    onSelect={handleSelectConversation}
                    onNew={handleNewChat}
                    onDelete={handleDeleteConversation}
                    onRename={handleRenameConversation}
                    isOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    onToggle={setSidebarOpen}
                    isCollapsed={sidebarCollapsed}
                    onCollapse={setSidebarCollapsed}
                    isLoading={conversationsLoading}
                    hasLoaded={hasLoadedConversations}
                />

                {/* 主内容区 */}
                <div className="flex-1 flex flex-col min-w-0 relative">
                    {/* 右上角个性化与知识库入口 - 仅桌面端显示，移动端通过顶部菜单访问 */}
                    <div className="hidden lg:flex absolute top-4 right-4 z-10 flex-col gap-2 items-end">
                        <Link
                            href="/user/settings/ai"
                            className={`flex items-center gap-2 p-2 rounded-lg bg-background/80 backdrop-blur-md border border-border shadow-sm hover:bg-accent/10 hover:text-accent hover:border-accent/30 transition-all duration-300 group ${sidebarCollapsed ? 'pl-3 pr-4' : ''}`}
                            title="个性化"
                        >
                            <MessageCircleHeart className="w-5 h-5 text-foreground-secondary group-hover:text-accent transition-colors" />
                            {sidebarCollapsed && <span className="text-sm font-medium">个性化</span>}
                        </Link>

                        {membership?.type !== 'free' && (
                            <Link
                                href="/user/knowledge-base"
                                className={`flex items-center gap-2 p-2 rounded-lg bg-background/80 backdrop-blur-md border border-border shadow-sm hover:bg-accent/10 hover:text-accent hover:border-accent/30 transition-all duration-300 group ${sidebarCollapsed ? 'pl-3 pr-4' : ''}`}
                                title="知识库"
                            >
                                <BookOpenText className="w-5 h-5 text-foreground-secondary group-hover:text-accent transition-colors" />
                                {sidebarCollapsed && <span className="text-sm font-medium">知识库</span>}
                            </Link>
                        )}
                    </div>
                    {/* 无对话时居中布局（仅桌面端） */}
                    {messages.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center px-4 py-4">
                            {/* 提示语 */}
                            <p className="text-xl text-foreground-secondary mb-8 animate-fade-in-up">
                                今天运势如何？
                            </p>

                            {/* 积分不足提示 */}
                            {isCreditLocked && (
                                <div className="w-full max-w-3xl mb-4 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 text-amber-600">
                                            <Lock className="w-4 h-4" />
                                            <span className="text-sm">积分已用完</span>
                                        </div>
                                        {isPaymentPaused ? (
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-600 rounded-lg text-sm cursor-not-allowed">
                                                <Lock className="w-3.5 h-3.5" />
                                                支付暂停
                                            </div>
                                        ) : (
                                            <Link
                                                href="/user/upgrade"
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-sm hover:bg-accent/90 transition-colors"
                                            >
                                                <Sparkles className="w-3.5 h-3.5" />
                                                立即充值
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 居中的输入框 */}
                            <div className="w-full max-w-3xl">
                                <ChatComposer
                                    inputValue={inputValue}
                                    isLoading={isLoading}
                                    isSendingToList={isSendingToList}
                                    onInputChange={setInputValue}
                                    onSend={handleSend}
                                    onStop={handleStop}
                                    disabled={isCreditLocked}
                                    selectedCharts={selectedCharts}
                                    onSelectChart={(type) => {
                                        setChartFocusType(type);
                                        setChartSelectorOpen(true);
                                    }}
                                    onClearChart={(type) => {
                                        const nextCharts = { ...selectedCharts };
                                        delete nextCharts[type];
                                        setSelectedCharts(nextCharts);
                                    }}
                                    selectedModel={selectedModel}
                                    onModelChange={setSelectedModel}
                                    reasoningEnabled={reasoningEnabled}
                                    onReasoningChange={setReasoningEnabled}
                                    userId={userId}
                                    membershipType={membership?.type || 'free'}
                                    attachmentState={attachmentState}
                                    onAttachmentChange={setAttachmentState}
                                    mentions={mentions}
                                    onMentionsChange={setMentions}
                                    promptKnowledgeBases={promptKnowledgeBases}
                                    contextMessages={messages}
                                    hideDisclaimer
                                    dreamMode={dreamMode}
                                    onDreamModeChange={setDreamMode}
                                    dreamContext={dreamContext}
                                    dreamContextLoading={dreamContextLoading}
                                />
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* 消息列表 - 消息数量超过 20 条时使用虚拟化 */}
                            {messages.length > 20 ? (
                                <div className="flex-1 px-4 py-4 relative">
                                    <VirtualizedChatMessageList
                                        messages={messages}
                                        isLoading={isLoading}
                                        onEditMessage={handleEditMessage}
                                        onRegenerateResponse={handleRegenerateResponse}
                                        onSwitchVersion={handleSwitchVersion}
                                        onArchiveMessage={activeConversationId ? handleArchiveMessage : undefined}
                                        disabled={isCreditLocked}
                                    />
                                </div>
                            ) : (
                                <div
                                    ref={messageScrollContainerRef}
                                    onScroll={handleMessageListScroll}
                                    className="flex-1 overflow-y-auto px-4 py-4 relative"
                                >
                                    <ChatMessageList
                                        messages={messages}
                                        isLoading={isLoading}
                                        messagesEndRef={messagesEndRef}
                                        onEditMessage={handleEditMessage}
                                        onRegenerateResponse={handleRegenerateResponse}
                                        onSwitchVersion={handleSwitchVersion}
                                        onArchiveMessage={activeConversationId ? handleArchiveMessage : undefined}
                                        disabled={isCreditLocked}
                                    />
                                </div>
                            )}

                            {/* 积分不足提示 */}
                            {isCreditLocked && (
                                <div className="px-4 py-3 bg-amber-500/10 border-t border-amber-500/20">
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="flex items-center gap-2 text-amber-600">
                                            <Lock className="w-4 h-4" />
                                            <span className="text-sm">积分已用完</span>
                                        </div>
                                        {isPaymentPaused ? (
                                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-600 rounded-lg text-sm cursor-not-allowed">
                                                <Lock className="w-3.5 h-3.5" />
                                                支付暂停
                                            </div>
                                        ) : (
                                            <Link
                                                href="/user/upgrade"
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-sm hover:bg-accent/90 transition-colors"
                                            >
                                                <Sparkles className="w-3.5 h-3.5" />
                                                立即充值
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* 输入框 */}
                            <ChatComposer
                                inputValue={inputValue}
                                isLoading={isLoading}
                                isSendingToList={isSendingToList}
                                onInputChange={setInputValue}
                                onSend={handleSend}
                                onStop={handleStop}
                                disabled={isCreditLocked}
                                selectedCharts={selectedCharts}
                                onSelectChart={(type) => {
                                    setChartFocusType(type);
                                    setChartSelectorOpen(true);
                                }}
                                onClearChart={(type) => {
                                    const nextCharts = { ...selectedCharts };
                                    delete nextCharts[type];
                                    setSelectedCharts(nextCharts);
                                }}
                                selectedModel={selectedModel}
                                onModelChange={setSelectedModel}
                                reasoningEnabled={reasoningEnabled}
                                onReasoningChange={setReasoningEnabled}
                                userId={userId}
                                membershipType={membership?.type || 'free'}
                                attachmentState={attachmentState}
                                onAttachmentChange={setAttachmentState}
                                mentions={mentions}
                                onMentionsChange={setMentions}
                                promptKnowledgeBases={promptKnowledgeBases}
                                contextMessages={messages}
                                dreamMode={dreamMode}
                                onDreamModeChange={setDreamMode}
                                dreamContext={dreamContext}
                                dreamContextLoading={dreamContextLoading}
                            />
                        </>
                    )}
                </div>
            </div>

            {kbTargetMessage && activeConversationId && (
                <AddToKnowledgeBaseModal
                    open={kbModalOpen}
                    onClose={closeKbModal}
                    sourceTitle={kbTargetMessage.content.slice(0, 40) || '对话回复'}
                    sourceType="chat_message"
                    sourceId={kbTargetMessage.id}
                    sourceMeta={{ conversationId: activeConversationId }}
                />
            )}

            {/* 命盘选择器弹窗 */}
            {userId && chartSelectorOpen && (
                <BaziChartSelector
                    isOpen={chartSelectorOpen}
                    onClose={() => {
                        setChartSelectorOpen(false);
                        setChartFocusType(undefined);
                    }}
                    onSelect={(charts) => {
                        // 仅更新当前选择，用于下一条消息发送
                        // 不更新数据库，避免影响已有消息
                        setSelectedCharts(charts);
                    }}
                    userId={userId}
                    currentSelection={selectedCharts}
                    focusType={chartFocusType}
                />
            )}

            <CreditsModal
                isOpen={showCreditsModal}
                onClose={() => setShowCreditsModal(false)}
            />
        </LoginOverlay>
    );
}
