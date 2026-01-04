/**
 * AI 对话页面
 * 
 * 'use client' 标记说明：
 * - 页面包含实时对话交互，需要在客户端运行
 */
'use client';

import { useState, useRef, useEffect } from 'react';
import {
    Send,
    Sparkles,
    RefreshCw,
    User,
    Plus
} from 'lucide-react';
import type { ChatMessage, AIPersonality } from '@/types';
import { AI_PERSONALITIES } from '@/lib/ai';

// 快捷问题
const quickQuestions = [
    '我今年运势如何？',
    '我适合什么职业？',
    '我的感情运势怎么样？',
    '我应该注意什么健康问题？',
];

export default function ChatPage() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [personality, setPersonality] = useState<AIPersonality>('master');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 滚动到最新消息
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

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
            {/* 顶部工具栏 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                {/* 人格选择器 */}
                <div className="flex items-center gap-2">
                    {Object.values(AI_PERSONALITIES).map(p => (
                        <button
                            key={p.id}
                            onClick={() => setPersonality(p.id)}
                            className={`
                flex items-center gap-2 px-3 py-2 rounded-lg text-sm
                transition-all duration-200
                ${personality === p.id
                                    ? 'bg-accent/10 text-accent border border-accent'
                                    : 'bg-background-secondary border border-border hover:border-accent/50'
                                }
              `}
                            title={p.description}
                        >
                            <span>{p.emoji}</span>
                            <span className="hidden sm:inline">{p.name}</span>
                        </button>
                    ))}
                </div>

                {/* 新对话按钮 */}
                <button
                    onClick={handleNewChat}
                    className="p-2 rounded-lg text-foreground-secondary hover:bg-background-secondary hover:text-foreground transition-colors"
                    title="新对话"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            {/* 消息列表 */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
                {messages.length === 0 ? (
                    // 空状态
                    <div className="h-full flex flex-col items-center justify-center text-center">
                        <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
                            <span className="text-4xl">{currentPersonality.emoji}</span>
                        </div>
                        <h2 className="text-xl font-bold mb-2">{currentPersonality.name}</h2>
                        <p className="text-foreground-secondary max-w-md mb-6">
                            {currentPersonality.description}
                        </p>

                        {/* 快捷问题 */}
                        <div className="grid grid-cols-2 gap-2 max-w-md">
                            {quickQuestions.map((q, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleQuickQuestion(q)}
                                    className="p-3 text-sm text-left rounded-lg bg-background-secondary border border-border hover:border-accent hover:text-accent transition-colors"
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    // 消息列表
                    <div className="space-y-4 max-w-3xl mx-auto">
                        {messages.map(message => (
                            <div
                                key={message.id}
                                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                            >
                                {/* 头像 */}
                                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                  ${message.role === 'user'
                                        ? 'bg-accent/20 text-accent'
                                        : 'bg-background-secondary'
                                    }
                `}>
                                    {message.role === 'user' ? (
                                        <User className="w-4 h-4" />
                                    ) : (
                                        <span>{currentPersonality.emoji}</span>
                                    )}
                                </div>

                                {/* 消息内容 */}
                                <div className={`
                  max-w-[80%] px-4 py-3 rounded-2xl
                  ${message.role === 'user'
                                        ? 'bg-accent text-white rounded-tr-sm'
                                        : 'bg-background-secondary border border-border rounded-tl-sm'
                                    }
                `}>
                                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                        {message.content}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {/* 加载状态 */}
                        {isLoading && (
                            <div className="flex gap-3">
                                <div className="w-8 h-8 rounded-full bg-background-secondary flex items-center justify-center">
                                    <span>{currentPersonality.emoji}</span>
                                </div>
                                <div className="px-4 py-3 rounded-2xl bg-background-secondary border border-border rounded-tl-sm">
                                    <div className="flex items-center gap-2 text-foreground-secondary">
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        <span className="text-sm">正在思考...</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            {/* 输入区域 */}
            <div className="border-t border-border p-4">
                <div className="max-w-3xl mx-auto">
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
                            placeholder="输入您的问题..."
                            className="flex-1 px-4 py-3 rounded-xl bg-background-secondary border border-border
                       focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent
                       transition-all duration-200"
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!inputValue.trim() || isLoading}
                            className="px-4 py-3 rounded-xl bg-accent text-white
                       hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all duration-200"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-center text-xs text-foreground-secondary mt-2">
                        AI 回复仅供参考，请理性看待命理分析结果
                    </p>
                </div>
            </div>
        </div>
    );
}
