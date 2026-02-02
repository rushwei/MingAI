/**
 * 聊天消息列表组件
 *
 * 'use client' 标记说明：
 * - 使用 React hooks (useState)
 * - 需要处理用户交互事件
 */
'use client';

import { useState } from 'react';
import { Pencil, Check, X, RefreshCw, Copy, ChevronLeft, ChevronRight, FileText, BookOpenText, Globe } from 'lucide-react';
import type { AIMessageMetadata, ChatMessage, InjectedSource } from '@/types';
import { getModelName } from '@/lib/ai-config';
import { formatMentionsForDisplay } from '@/lib/format-mentions';
import { MarkdownContent } from '@/components/ui/MarkdownContent';
import { ThinkingBlock } from './ThinkingBlock';
import { SourcePanel } from './SourcePanel';

export interface ChatMessageListProps {
    messages: ChatMessage[];
    isLoading: boolean;
    messagesEndRef: React.RefObject<HTMLDivElement | null>;
    onEditMessage?: (messageId: string, newContent: string) => void;
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
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState('');
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [hoveredAction, setHoveredAction] = useState<string | null>(null);
    const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

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
                    {/* 简洁提示语 */}
                    <p className="text-xl text-foreground-secondary mb-8">
                        今天运势如何？
                    </p>
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
        <div className="space-y-6 max-w-3xl mx-auto pb-24 md:pb-4">
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
                                                <Globe className="w-4 h-4" />
                                                <span className="text-sm">搜索</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {message.dreamInfo && (
                                    <div className="flex items-center gap-2 mb-1.5 text-xs text-purple-500/70 dark:text-purple-400/70">
                                        <span>解梦</span>
                                        <span>·</span>
                                        <span>{new Date(message.dreamInfo.dreamDate).toLocaleDateString('zh-CN')}</span>
                                    </div>
                                )}
                                <div className={`px-4 py-3 rounded-2xl rounded-tr-md shadow-sm text-foreground ${message.dreamInfo
                                        ? 'bg-purple-500/10 dark:bg-purple-500/15 border border-purple-500/20'
                                        : 'bg-accent/10 border border-accent/20'
                                    }`}>
                                    <p className="whitespace-pre-wrap text-base leading-relaxed">
                                        {formatMentionsForDisplay(message.content)}
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
                                    startTime={message.reasoningStartTime}
                                    duration={message.reasoningDuration}
                                />
                            )}
                            {message.dreamInfo && (
                                <div className="mb-2 flex items-center gap-2 text-xs text-purple-500/70 dark:text-purple-400/70">
                                    <span>🌙</span>
                                    <span>解梦</span>
                                    <span>·</span>
                                    <span>{message.dreamInfo.userName}</span>
                                    <span>·</span>
                                    <span>{new Date(message.dreamInfo.dreamDate).toLocaleDateString('zh-CN')}</span>
                                    {message.dreamInfo.baziChartName && (
                                        <>
                                            <span>·</span>
                                            <span>📜 {message.dreamInfo.baziChartName}</span>
                                        </>
                                    )}
                                </div>
                            )}
                            <MarkdownContent content={message.content} className="text-base text-foreground" />
                            {isStreamingAI && message.id === lastMessage?.id && !message.content && (
                                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-xs text-foreground-secondary backdrop-blur">
                                    <span className="flex items-center gap-0.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-foreground/70 animate-bounce" />
                                        <span className="w-1.5 h-1.5 rounded-full bg-foreground/50 animate-bounce [animation-delay:120ms]" />
                                        <span className="w-1.5 h-1.5 rounded-full bg-foreground/30 animate-bounce [animation-delay:240ms]" />
                                    </span>
                                </div>
                            )}
                            {(() => {
                                const meta = message.metadata as AIMessageMetadata | undefined;
                                const sources = (meta?.sources || []) as InjectedSource[];
                                if (!sources.length && !meta?.kbSearchEnabled) return null;
                                const isExpanded = !!expandedSources[message.id];
                                if (sources.length === 0 && !(isStreamingAI && message.id === lastMessage?.id)) {
                                    return (
                                        <div className="mt-2 border-t border-border/50 pt-2 px-2 text-xs text-foreground-secondary">
                                            本次未命中知识库
                                        </div>
                                    );
                                }
                                return (
                                    <SourcePanel
                                        sources={sources}
                                        isExpanded={isExpanded}
                                        onToggle={() => setExpandedSources(prev => ({ ...prev, [message.id]: !isExpanded }))}
                                    />
                                );
                            })()}
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
                                    {!!onArchiveMessage && (
                                        <button
                                            onClick={() => onArchiveMessage(message)}
                                            onMouseEnter={() => setHoveredAction(`archive-${message.id}`)}
                                            onMouseLeave={() => setHoveredAction(null)}
                                            className="relative p-2 text-foreground-secondary hover:text-foreground hover:bg-background-secondary rounded-lg transition-colors"
                                        >
                                            <BookOpenText className="w-4.5 h-4.5" />
                                            {hoveredAction === `archive-${message.id}` && (
                                                <span className="absolute top-full mt-1 left-1/2 -translate-x-1/2 px-2 py-1 text-xs bg-foreground text-background rounded-lg whitespace-nowrap z-10">
                                                    加入知识库
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
