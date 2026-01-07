/**
 * AI 对话页面
 * 
 * 'use client' 标记说明：
 * - 页面包含实时对话交互，需要在客户端运行
 */
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Lock, Menu } from 'lucide-react';
import Link from 'next/link';
import type { ChatMessage, Conversation } from '@/types';
import { AI_PERSONALITIES } from '@/lib/ai';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { ChatComposer } from '@/components/chat/ChatComposer';
import { ConversationSidebar } from '@/components/chat/ConversationSidebar';
import { BaziChartSelector, type SelectedCharts } from '@/components/chat/BaziChartSelector';
import { LoginOverlay } from '@/components/auth/LoginOverlay';
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

// 快捷问题
const quickQuestions = [
    '我今年运势如何？',
    '我适合什么职业？',
    '我的感情运势怎么样？',
    '我应该注意什么健康问题？',
];

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
    const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [credits, setCredits] = useState<number | null>(null);
    const [membership, setMembership] = useState<MembershipInfo | null>(null);

    // 消息状态
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false); // AI思考中
    const [isSaving, setIsSaving] = useState(false);   // 保存中（不显示思考动画）
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    // 命盘选择器状态
    const [chartSelectorOpen, setChartSelectorOpen] = useState(false);
    const [selectedCharts, setSelectedCharts] = useState<SelectedCharts>({});
    const [chartFocusType, setChartFocusType] = useState<'bazi' | 'ziwei' | undefined>(undefined);

    // 滚动到最新消息
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const refreshMembership = useCallback(async (targetUserId?: string | null) => {
        const id = targetUserId ?? userId;
        if (!id) return;
        const memberInfo = await getMembershipInfo(id);
        if (memberInfo) {
            setMembership(memberInfo);
            setCredits(memberInfo.aiChatCount);
        }
    }, [userId]);

    // 获取用户ID并加载对话列表
    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                setUserId(session.user.id);
                const list = await loadConversations(session.user.id);
                setConversations(list);
                await refreshMembership(session.user.id);
            }
        };
        init();
    }, [refreshMembership]);

    // 选择对话
    const handleSelectConversation = useCallback(async (id: string) => {
        const conv = await loadConversation(id);
        if (conv) {
            setActiveConversationId(id);
            setMessages(conv.messages);
            setSidebarOpen(false);
        }
    }, []);

    // 新建对话
    const handleNewChat = useCallback(async () => {
        setActiveConversationId(null);
        setMessages([]);
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

        setIsSaving(true);
        try {
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
                });
                if (newId) {
                    await saveConversation(newId, newMessages, title);
                    setActiveConversationId(newId);
                    // 刷新列表
                    const list = await loadConversations(userId);
                    setConversations(list);
                }
            }
        } finally {
            setIsSaving(false);
        }
    }, [userId, activeConversationId]);

    // 发送消息
    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue.trim(),
            createdAt: new Date().toISOString(),
        };

        const isNewConversation = !activeConversationId;
        const newMessages = [...messages, userMessage];
        setMessages(newMessages);
        setInputValue('');
        setIsLoading(true);

        // 创建一个空的 AI 消息用于流式更新
        const assistantMessageId = (Date.now() + 1).toString();
        const initialAssistantMessage: ChatMessage = {
            id: assistantMessageId,
            role: 'assistant',
            content: '',
            createdAt: new Date().toISOString(),
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
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '请求失败');
            }

            // 处理流式响应
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let accumulatedContent = '';
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
                                const content = parsed.choices?.[0]?.delta?.content;
                                if (content) {
                                    accumulatedContent += content;
                                    // 实时更新消息内容
                                    setMessages(prev => prev.map(msg =>
                                        msg.id === assistantMessageId
                                            ? { ...msg, content: accumulatedContent }
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
            });
            setMessages(finalMessages);
            setIsLoading(false);

            // 保存到数据库
            if (userId) {
                await saveMessages(finalMessages, isNewConversation);
            }
        } catch (error) {
            console.error('发送失败:', error);
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: '抱歉，服务暂时不可用。请稍后再试。',
                createdAt: new Date().toISOString(),
            };
            setMessages(prev => [...prev.slice(0, -1), errorMessage]);
            setIsLoading(false);
        } finally {
            await refreshMembership();
        }
    };

    const handleQuickQuestion = (question: string) => {
        setInputValue(question);
    };

    // 编辑用户消息并重新发送
    const handleEditMessage = async (messageId: string, newContent: string) => {
        // 找到要编辑的消息索引
        const messageIndex = messages.findIndex(m => m.id === messageId);
        if (messageIndex === -1) return;

        // 获取该消息之前的所有消息 (不包含该消息)
        const previousMessages = messages.slice(0, messageIndex);

        // 更新用户消息
        const updatedUserMessage: ChatMessage = {
            ...messages[messageIndex],
            content: newContent,
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
                }),
            });

            if (!response.ok) {
                throw new Error('请求失败');
            }

            // 处理流式响应
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let accumulatedContent = '';
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
                                const content = parsed.choices?.[0]?.delta?.content;
                                if (content) {
                                    accumulatedContent += content;
                                    setMessages(prev => prev.map(msg =>
                                        msg.id === assistantMessageId
                                            ? { ...msg, content: accumulatedContent }
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

            const finalMessages = newMessages.concat({
                ...initialAssistantMessage,
                content: accumulatedContent || '抱歉，我暂时无法回答这个问题。',
            });
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
                }),
            });

            if (!response.ok) {
                throw new Error('请求失败');
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let accumulatedContent = '';
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
                                const content = parsed.choices?.[0]?.delta?.content;
                                if (content) {
                                    accumulatedContent += content;
                                    setMessages(prev => prev.map(msg =>
                                        msg.id === assistantMessageId
                                            ? { ...msg, content: accumulatedContent }
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

    const currentPersonality = AI_PERSONALITIES['master'];
    const isUnlimited = membership ? membership.type !== 'free' && membership.isActive : false;
    const isCreditLocked = !isUnlimited && credits === 0;

    return (
        <LoginOverlay message="登录后即可使用 AI 对话功能">
            <div className="flex h-[calc(100vh-5rem)] lg:h-screen">
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
                />

                {/* 主内容区 */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* 移动端菜单按钮 */}
                    <div className="lg:hidden flex items-center px-4 py-3 border-b border-border">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="p-2 -ml-2 rounded-lg hover:bg-background-secondary transition-colors"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                    </div>

                    {/* 消息列表 */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 relative">
                        <ChatMessageList
                            messages={messages}
                            currentPersonality={currentPersonality}
                            isLoading={isLoading}
                            quickQuestions={isCreditLocked ? [] : quickQuestions}
                            onQuickQuestion={handleQuickQuestion}
                            messagesEndRef={messagesEndRef}
                            onEditMessage={handleEditMessage}
                            onRegenerateResponse={handleRegenerateResponse}
                            disabled={isCreditLocked}
                        />
                    </div>

                    {/* 积分不足提示 */}
                    {isCreditLocked && (
                        <div className="px-4 py-3 bg-amber-500/10 border-t border-amber-500/20">
                            <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 text-amber-600">
                                    <Lock className="w-4 h-4" />
                                    <span className="text-sm">AI对话次数已用完</span>
                                </div>
                                <Link
                                    href="/user/upgrade"
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-accent text-white rounded-lg text-sm hover:bg-accent/90 transition-colors"
                                >
                                    <Sparkles className="w-3.5 h-3.5" />
                                    立即充值
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* 输入框 */}
                    <ChatComposer
                        inputValue={inputValue}
                        isLoading={isLoading}
                        onInputChange={setInputValue}
                        onSend={handleSend}
                        disabled={isCreditLocked}
                        selectedCharts={selectedCharts}
                        onSelectChart={(type) => {
                            setChartFocusType(type);
                            setChartSelectorOpen(true);
                        }}
                        onClearChart={(type) => setSelectedCharts(prev => {
                            const newCharts = { ...prev };
                            delete newCharts[type];
                            return newCharts;
                        })}
                    />
                </div>
            </div>

            {/* 命盘选择器弹窗 */}
            {userId && (
                <BaziChartSelector
                    isOpen={chartSelectorOpen}
                    onClose={() => {
                        setChartSelectorOpen(false);
                        setChartFocusType(undefined);
                    }}
                    onSelect={setSelectedCharts}
                    userId={userId}
                    currentSelection={selectedCharts}
                    focusType={chartFocusType}
                />
            )}
        </LoginOverlay>
    );
}
