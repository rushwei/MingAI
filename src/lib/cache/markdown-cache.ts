/**
 * Markdown 渲染缓存
 *
 * 使用 LRU 缓存已渲染的 Markdown 内容，避免重复解析
 */

interface CacheEntry {
    html: string;
    timestamp: number;
}

class MarkdownCache {
    private cache: Map<string, CacheEntry>;
    private maxSize: number;
    private maxAge: number; // 毫秒

    constructor(maxSize = 100, maxAgeMs = 30 * 60 * 1000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.maxAge = maxAgeMs;
    }

    /**
     * 生成缓存键
     */
    private generateKey(content: string, className?: string): string {
        // 使用简单的哈希函数
        let hash = 0;
        const str = content + (className || '');
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return `md_${hash}`;
    }

    /**
     * 获取缓存
     */
    get(content: string, className?: string): string | null {
        const key = this.generateKey(content, className);
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // 检查是否过期
        if (Date.now() - entry.timestamp > this.maxAge) {
            this.cache.delete(key);
            return null;
        }

        // LRU: 移动到末尾
        this.cache.delete(key);
        this.cache.set(key, entry);

        return entry.html;
    }

    /**
     * 设置缓存
     */
    set(content: string, html: string, className?: string): void {
        const key = this.generateKey(content, className);

        // 如果已存在，先删除（用于 LRU 排序）
        if (this.cache.has(key)) {
            this.cache.delete(key);
        }

        // 检查容量，删除最旧的条目
        while (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            if (firstKey) {
                this.cache.delete(firstKey);
            }
        }

        this.cache.set(key, {
            html,
            timestamp: Date.now(),
        });
    }

    /**
     * 检查是否应该缓存
     * 只缓存已完成的消息（内容不再变化）
     */
    shouldCache(content: string, isStreaming: boolean): boolean {
        // 流式输出中不缓存
        if (isStreaming) {
            return false;
        }
        // 内容太短不缓存
        if (content.length < 50) {
            return false;
        }
        // 内容太长不缓存（避免内存占用过高）
        if (content.length > 50000) {
            return false;
        }
        return true;
    }

    /**
     * 清除缓存
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * 获取缓存统计
     */
    getStats(): { size: number; maxSize: number; hitRate: number } {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            hitRate: 0, // 需要额外跟踪
        };
    }
}

// 单例导出
export const markdownCache = new MarkdownCache();
