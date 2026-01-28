'use client';

import { useState } from 'react';
import { ChevronRight, ChevronDown, Brain } from 'lucide-react';

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

    // 格式化时长显示
    const formatDuration = (seconds: number): string => {
        if (seconds < 60) {
            return `${Math.round(seconds)} 秒`;
        }
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.round(seconds % 60);
        return remainingSeconds > 0
            ? `${minutes} 分 ${remainingSeconds} 秒`
            : `${minutes} 分`;
    };

    return (
        <div className="mb-3">
            {/* 头部 - 可点击展开/折叠 */}
            <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-1.5 text-accent hover:text-accent/80 transition-colors"
            >
                {/* 脑图标 */}
                <Brain className="w-4.5 h-4.5" />

                <span className="text-sm font-medium">
                    {isStreaming ? '思考中...' : '已思考'}
                    {duration && !isStreaming && (
                        <span className="text-foreground-secondary">（用时 {formatDuration(duration)}）</span>
                    )}
                </span>

                {/* 展开/折叠箭头 */}
                {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                ) : (
                    <ChevronRight className="w-4 h-4" />
                )}
            </button>

            {/* 内容区域 - 仅展开时显示 */}
            {isExpanded && (
                <div className="mt-2 ml-[7px] flex">
                    {/* 左侧装饰线 */}
                    <div className="flex flex-col items-center mr-3 gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />
                        <span className="w-0.5 flex-1 bg-accent/30" />
                    </div>
                    {/* 内容 */}
                    <div className="text-sm text-foreground-secondary whitespace-pre-wrap flex-1 pb-1">
                        {content}
                    </div>
                </div>
            )}
        </div>
    );
}
