/**
 * Web Worker 版本的流式响应 Hook
 *
 * 将 SSE 解析移到 Worker 线程，释放主线程
 * 提升 UI 流畅度，避免长对话时卡顿
 */
'use client';

import { useRef, useCallback, useEffect } from 'react';

export interface ParsedChunk {
    type: 'content' | 'reasoning' | 'meta' | 'done' | 'error';
    content?: string;
    reasoning?: string;
    metadata?: Record<string, unknown>;
    error?: string;
}

interface UseStreamingWorkerOptions {
    onContent?: (content: string) => void;
    onReasoning?: (reasoning: string) => void;
    onMeta?: (metadata: Record<string, unknown>) => void;
    onDone?: () => void;
    onError?: (error: string) => void;
}

export function useStreamingWorker(options: UseStreamingWorkerOptions) {
    const workerRef = useRef<Worker | null>(null);
    const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
    // 使用 ref 存储回调，避免依赖问题
    const optionsRef = useRef(options);
    // 处理状态标记，防止并发调用
    const isProcessingRef = useRef(false);
    // 会话 ID，用于解决竞态条件（区分不同的流处理会话）
    const sessionIdRef = useRef(0);

    // 在 effect 中更新 ref，避免渲染期间更新
    useEffect(() => {
        optionsRef.current = options;
    });

    // 初始化 Worker
    useEffect(() => {
        if (typeof window === 'undefined') return;

        workerRef.current = new Worker(
            new URL('../workers/sse-parser.worker.ts', import.meta.url)
        );

        // Worker 错误处理
        workerRef.current.onerror = (event: ErrorEvent) => {
            const errorMessage = event.message || 'Worker 执行错误';
            console.error('[SSE Worker Error]', errorMessage);
            optionsRef.current.onError?.(errorMessage);
        };

        workerRef.current.onmessage = (event: MessageEvent<ParsedChunk>) => {
            const chunk = event.data;
            switch (chunk.type) {
                case 'content':
                    optionsRef.current.onContent?.(chunk.content || '');
                    break;
                case 'reasoning':
                    optionsRef.current.onReasoning?.(chunk.reasoning || '');
                    break;
                case 'meta':
                    optionsRef.current.onMeta?.(chunk.metadata || {});
                    break;
                case 'done':
                    optionsRef.current.onDone?.();
                    break;
                case 'error':
                    optionsRef.current.onError?.(chunk.error || 'Unknown error');
                    break;
            }
        };

        return () => {
            // 取消正在进行的流读取
            readerRef.current?.cancel();
            readerRef.current = null;
            isProcessingRef.current = false;
            // 终止 Worker
            workerRef.current?.terminate();
            workerRef.current = null;
        };
    }, []);

    // 处理流式响应
    const processStream = useCallback(async (response: Response) => {
        // 生成新的会话 ID
        const currentSessionId = ++sessionIdRef.current;

        // 并发流保护：如果正在处理中，先取消之前的流
        if (isProcessingRef.current && readerRef.current) {
            console.warn('[SSE Worker] 检测到并发流，取消之前的流');
            try {
                await readerRef.current.cancel();
            } catch {
                // 忽略取消错误
            }
            readerRef.current = null;
            workerRef.current?.postMessage({ type: 'stop' });
        }

        const reader = response.body?.getReader();
        if (!reader || !workerRef.current) return;

        // 标记开始处理
        isProcessingRef.current = true;
        // 保存 reader 引用，用于 stop 时取消
        readerRef.current = reader;

        try {
            while (true) {
                // 检查 Worker 是否仍然可用（组件可能已卸载）
                if (!workerRef.current) {
                    break;
                }

                const { done, value } = await reader.read();
                if (done) break;

                // 再次检查（await 期间可能发生变化）
                if (!workerRef.current) {
                    break;
                }

                // 将数据发送到 Worker 处理（使用 Transferable 优化）
                workerRef.current.postMessage({
                    type: 'start',
                    streamData: value.buffer,
                }, [value.buffer]);
            }
        } catch (error) {
            if (error instanceof Error && error.name !== 'AbortError') {
                optionsRef.current.onError?.(error.message);
            }
        } finally {
            // 只有当前会话才能重置状态（解决竞态条件）
            if (sessionIdRef.current === currentSessionId) {
                readerRef.current = null;
                isProcessingRef.current = false;
            }
        }
    }, []);

    // 停止处理
    const stop = useCallback(() => {
        // 取消正在进行的流读取
        readerRef.current?.cancel();
        readerRef.current = null;
        // 重置处理状态
        isProcessingRef.current = false;
        // 通知 Worker 停止处理
        workerRef.current?.postMessage({ type: 'stop' });
    }, []);

    // 检查是否正在处理
    const isProcessing = useCallback(() => isProcessingRef.current, []);

    return { processStream, stop, isProcessing };
}
