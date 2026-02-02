/**
 * AI 人格卡片组件
 *
 * 'use client' 标记说明：
 * - 有按钮点击选择交互功能
 */
'use client';

import type { AIPersonalityConfig } from '@/types';

interface PersonalityCardProps {
    personality: AIPersonalityConfig;
    isActive: boolean;
    onSelect: () => void;
}

export function PersonalityCard({
    personality,
    isActive,
    onSelect,
}: PersonalityCardProps) {
    return (
        <button
            onClick={onSelect}
            className={`
                relative flex flex-col items-center p-4 rounded-xl border-2 transition-all
                min-w-[120px] text-center
                ${isActive
                    ? 'border-accent bg-accent/10 shadow-lg shadow-accent/20'
                    : 'border-border bg-background-secondary hover:border-accent/50 hover:bg-background-tertiary'
                }
            `}
        >
            {/* Emoji Avatar */}
            <div className={`
                text-3xl mb-2 transform transition-transform
                ${isActive ? 'scale-110' : 'group-hover:scale-105'}
            `}>
                {personality.emoji}
            </div>

            {/* 名称 */}
            <div className={`font-semibold text-sm ${isActive ? 'text-accent' : ''}`}>
                {personality.name}
            </div>

            {/* 简短描述 */}
            <div className="text-xs text-foreground-secondary mt-1 line-clamp-2">
                {personality.title}
            </div>

            {/* 选中指示器 */}
            {isActive && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-accent rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" />
                    </svg>
                </div>
            )}
        </button>
    );
}

interface PersonalitySelectorProps {
    personalities: AIPersonalityConfig[];
    activeId: string;
    onSelect: (id: string) => void;
}

export function PersonalitySelector({
    personalities,
    activeId,
    onSelect,
}: PersonalitySelectorProps) {
    return (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2">
            {personalities.map(p => (
                <PersonalityCard
                    key={p.id}
                    personality={p}
                    isActive={p.id === activeId}
                    onSelect={() => onSelect(p.id)}
                />
            ))}
        </div>
    );
}
