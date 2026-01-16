'use client';

import { useState } from 'react';
import { Pencil, Check, X, RefreshCw, Copy, ChevronLeft, ChevronRight, Paperclip, Search } from 'lucide-react';
import type { AIPersonalityConfig, ChatMessage } from '@/types';
import { getModelName } from '@/lib/ai-config';
import { MarkdownContent } from '@/components/ui/MarkdownContent';
import { ThinkingBlock } from './ThinkingBlock';

interface ChatMessageListProps {
    messages: ChatMessage[];
    currentPersonality: AIPersonalityConfig;
    isLoading: boolean;
    quickQuestions: string[];
    onQuickQuestion: (question: string) => void;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    onEditMessage?: (messageId: string, newContent: string) => void;
    onRegenerateResponse?: (messageId: string) => void;
    onSwitchVersion?: (messageId: string, versionIndex: number) => void;
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
    onSwitchVersion,
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

    // 找到最后一条正在流式输出的AI消息
    const lastMessage = messages[messages.length - 1];
    const isStreamingAI = isLoading && lastMessage?.role === 'assistant';

    // 显示所有消息（包括空的AI消息，用于显示正在思考）
    const displayMessages = messages;

    return (
        <div className="space-y-6 max-w-3xl mx-auto pb-4">
            {displayMessages.map((message, index) => (
                <div
                    key={message.id || `msg-${index}`}
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
                                {/* 附件信息显示 - 在消息气泡上方 */}
                                {message.attachments && (message.attachments.fileName || message.attachments.webSearchEnabled) && (
                                    <div className="flex items-center gap-2 mb-1 text-sm text-foreground-secondary">
                                        {message.attachments.fileName && (
                                            <span className="flex items-center gap-1">
                                                <Paperclip className="w-3.5 h-3.5" />
                                                <span className="max-w-[150px] truncate">{message.attachments.fileName}</span>
                                            </span>
                                        )}
                                        {message.attachments.webSearchEnabled && (
                                            <span className="flex items-center gap-1">
                                                <Search className="w-3.5 h-3.5" />
                                                <span>网络搜索</span>
                                            </span>
                                        )}
                                    </div>
                                )}
                                {/* 消息气泡 */}
                                <div className="px-4 py-3 rounded-2xl rounded-tr-md bg-accent text-white shadow-sm">
                                    <p className="whitespace-pre-wrap text-base leading-relaxed">
                                        {message.content}
                                    </p>
                                </div>
                                {/* 操作按钮和版本切换 */}
                                {!disabled && (
                                    <div className="flex items-center mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {/* 复制按钮 */}
                                        <button
                                            onClick={() => handleCopy(message)}
                                            onMouseEnter={() => setHoveredAction(`copy-user-${message.id}`)}
                                            onMouseLeave={() => setHoveredAction(null)}
                                            className="relative p-2 text-foreground-secondary hover:text-foreground hover:bg-background-secondary rounded-lg transition-colors"
                                        >
                                            {copiedId === message.id ? (
                                                <Check className="w-4.5 h-4.5 text-green-500" />
                                            ) : (
                                                <Copy className="w-4.5 h-4.5" />
                                            )}
                                            {hoveredAction === `copy-user-${message.id}` && (
                                                <span className="absolute top-full mt-1 left-1/2 -translate-x-1/2 px-2 py-1 text-xs bg-foreground text-background rounded-lg whitespace-nowrap z-10">
                                                    {copiedId === message.id ? '已复制' : '复制'}
                                                </span>
                                            )}
                                        </button>
                                        {/* 编辑按钮 */}
                                        {onEditMessage && (
                                            <button
                                                onClick={() => handleStartEdit(message)}
                                                onMouseEnter={() => setHoveredAction(`edit-${message.id}`)}
                                                onMouseLeave={() => setHoveredAction(null)}
                                                className="relative p-2 text-foreground-secondary hover:text-foreground hover:bg-background-secondary rounded-lg transition-colors"
                                            >
                                                <Pencil className="w-4.5 h-4.5" />
                                                {hoveredAction === `edit-${message.id}` && (
                                                    <span className="absolute top-full mt-1 left-1/2 -translate-x-1/2 px-2 py-1 text-xs bg-foreground text-background rounded-lg whitespace-nowrap z-10">
                                                        编辑消息
                                                    </span>
                                                )}
                                            </button>
                                        )}
                                        {/* 版本切换器 */}
                                        {message.versions && message.versions.length > 1 && onSwitchVersion && (
                                            <div className="flex items-center gap-1 text-foreground-secondary">
                                                <button
                                                    onClick={() => {
                                                        const currentIdx = message.currentVersionIndex ?? message.versions!.length - 1;
                                                        if (currentIdx > 0) {
                                                            onSwitchVersion(message.id, currentIdx - 1);
                                                        }
                                                    }}
                                                    disabled={(message.currentVersionIndex ?? message.versions.length - 1) === 0}
                                                    className="pt-1 pb-1 hover:bg-background-secondary rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                                >
                                                    <ChevronLeft className="w-6 h-6" />
                                                </button>
                                                <span className="text-base min-w-[2rem] text-center">
                                                    {(message.currentVersionIndex ?? message.versions.length - 1) + 1}/{message.versions.length}
                                                </span>
                                                <button
                                                    onClick={() => {
                                                        const currentIdx = message.currentVersionIndex ?? message.versions!.length - 1;
                                                        if (currentIdx < message.versions!.length - 1) {
                                                            onSwitchVersion(message.id, currentIdx + 1);
                                                        }
                                                    }}
                                                    disabled={(message.currentVersionIndex ?? message.versions.length - 1) === message.versions.length - 1}
                                                    className="pt-1 pb-1 hover:bg-background-secondary rounded disabled:opacity-30 disabled:cursor-not-allowed"
                                                >
                                                    <ChevronRight className="w-6 h-6" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    ) : (
                        /* AI 消息 - Markdown 渲染 */
                        <div className="w-full">
                            {/* 正在思考指示器 - 显示在AI消息开头 */}
                            {isStreamingAI && message.id === lastMessage?.id && !message.reasoning && (
                                <div className="flex items-center gap-2 mb-2">
                                    <RefreshCw className="w-4 h-4 animate-spin text-accent" />
                                    <span className="text-sm text-foreground-secondary">正在思考...</span>
                                </div>
                            )}
                            {/* 显示思考过程 */}
                            {message.reasoning && (
                                <ThinkingBlock
                                    content={message.reasoning}
                                    isStreaming={isStreamingAI && message.id === lastMessage?.id && !message.content}
                                />
                            )}
                            <MarkdownContent content={message.content} className="text-base text-foreground" />
                            {/* 操作按钮 - 只有最后一条正在流式输出的消息才隐藏 */}
                            {message.content && !(isStreamingAI && message === lastMessage) && (
                                <div className="flex gap-1 mt-2">
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
                                            <span className="absolute top-full mt-1 left-1/2 -translate-x-1/2 px-2 py-1 text-xs bg-foreground text-background rounded-lg whitespace-nowrap z-10">
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
                                                <span className="absolute top-full mt-1 left-1/2 -translate-x-1/2 px-2 py-1 text-xs bg-foreground text-background rounded-lg whitespace-nowrap z-10">
                                                    <div>重试...</div>
                                                    {message.model && (
                                                        <div className="opacity-70">已使用 {getModelName(message.model || '')}</div>
                                                    )}
                                                </span>
                                            )}
                                        </button>
                                    )}
                                    {/* 命盘信息显示 - 从消息自身读取 */}
                                    {(message.chartInfo?.baziName || message.chartInfo?.ziweiName) && (
                                        <div className="flex items-center gap-1.5 ml-2 text-xs text-foreground-secondary">
                                            <span className="opacity-60">|</span>
                                            {message.chartInfo.baziName && (
                                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                                    八字: {message.chartInfo.baziName}
                                                </span>
                                            )}
                                            {message.chartInfo.ziweiName && (
                                                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                                    紫薇: {message.chartInfo.ziweiName}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}

            {/* 初始加载状态（无AI消息时显示） */}
            {isLoading && !isStreamingAI && (
                <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-accent" />
                    <span className="text-sm text-foreground-secondary">正在思考...</span>
                </div>
            )}

            <div ref={messagesEndRef} />
        </div>
    );
}
