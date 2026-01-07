'use client';

import { useState } from 'react';
import { User, Pencil, Check, X, RefreshCw, Copy } from 'lucide-react';
import type { AIPersonalityConfig, ChatMessage } from '@/types';

interface ChatMessageListProps {
    messages: ChatMessage[];
    currentPersonality: AIPersonalityConfig;
    isLoading: boolean;
    quickQuestions: string[];
    onQuickQuestion: (question: string) => void;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    onEditMessage?: (messageId: string, newContent: string) => void;
    onRegenerateResponse?: (messageId: string) => void;
    disabled?: boolean;
}

export function ChatMessageList({
    messages,
    currentPersonality,
    isLoading,
    quickQuestions,
    onQuickQuestion,
    messagesEndRef,
    onEditMessage,
    onRegenerateResponse,
    disabled = false,
}: ChatMessageListProps) {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [hoveredAction, setHoveredAction] = useState<string | null>(null);

    const handleStartEdit = (message: ChatMessage) => {
        if (disabled) return;
        setEditingId(message.id);
        setEditContent(message.content);
    };

    const handleSaveEdit = () => {
        if (editingId && onEditMessage && editContent.trim()) {
            onEditMessage(editingId, editContent.trim());
        }
        setEditingId(null);
        setEditContent('');
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditContent('');
    };

    const handleCopy = async (message: ChatMessage) => {
        try {
            await navigator.clipboard.writeText(message.content);
            setCopiedId(message.id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch {
            // 复制失败
        }
    };

    if (messages.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
                <div className="w-20 h-20 rounded-2xl bg-accent/10 flex items-center justify-center mb-4">
                    <span className="text-4xl">{currentPersonality.emoji}</span>
                </div>
                <h2 className="text-xl font-bold mb-2">{currentPersonality.name}</h2>
                <p className="text-foreground-secondary max-w-md mb-6">
                    {currentPersonality.description}
                </p>

                <div className="grid grid-cols-2 gap-2 max-w-md">
                    {quickQuestions.map((question) => (
                        <button
                            key={question}
                            onClick={() => onQuickQuestion(question)}
                            className="p-3 text-sm text-left rounded-lg bg-background-secondary border border-border hover:border-accent hover:text-accent transition-colors"
                        >
                            {question}
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // 过滤掉正在加载中的空消息
    const displayMessages = messages.filter((msg, index) => {
        if (index === messages.length - 1 && msg.role === 'assistant' && msg.content === '' && isLoading) {
            return false;
        }
        return true;
    });

    return (
        <div className="space-y-6 max-w-3xl mx-auto pb-4">
            {displayMessages.map((message) => (
                <div
                    key={message.id}
                    className={`group ${message.role === 'user' ? 'flex justify-end' : ''}`}
                >
                    {message.role === 'user' ? (
                        /* 用户消息 */
                        editingId === message.id ? (
                            <div className="max-w-[75%] space-y-2">
                                <textarea
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    className="w-full px-4 py-3 rounded-2xl bg-background-secondary border border-border focus:outline-none focus:ring-2 focus:ring-accent/30 text-base resize-none"
                                    rows={3}
                                    autoFocus
                                />
                                <div className="flex gap-2 justify-end">
                                    <button
                                        onClick={handleSaveEdit}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent text-white text-sm hover:bg-accent/90 transition-colors"
                                    >
                                        <Check className="w-4 h-4" />
                                        发送
                                    </button>
                                    <button
                                        onClick={handleCancelEdit}
                                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-sm hover:bg-background-secondary transition-colors"
                                    >
                                        <X className="w-4 h-4" />
                                        取消
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-end max-w-[75%]">
                                {/* 消息气泡 */}
                                <div className="px-4 py-3 rounded-2xl rounded-tr-md bg-accent text-white shadow-sm">
                                    <p className="whitespace-pre-wrap text-base leading-relaxed">
                                        {message.content}
                                    </p>
                                </div>
                                {/* 操作按钮 - 在消息下方 */}
                                {!disabled && !isLoading && onEditMessage && (
                                    <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => handleStartEdit(message)}
                                            onMouseEnter={() => setHoveredAction(`edit-${message.id}`)}
                                            onMouseLeave={() => setHoveredAction(null)}
                                            className="relative p-2 text-foreground-secondary hover:text-foreground hover:bg-background-secondary rounded-lg transition-colors"
                                        >
                                            <Pencil className="w-4.5 h-4.5" />
                                            {hoveredAction === `edit-${message.id}` && (
                                                <span className="absolute top-full mt-1 left-1/2 -translate-x-1/2 px-2 py-1 text-xs bg-foreground text-background rounded whitespace-nowrap z-10">
                                                    编辑
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )
                    ) : (
                        /* AI 消息 - 直接显示文本 */
                        <div className="w-full">
                            <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground">
                                {message.content}
                            </p>
                            {/* 操作按钮 */}
                            {!isLoading && message.content && (
                                <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => handleCopy(message)}
                                        onMouseEnter={() => setHoveredAction(`copy-${message.id}`)}
                                        onMouseLeave={() => setHoveredAction(null)}
                                        className="relative p-2 text-foreground-secondary hover:text-foreground hover:bg-background-secondary rounded-lg transition-colors"
                                    >
                                        {copiedId === message.id ? (
                                            <Check className="w-4.5 h-4.5 text-green-500" />
                                        ) : (
                                            <Copy className="w-4.5 h-4.5" />
                                        )}
                                        {hoveredAction === `copy-${message.id}` && (
                                            <span className="absolute top-full mt-1 left-1/2 -translate-x-1/2 px-2 py-1 text-xs bg-foreground text-background rounded whitespace-nowrap z-10">
                                                {copiedId === message.id ? '已复制' : '复制'}
                                            </span>
                                        )}
                                    </button>
                                    {!disabled && onRegenerateResponse && (
                                        <button
                                            onClick={() => onRegenerateResponse(message.id)}
                                            onMouseEnter={() => setHoveredAction(`regen-${message.id}`)}
                                            onMouseLeave={() => setHoveredAction(null)}
                                            className="relative p-2 text-foreground-secondary hover:text-foreground hover:bg-background-secondary rounded-lg transition-colors"
                                        >
                                            <RefreshCw className="w-4.5 h-4.5" />
                                            {hoveredAction === `regen-${message.id}` && (
                                                <span className="absolute top-full mt-1 left-1/2 -translate-x-1/2 px-2 py-1 text-xs bg-foreground text-background rounded whitespace-nowrap z-10">
                                                    重新回复
                                                </span>
                                            )}
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}

            {/* 加载状态 */}
            {isLoading && (
                <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-foreground-secondary" />
                    <span className="text-base text-foreground-secondary">正在思考...</span>
                </div>
            )}

            <div ref={messagesEndRef} />
        </div>
    );
}
