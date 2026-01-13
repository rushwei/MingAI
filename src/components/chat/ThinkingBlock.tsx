'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Brain, Clock } from 'lucide-react';

interface ThinkingBlockProps {
    content: string;
    duration?: number;  // 思考时长（秒）
    isStreaming?: boolean;  // 是否正在流式输出
}

/**
 * 思考过程展示组件
 * 可折叠，显示 AI 的推理过程
 */
export function ThinkingBlock({ content, duration, isStreaming = false }: ThinkingBlockProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!content) return null;

    // 预览内容：取前 100 个字符
    const preview = content.length > 100 ? content.slice(0, 100) + '...' : content;

    return (
        <div className="mb-3 rounded-lg border border-yellow-500/20 bg-yellow-500/5 overflow-hidden">
            {/* 头部 */}
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-yellow-500/10 transition-colors"
            >
                <div className="flex items-center gap-2 text-yellow-600">
                    <Brain className={`w-4 h-4 ${isStreaming ? 'animate-pulse' : ''}`} />
                    <span className="text-sm font-medium">
                        {isStreaming ? '思考中...' : '思考过程'}
                    </span>
                    {duration && !isStreaming && (
                        <span className="flex items-center gap-1 text-xs text-yellow-600/70">
                            <Clock className="w-3 h-3" />
                            {duration.toFixed(1)}s
                        </span>
                    )}
                </div>
                {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-yellow-600" />
                ) : (
                    <ChevronDown className="w-4 h-4 text-yellow-600" />
                )}
            </button>

            {/* 内容 */}
            <div className={`px-3 pb-3 text-sm text-foreground-secondary ${isExpanded ? '' : 'line-clamp-2'}`}>
                {isExpanded ? (
                    <div className="whitespace-pre-wrap">{content}</div>
                ) : (
                    <div className="text-xs opacity-70">{preview}</div>
                )}
            </div>
        </div>
    );
}
