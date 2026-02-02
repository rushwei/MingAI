/**
 * Web Worker 版本的流式响应 Hook
 *
 * 'use client' 标记说明：
 * - 使用 React hooks
 * - 需要在客户端创建 Web Worker
 */
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type { SSEWorkerMessage, SSEParsedData } from '@/workers/sse-parser.worker';

export interface StreamingResponseWorkerState {
    content: string;
    reasoning: string;
    metadata: Record<string, unknown> | null;
    isStreaming: boolean;
    error: string | null;
}

export interface StreamingResponseWorkerActions {
    startStream: (response: Response) => Promise<void>;
    reset: () => void;
    stop: () => void;
}

export type UseStreamingResponseWorkerReturn = StreamingResponseWorkerState & StreamingResponseWorkerActions;

/**
 * Web Worker 版本的流式响应处理 Hook
 *
 * 将 SSE 解析移到 Worker 线程，释放主线程用于渲染
 */
export function useStreamingResponseWorker(): UseStreamingResponseWorkerReturn {
    const [content, setContent] = useState('');
    const [reasoning, setReasoning] = useState('');
    const [metadata, setMetadata] = useState<Record<string, unknown> | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const workerRef = useRef<Worker | null>(null);
    const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
    const contentRef = useRef('');
    const reasoningRef = useRef('');

    // 处理解析后的数据 - 使用 ref 存储以避免 useEffect 依赖问题
    const handleParsedDataRef = useRef((data: SSEParsedData) => {
        if (data.isDone) {
            setIsStreaming(false);
            return;
        }

        if (data.metadata) {
            setMetadata(data.metadata);
        }

        if (data.reasoning) {
            reasoningRef.current += data.reasoning;
            setReasoning(reasoningRef.current);
        }

        if (data.content) {
            contentRef.current += data.content;
            setContent(contentRef.current);
        }
    });

    // 初始化 Worker
    useEffect(() => {
        if (typeof window === 'undefined') return;

        workerRef.current = new Worker(
            new URL('@/workers/sse-parser.worker.ts', import.meta.url),
            { type: 'module' }
        );

        workerRef.current.onmessage = (event: MessageEvent<SSEWorkerMessage>) => {
            const { type, data, error: workerError } = event.data;

            if (type === 'error') {
                setError(workerError || 'Worker error');
                return;
            }

            if (type === 'done') {
                setIsStreaming(false);
                return;
            }

            if (type === 'chunk' && data) {
                handleParsedDataRef.current(data);
            }
        };

        return () => {
            workerRef.current?.terminate();
            workerRef.current = null;
        };
    }, []);

    // 开始流式处理
    const startStream = useCallback(async (response: Response) => {
        if (!response.body) {
            setError('Response body is null');
            return;
        }

        setIsStreaming(true);
        setError(null);
        contentRef.current = '';
        reasoningRef.current = '';

        const reader = response.body.getReader();
        readerRef.current = reader;
        const decoder = new TextDecoder();

        try {
            while (true) {
                const { done, value } = await reader.read();

                if (done) {
                    workerRef.current?.postMessage({ type: 'done' });
                    break;
                }

                const chunk = decoder.decode(value, { stream: true });
                workerRef.current?.postMessage({ type: 'parse', chunk });
            }
        } catch (err) {
            if (err instanceof Error && err.name !== 'AbortError') {
                setError(err.message);
            }
        } finally {
            setIsStreaming(false);
        }
    }, []);

    // 重置状态
    const reset = useCallback(() => {
        contentRef.current = '';
        reasoningRef.current = '';
        setContent('');
        setReasoning('');
        setMetadata(null);
        setIsStreaming(false);
        setError(null);
        // 重置 Worker 的 lineBuffer
        workerRef.current?.postMessage({ type: 'reset' });
    }, []);

    // 停止流
    const stop = useCallback(() => {
        // 取消 reader 以停止网络请求和读取循环
        readerRef.current?.cancel();
        readerRef.current = null;
        setIsStreaming(false);
        // 重置 Worker 的 lineBuffer
        workerRef.current?.postMessage({ type: 'reset' });
    }, []);

    return {
        content,
        reasoning,
        metadata,
        isStreaming,
        error,
        startStream,
        reset,
        stop,
    };
}
