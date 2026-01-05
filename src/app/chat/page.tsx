/**
 * AI 对话页面
 * 
 * 'use client' 标记说明：
 * - 页面包含实时对话交互，需要在客户端运行
 */
'use client';

import { useState, useRef, useEffect } from 'react';
import type { ChatMessage, AIPersonality } from '@/types';
import { AI_PERSONALITIES } from '@/lib/ai';
import { ChatToolbar } from '@/components/chat/ChatToolbar';
import { ChatMessageList } from '@/components/chat/ChatMessageList';
import { ChatComposer } from '@/components/chat/ChatComposer';

// 快捷问题
const quickQuestions = [
    '我今年运势如何？',
    '我适合什么职业？',
    '我的感情运势怎么样？',
    '我应该注意什么健康问题？',
];

export default function ChatPage() {
    // useState 管理对话消息、输入与加载状态，保证界面实时更新
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [personality, setPersonality] = useState<AIPersonality>('master');
    const messagesEndRef = useRef<HTMLDivElement | null>(null);

    // 滚动到最新消息
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    // useEffect 用于在消息变化后自动滚动到底部，避免用户错过最新回复
    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // 发送消息
    const handleSend = async () => {
        if (!inputValue.trim() || isLoading) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: inputValue.trim(),
            createdAt: new Date().toISOString(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setIsLoading(true);

        try {
            // 调用 API
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, userMessage],
                    personality,
                }),
            });

            const data = await response.json();

            const assistantMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: data.content || '抱歉，我暂时无法回答这个问题。',
                createdAt: new Date().toISOString(),
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('发送失败:', error);
            // 添加错误消息
            const errorMessage: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: '抱歉，服务暂时不可用。请稍后再试。',
                createdAt: new Date().toISOString(),
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    // 快捷问题
    const handleQuickQuestion = (question: string) => {
        setInputValue(question);
    };

    // 新对话
    const handleNewChat = () => {
        setMessages([]);
    };

    const currentPersonality = AI_PERSONALITIES[personality];

    return (
        <div className="flex flex-col h-[calc(100vh-4rem-5rem)] lg:h-[calc(100vh-4rem)]">
            <ChatToolbar
                personalities={Object.values(AI_PERSONALITIES)}
                activePersonality={personality}
                onSelectPersonality={setPersonality}
                onNewChat={handleNewChat}
            />

            <div className="flex-1 overflow-y-auto px-4 py-4">
                <ChatMessageList
                    messages={messages}
                    currentPersonality={currentPersonality}
                    isLoading={isLoading}
                    quickQuestions={quickQuestions}
                    onQuickQuestion={handleQuickQuestion}
                    messagesEndRef={messagesEndRef}
                />
            </div>

            <ChatComposer
                inputValue={inputValue}
                isLoading={isLoading}
                onInputChange={setInputValue}
                onSend={handleSend}
            />
        </div>
    );
}
