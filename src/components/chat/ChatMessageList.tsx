/**
 * 聊天消息列表组件
 *
 * 'use client' 标记说明：
 * - 使用 React hooks (useMemo)
 * - 需要传递 ref 给子组件
 */
'use client';

import { useMemo } from 'react';
import type { ChatMessage, Mention } from '@/types';
import { ChatMessageItem } from '@/components/chat/ChatMessageItem';

interface ChatMessageListProps {
    messages: ChatMessage[];
    isLoading: boolean;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    onEditMessage?: (messageId: string, newContent: string, mentions?: Mention[]) => void;
    onRegenerateResponse?: (messageId: string) => void;
    onSwitchVersion?: (messageId: string, versionIndex: number) => void;
    onArchiveMessage?: (message: ChatMessage) => void;
    disabled?: boolean;
}

export function ChatMessageList({
    messages,
    isLoading,
    messagesEndRef,
    onEditMessage,
    onRegenerateResponse,
    onSwitchVersion,
    onArchiveMessage,
    disabled = false,
}: ChatMessageListProps) {
    // 找到最后一条正在流式输出的AI消息
    const lastMessage = messages[messages.length - 1];
    const isStreamingAI = useMemo(
        () => isLoading && lastMessage?.role === 'assistant',
        [isLoading, lastMessage?.role]
    );

    if (messages.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
                <div className="relative z-10 max-w-2xl w-full flex flex-col items-center animate-fade-in-up">
                    <p className="text-xl text-foreground-secondary mb-8">
                        今天运势如何？
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-3xl mx-auto pb-24 md:pb-4">
            {messages.map((message, index) => (
                <div
                    key={message.id || `msg-${index}`}
                    className="py-3"
                >
                    <ChatMessageItem
                        message={message}
                        isStreamingAI={isStreamingAI}
                        isLastMessage={index === messages.length - 1}
                        disabled={disabled}
                        onEditMessage={onEditMessage}
                        onRegenerateResponse={onRegenerateResponse}
                        onSwitchVersion={onSwitchVersion}
                        onArchiveMessage={onArchiveMessage}
                    />
                </div>
            ))}

            <div ref={messagesEndRef} />
        </div>
    );
}
