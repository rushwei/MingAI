'use client';

import { ChevronDown } from 'lucide-react';
import type { InjectedSource } from '@/types';
import { SourceBadge } from './SourceBadge';

interface SourcePanelProps {
    sources: InjectedSource[];
    isExpanded: boolean;
    onToggle: () => void;
}

export function SourcePanel({ sources, isExpanded, onToggle }: SourcePanelProps) {
    if (!sources || sources.length === 0) return null;

    return (
        <div className="mt-2 border-t border-border/50 pt-2 px-2">
            <button
                onClick={onToggle}
                className="flex items-center gap-1 text-xs text-foreground-secondary hover:text-foreground transition-colors"
                type="button"
            >
                <span>参考了 {sources.length} 个来源</span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            {isExpanded && (
                <div className="mt-2 flex flex-wrap gap-1">
                    {sources.map((source) => (
                        <SourceBadge key={`${source.type}:${source.id}`} source={source} />
                    ))}
                </div>
            )}
        </div>
    );
}
