/**
 * AI 对话页面
 * 
 * 'use client' 标记说明：
 * - 页面包含实时对话交互，需要在客户端运行
 */
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Lock } from 'lucide-react';
import Link from 'next/link';
import type { ChatMessage, Conversation, AttachmentState, DifyContext, Mention, AIMessageMetadata } from '@/types';

import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { DEFAULT_MODEL_ID } from '@/lib/ai-config';
import { ConversationSidebar } from '@/components/chat/ConversationSidebar';
import { BaziChartSelector, type SelectedCharts } from '@/components/chat/BaziChartSelector';
import { AddToKnowledgeBaseModal } from '@/components/knowledge-base/AddToKnowledgeBaseModal';
import { LoginOverlay } from '@/components/auth/LoginOverlay';
import { useSessionSafe } from '@/components/providers/ClientProviders';
import { usePaymentPause } from '@/lib/usePaymentPause';
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
    // 对话管理状态
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [conversationsLoading, setConversationsLoading] = useState(true);
    const [hasLoadedConversations, setHasLoadedConversations] = useState(false);
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [credits, setCredits] = useState<number | null>(null);
    const [membership, setMembership] = useState<MembershipInfo | null>(null);
    const { isPaused: isPaymentPaused } = usePaymentPause();
    const { user, loading: sessionLoading } = useSessionSafe();

    // 消息状态
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false); // AI思考中
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

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

    // 滚动到最新消息
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        setSidebarOpen(window.innerWidth < 1024);
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
        if (activeConversationId && !list.find(c => c.id === activeConversationId)) {
            setActiveConversationId(null);
            setMessages([]);
        }
    }, [activeConversationId, userId]);

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
                setActiveConversationId(null);
                setConversationsLoading(false);
                setHasLoadedConversations(false);
                return;
            }
            setUserId(user.id);
            await refreshMembership(user.id);
            await refreshPromptKnowledgeBases(user.id);
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

    // 选择对话
    const handleSelectConversation = useCallback(async (id: string) => {
        const conv = await loadConversation(id);
        if (conv) {
            setActiveConversationId(id);
            setMessages(conv.messages);
            setSidebarOpen(false);

            // 从最后一条 AI 消息恢复命盘显示
            const lastAIMessage = [...conv.messages].reverse().find(m => m.role === 'assistant' && m.chartInfo);
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
        }
    }, []);

    // 新建对话
    const handleNewChat = useCallback(async () => {
        setActiveConversationId(null);
        setMessages([]);
        setSelectedCharts({}); // 清空命盘显示
        // 保持当前选择的人格，不重置
        setSidebarOpen(false);
    }, []);

    // 删除对话
    const handleDeleteConversation = useCallback(async (id: string) => {
        const success = await deleteConversation(id);
        if (success) {
            setConversations(prev => prev.filter(c => c.id !== id));
            if (activeConversationId === id) {
                setActiveConversationId(null);
                setMessages([]);
            }
        }
    }, [activeConversationId]);

    // 重命名对话
    const handleRenameConversation = useCallback(async (id: string, title: string) => {
        const success = await renameConversation(id, title);
        if (success) {
            setConversations(prev => prev.map(c =>
                c.id === id ? { ...c, title } : c
            ));
        }
    }, []);

    // 保存消息到对话
    const saveMessages = useCallback(async (newMessages: ChatMessage[], isNewConversation: boolean) => {
        if (!userId) return;

        if (activeConversationId && !isNewConversation) {
            // 更新现有对话
            await saveConversation(activeConversationId, newMessages);
        } else {
            // 创建新对话，使用AI生成标题
            const title = await generateAITitle(newMessages);
            const newId = await createConversation({
                userId,
                personality: 'master',
                title,
                baziChartId: selectedCharts.bazi?.id,
                ziweiChartId: selectedCharts.ziwei?.id,
            });
            if (newId) {
                await saveConversation(newId, newMessages, title);
                setActiveConversationId(newId);
                // 刷新列表
                const list = await loadConversations(userId);
                setConversations(list);
            }
        }
    }, [userId, activeConversationId, selectedCharts.bazi?.id, selectedCharts.ziwei?.id]);

    // 发送消息
    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue.trim(),
            createdAt: new Date().toISOString(),
            // 记录发送时使用的附件/搜索状态
            attachments: (attachmentState.file || attachmentState.webSearchEnabled) ? {
                fileName: attachmentState.file?.name || '',
                webSearchEnabled: attachmentState.webSearchEnabled,
            } : undefined,
        };

        const isNewConversation = !activeConversationId;
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInputValue('');
        setMentions([]);
        setIsLoading(true);

        // 创建一个空的 AI 消息用于流式更新
        const assistantMessageId = (Date.now() + 1).toString();
        const initialAssistantMessage: ChatMessage = {
            id: assistantMessageId,
            role: 'assistant',
            content: '',
            createdAt: new Date().toISOString(),
            model: selectedModel,
            // 保存当前使用的命盘信息
            chartInfo: (selectedCharts.bazi?.name || selectedCharts.ziwei?.name) ? {
                baziName: selectedCharts.bazi?.name,
                ziweiName: selectedCharts.ziwei?.name,
            } : undefined,
        };
        setMessages([...newMessages, initialAssistantMessage]);

        // 提升到 try 外部，以便在 catch 中访问（用于停止时保存）
        let accumulatedContent = '';
        let accumulatedReasoning = '';
        let accumulatedMetadata: AIMessageMetadata | null = null;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (session?.access_token) {
                headers.Authorization = `Bearer ${session.access_token}`;
            }

            // 创建 AbortController 以支持停止回复
            abortControllerRef.current = new AbortController();

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
                formData.append('query', inputValue.trim());
                if (attachmentState.file) {
                    formData.append('file', attachmentState.file);
                }

                const difyResponse = await fetch('/api/dify/enhance', {
                    method: 'POST',
                    headers: {
                        'Authorization': headers.Authorization || '',
                    },
                    body: formData,
                    signal: abortControllerRef.current.signal,
                });

                if (difyResponse.ok) {
                    const difyResult = await difyResponse.json();
                    if (difyResult.success && difyResult.data) {
                        difyContext = {
                            webContent: difyResult.data.web_content,
                            fileContent: difyResult.data.file_content,
                        };
                        // 只清空文件，保留搜索状态（由用户自行取消）
                        setAttachmentState(prev => ({ ...prev, file: undefined }));
                    }
                } else {
                    const errorData = await difyResponse.json();
                    // 如果是会员权限问题，显示错误但继续发送（不清空附件）
                    if (errorData.code === 'MEMBERSHIP_REQUIRED') {
                        console.warn('Dify权限不足:', errorData.error);
                    }
                    // Dify失败时保留附件状态，让用户可以重试
                }
            }

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    messages: newMessages,
                    personality: 'master',
                    stream: true,
                    model: selectedModel,
                    chartIds: {
                        baziId: selectedCharts.bazi?.id,
                        ziweiId: selectedCharts.ziwei?.id,
                        baziAnalysisMode: selectedCharts.bazi?.analysisMode,
                    },
                    reasoning: reasoningEnabled,
                    difyContext,
                    mentions,
                }),
                signal: abortControllerRef.current.signal,
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '请求失败');
            }

            // 处理流式响应
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() ?? '';

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') continue;

                            try {
                                const parsed = JSON.parse(data);
                                if (parsed?.type === 'meta' && parsed?.metadata) {
                                    accumulatedMetadata = parsed.metadata as AIMessageMetadata;
                                    setMessages(prev => prev.map(msg =>
                                        msg.id === assistantMessageId
                                            ? { ...msg, metadata: accumulatedMetadata as unknown as Record<string, unknown> }
                                            : msg
                                    ));
                                    continue;
                                }
                                const delta = parsed.choices?.[0]?.delta;
                                // 处理推理内容
                                const reasoningContent = delta?.reasoning_content;
                                if (reasoningContent) {
                                    accumulatedReasoning += reasoningContent;
                                    setMessages(prev => prev.map(msg =>
                                        msg.id === assistantMessageId
                                            ? { ...msg, reasoning: accumulatedReasoning }
                                            : msg
                                    ));
                                }
                                // 处理正常内容
                                const content = delta?.content;
                                if (content) {
                                    accumulatedContent += content;
                                    setMessages(prev => prev.map(msg =>
                                        msg.id === assistantMessageId
                                            ? { ...msg, content: accumulatedContent, reasoning: accumulatedReasoning || undefined }
                                            : msg
                                    ));
                                }
                            } catch {
                                // 跳过解析错误
                            }
                        }
                    }
                }
            }

            // 完成后更新最终消息并保存
            const finalMessages = newMessages.concat({
                ...initialAssistantMessage,
                content: accumulatedContent || '抱歉，我暂时无法回答这个问题。',
                reasoning: accumulatedReasoning || undefined,
                metadata: accumulatedMetadata as unknown as Record<string, unknown>,
            });
            setMessages(finalMessages);
            setIsLoading(false);
            abortControllerRef.current = null;

            // 保存到数据库
            if (userId) {
                await saveMessages(finalMessages, isNewConversation);
            }
        } catch (error) {
            // 检查是否是用户主动停止
            if (error instanceof Error && error.name === 'AbortError') {
                // 用户停止了回复，保留当前内容并保存
                setIsLoading(false);
                abortControllerRef.current = null;

                // 直接使用 accumulatedContent 构建最终消息并保存
                if (userId) {
                    const stoppedMessages = newMessages.concat({
                        ...initialAssistantMessage,
                        content: accumulatedContent || '',
                        metadata: accumulatedMetadata as unknown as Record<string, unknown>,
                    });
                    // 只有当AI有回复内容时才保存
                    if (accumulatedContent.trim()) {
                        await saveMessages(stoppedMessages, isNewConversation);
                    }
                }
                return;
            }
            console.error('发送失败:', error);
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: '抱歉，服务暂时不可用。请稍后再试。',
                createdAt: new Date().toISOString(),
            };
            setMessages(prev => [...prev.slice(0, -1), errorMessage]);
            setIsLoading(false);
            abortControllerRef.current = null;
        } finally {
            await refreshMembership();
        }
    };

    // 停止AI回复
    const handleStop = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    }, []);

    // 编辑用户消息并重新发送
    const handleEditMessage = async (messageId: string, newContent: string) => {
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
        const updatedUserMessage: ChatMessage = {
            ...originalMessage,
            content: newContent,
            versions: existingVersions,
            currentVersionIndex: existingVersions.length, // 指向即将添加的新版本
        };

        // 创建新的消息列表（原有消息 + 更新的用户消息）
        const newMessages = [...previousMessages, updatedUserMessage];
        setMessages(newMessages);
        setIsLoading(true);

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
        setMessages([...newMessages, initialAssistantMessage]);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (session?.access_token) {
                headers.Authorization = `Bearer ${session.access_token}`;
            }

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    messages: newMessages,
                    personality: 'master',
                    stream: true,
                    model: selectedModel,
                    chartIds: {
                        baziId: selectedCharts.bazi?.id,
                        ziweiId: selectedCharts.ziwei?.id,
                        baziAnalysisMode: selectedCharts.bazi?.analysisMode,
                    },
                    reasoning: reasoningEnabled,
                }),
            });

            if (!response.ok) {
                throw new Error('请求失败');
            }

            // 处理流式响应
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let accumulatedContent = '';
            let accumulatedReasoning = '';
            let buffer = '';

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() ?? '';

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') continue;

                            try {
                                const parsed = JSON.parse(data);
                                const delta = parsed.choices?.[0]?.delta;
                                const reasoningContent = delta?.reasoning_content;
                                if (reasoningContent) {
                                    accumulatedReasoning += reasoningContent;
                                    setMessages(prev => prev.map(msg =>
                                        msg.id === assistantMessageId
                                            ? { ...msg, reasoning: accumulatedReasoning }
                                            : msg
                                    ));
                                }
                                const content = delta?.content;
                                if (content) {
                                    accumulatedContent += content;
                                    setMessages(prev => prev.map(msg =>
                                        msg.id === assistantMessageId
                                            ? { ...msg, content: accumulatedContent, reasoning: accumulatedReasoning || undefined }
                                            : msg
                                    ));
                                }
                            } catch {
                                // skip
                            }
                        }
                    }
                }
            }

            // 添加新版本到版本历史
            const newVersion = {
                userContent: newContent,
                aiContent: accumulatedContent || '抱歉，我暂时无法回答这个问题。',
                createdAt: new Date().toISOString(),
            };
            const updatedVersions = [...existingVersions, newVersion];

            // 更新用户消息的版本信息
            const finalUserMessage: ChatMessage = {
                ...updatedUserMessage,
                versions: updatedVersions,
                currentVersionIndex: updatedVersions.length - 1,
            };

            const finalMessages = [...previousMessages, finalUserMessage, {
                ...initialAssistantMessage,
                content: accumulatedContent || '抱歉，我暂时无法回答这个问题。',
                reasoning: accumulatedReasoning || undefined,
            }];
            setMessages(finalMessages);
            setIsLoading(false);

            if (userId && activeConversationId) {
                await saveMessages(finalMessages, false);
            }
        } catch (error) {
            console.error('编辑发送失败:', error);
            setMessages(prev => [...prev.slice(0, -1), {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: '抱歉，服务暂时不可用。',
                createdAt: new Date().toISOString(),
            }]);
            setIsLoading(false);
        } finally {
            await refreshMembership();
        }
    };

    // 重新生成 AI 回复
    const handleRegenerateResponse = async (messageId: string) => {
        // 找到该 AI 消息的索引
        const messageIndex = messages.findIndex(m => m.id === messageId);
        if (messageIndex === -1 || messageIndex === 0) return;

        // 获取该 AI 消息之前的所有消息（包括触发它的用户消息）
        const previousMessages = messages.slice(0, messageIndex);
        setMessages(previousMessages);
        setIsLoading(true);

        // 创建新的 AI 消息
        const assistantMessageId = (Date.now() + 1).toString();
        const initialAssistantMessage: ChatMessage = {
            id: assistantMessageId,
            role: 'assistant',
            content: '',
            createdAt: new Date().toISOString(),
            model: selectedModel,
        };
        setMessages([...previousMessages, initialAssistantMessage]);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
            };
            if (session?.access_token) {
                headers.Authorization = `Bearer ${session.access_token}`;
            }

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    messages: previousMessages,
                    personality: 'master',
                    stream: true,
                    model: selectedModel,
                    chartIds: {
                        baziId: selectedCharts.bazi?.id,
                        ziweiId: selectedCharts.ziwei?.id,
                        baziAnalysisMode: selectedCharts.bazi?.analysisMode,
                    },
                    reasoning: reasoningEnabled,
                }),
            });

            if (!response.ok) {
                throw new Error('请求失败');
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let accumulatedContent = '';
            let accumulatedReasoning = '';
            let buffer = '';

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split('\n');
                    buffer = lines.pop() ?? '';

                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const data = line.slice(6);
                            if (data === '[DONE]') continue;

                            try {
                                const parsed = JSON.parse(data);
                                const delta = parsed.choices?.[0]?.delta;
                                const reasoningContent = delta?.reasoning_content;
                                if (reasoningContent) {
                                    accumulatedReasoning += reasoningContent;
                                    setMessages(prev => prev.map(msg =>
                                        msg.id === assistantMessageId
                                            ? { ...msg, reasoning: accumulatedReasoning }
                                            : msg
                                    ));
                                }
                                const content = delta?.content;
                                if (content) {
                                    accumulatedContent += content;
                                    setMessages(prev => prev.map(msg =>
                                        msg.id === assistantMessageId
                                            ? { ...msg, content: accumulatedContent, reasoning: accumulatedReasoning || undefined }
                                            : msg
                                    ));
                                }
                            } catch {
                                // skip
                            }
                        }
                    }
                }
            }

            const finalMessages = previousMessages.concat({
                ...initialAssistantMessage,
                content: accumulatedContent || '抱歉，我暂时无法回答这个问题。',
                reasoning: accumulatedReasoning || undefined,
            });
            setMessages(finalMessages);
            setIsLoading(false);

            if (userId && activeConversationId) {
                await saveMessages(finalMessages, false);
            }
        } catch (error) {
            console.error('重新生成失败:', error);
            setMessages(prev => [...prev.slice(0, -1), {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: '抱歉，服务暂时不可用。',
                createdAt: new Date().toISOString(),
            }]);
            setIsLoading(false);
        } finally {
            await refreshMembership();
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
            const updatedUserMessage: ChatMessage = {
                ...message,
                content: version.userContent,
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
                saveMessages(newMessages, false);
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
                <div className="flex-1 flex flex-col min-w-0">
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
                                />
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* 消息列表 */}
                            <div className="flex-1 overflow-y-auto px-4 py-4 relative">
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
        </LoginOverlay>
    );
}
