'use client';

import { useState } from 'react';
import { Pencil, Check, X, RefreshCw, Copy, ChevronLeft, ChevronRight, Search, FileText, Sparkles } from 'lucide-react';
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
            <div className="h-full flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
                <div className="relative z-10 max-w-2xl w-full flex flex-col items-center animate-fade-in-up">
                    {/* 头像区域 */}
                    <div className="relative mb-8 group cursor-default">
                        <div className="relative w-28 h-28 rounded-[2rem] bg-background-secondary border border-border flex items-center justify-center shadow-lg transform transition-transform duration-500 group-hover:scale-105 group-hover:rotate-3">
                            <span className="text-6xl filter drop-shadow-md transform transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3">
                                {currentPersonality.emoji}
                            </span>
                        </div>
                    </div>

                    {/* 标题和描述 */}
                    <h2 className="text-4xl font-bold mb-4 text-foreground tracking-tight">
                        {currentPersonality.name}
                    </h2>
                    <p className="text-lg text-foreground-secondary max-w-lg mb-8 leading-relaxed">
                        {currentPersonality.description}
                    </p>

                    {/* 快捷问题 */}
                    <div className="w-full max-w-xl">
                        <div className="flex items-center justify-center gap-2 mb-6 opacity-80">
                            <Sparkles className="w-4 h-4 text-purple-500" />
                            <span className="text-xs font-medium uppercase tracking-widest text-purple-600 dark:text-purple-400">
                                猜你想问
                            </span>
                            <Sparkles className="w-4 h-4 text-purple-500" />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {quickQuestions.map((question, index) => (
                                <button
                                    key={question}
                                    onClick={() => onQuickQuestion(question)}
                                    className="group relative p-4 text-left rounded-2xl bg-background-secondary hover:bg-accent/5 border border-border hover:border-accent/30 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 overflow-hidden"
                                    style={{ animationDelay: `${index * 100}ms` }}
                                >
                                    <div className="relative flex items-center justify-between gap-3">
                                        <span className="text-sm font-medium text-foreground/90 group-hover:text-foreground transition-colors">
                                            {question}
                                        </span>
                                        <div className="w-6 h-6 rounded-full bg-background flex items-center justify-center opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300 text-accent">
                                            <ChevronRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
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
                                    <div className="flex items-center gap-2 mb-2">
                                        {message.attachments.fileName && (
                                            <div className="flex items-center gap-3 px-3 py-2.5 bg-background border border-border rounded-xl max-w-[240px]">
                                                <div className="flex-shrink-0 w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center">
                                                    <FileText className="w-5 h-5 text-white" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-foreground truncate">
                                                        {message.attachments.fileName}
                                                    </p>
                                                    <p className="text-xs text-foreground-secondary">文件</p>
                                                </div>
                                            </div>
                                        )}
                                        {message.attachments.webSearchEnabled && (
                                            <div className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-xl text-green-600">
                                                <Search className="w-4 h-4" />
                                                <span className="text-sm">网络搜索</span>
                                            </div>
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
