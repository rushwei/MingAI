/**
 * SSE 解析 Web Worker
 *
 * 将 SSE 流解析移到 Worker 线程，释放主线程
 */

export interface SSEWorkerMessage {
    type: 'chunk' | 'done' | 'error';
    data?: SSEParsedData;
    error?: string;
}

export interface SSEParsedData {
    content?: string;
    reasoning?: string;
    metadata?: Record<string, unknown>;
    isDone?: boolean;
}

// 行缓冲，用于处理跨 chunk 边界的不完整行
let lineBuffer = '';

// Worker 消息处理
self.onmessage = async (event: MessageEvent<{ type: string; chunk?: string }>) => {
    const { type, chunk } = event.data;

    if (type === 'parse' && chunk) {
        try {
            const results = parseSSEChunk(chunk);
            for (const result of results) {
                self.postMessage({ type: 'chunk', data: result } as SSEWorkerMessage);
            }
        } catch (error) {
            self.postMessage({
                type: 'error',
                error: error instanceof Error ? error.message : 'Parse error',
            } as SSEWorkerMessage);
        }
    } else if (type === 'done') {
        // 重置缓冲
        lineBuffer = '';
        self.postMessage({ type: 'done' } as SSEWorkerMessage);
    } else if (type === 'reset') {
        // 重置缓冲
        lineBuffer = '';
    }
};

/**
 * 解析 SSE 数据块（带行缓冲）
 */
function parseSSEChunk(chunk: string): SSEParsedData[] {
    const results: SSEParsedData[] = [];

    // 将新 chunk 追加到缓冲
    lineBuffer += chunk;

    // 按换行符分割
    const lines = lineBuffer.split('\n');

    // 最后一个元素可能是不完整的行，保留到缓冲
    lineBuffer = lines.pop() ?? '';

    for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        const data = line.slice(6);
        if (data === '[DONE]') {
            results.push({ isDone: true });
            continue;
        }

        try {
            const parsed = JSON.parse(data);

            // 处理元数据
            if (parsed?.type === 'meta' && parsed?.metadata) {
                results.push({ metadata: parsed.metadata });
                continue;
            }

            // 处理 delta 内容
            const delta = parsed.choices?.[0]?.delta;
            if (delta) {
                const result: SSEParsedData = {};

                if (delta.reasoning_content) {
                    result.reasoning = delta.reasoning_content;
                }

                if (typeof delta.content === 'string' && delta.content) {
                    result.content = delta.content;
                }

                if (result.content || result.reasoning) {
                    results.push(result);
                }
            }
        } catch {
            // 跳过解析错误
        }
    }

    return results;
}

export {};
