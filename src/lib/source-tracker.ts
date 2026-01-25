import type { DataSourceType } from '@/lib/data-sources/types';
import { countTokens, truncateToTokens } from '@/lib/token-utils';

export interface InjectedSource {
    type: 'knowledge_base' | 'data_source' | 'mention';
    sourceType?: DataSourceType;
    id: string;
    name: string;
    preview: string;
    tokens: number;
    truncated: boolean;
}

interface InjectedBlock {
    content: string;
    tokens: number;
}

export class SourceTracker {
    private sources: InjectedSource[] = [];
    private injectedBlocks: Map<string, InjectedBlock> = new Map();

    trackAndInject(params: {
        type: 'knowledge_base' | 'data_source' | 'mention';
        sourceType?: DataSourceType;
        id: string;
        name: string;
        content: string;
        maxTokens?: number;
    }): { content: string; injected: boolean } {
        const { type, sourceType, id, name, content, maxTokens } = params;

        if (!content?.trim()) {
            return { content: '', injected: false };
        }

        let finalContent = content;
        let truncated = false;
        if (maxTokens) {
            const tokens = countTokens(content);
            if (tokens > maxTokens) {
                finalContent = truncateToTokens(content, maxTokens);
                truncated = true;
            }
        }

        const tokens = countTokens(finalContent);
        const preview = finalContent.slice(0, 100) + (finalContent.length > 100 ? '...' : '');
        const blockId = `${type}:${id}:${Date.now()}`;

        this.injectedBlocks.set(blockId, { content: finalContent, tokens });
        this.sources.push({
            type,
            sourceType,
            id,
            name,
            preview,
            tokens,
            truncated
        });

        return { content: finalContent, injected: true };
    }

    trackBatch(items: Array<Parameters<SourceTracker['trackAndInject']>[0]>): string[] {
        return items
            .map(item => this.trackAndInject(item))
            .filter(r => r.injected)
            .map(r => r.content);
    }

    getSources(): InjectedSource[] {
        const seen = new Map<string, InjectedSource>();
        for (const source of this.sources) {
            const key = `${source.type}:${source.id}`;
            seen.set(key, source);
        }
        return Array.from(seen.values());
    }

    getDiagnostics(): {
        totalSources: number;
        totalTokens: number;
        blocks: Array<{ id: string; tokens: number }>;
    } {
        return {
            totalSources: this.sources.length,
            totalTokens: Array.from(this.injectedBlocks.values()).reduce((sum, b) => sum + b.tokens, 0),
            blocks: Array.from(this.injectedBlocks.entries()).map(([id, b]) => ({ id, tokens: b.tokens }))
        };
    }

    reset(): void {
        this.sources = [];
        this.injectedBlocks.clear();
    }
}

export function createSourceTracker(): SourceTracker {
    return new SourceTracker();
}
