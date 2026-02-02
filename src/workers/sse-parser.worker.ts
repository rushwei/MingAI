/**
 * SSE 解析 Web Worker
 *
 * 将 SSE 流解析移到 Worker 线程，释放主线程
 * 避免 JSON 解析阻塞 UI 渲染
 *
 * 支持两种消息格式：
 * 1. 新格式 (useStreamingWorker): { type: 'start' | 'stop', streamData: ArrayBuffer }
 * 2. 旧格式 (useStreamingResponseWorker): { type: 'parse' | 'done' | 'reset', chunk: string }
 */

// ============ 新格式类型定义 (useStreamingWorker 使用) ============

/** 新版 Worker 输入消息类型 */
export interface WorkerMessage {
    type: 'start' | 'stop';
    streamData?: ArrayBuffer;
}

/** 新版解析结果类型 */
export interface ParsedChunk {
    type: 'content' | 'reasoning' | 'meta' | 'done' | 'error';
    content?: string;
    reasoning?: string;
    metadata?: Record<string, unknown>;
    error?: string;
}

// ============ 向后兼容的类型导出 (useStreamingResponseWorker 使用) ============

/** 旧版 Worker 输出消息类型 */
export interface SSEWorkerMessage {
    type: 'chunk' | 'done' | 'error';
    data?: SSEParsedData;
    error?: string;
}

/** 旧版解析数据类型 */
export interface SSEParsedData {
    content?: string;
    reasoning?: string;
    metadata?: Record<string, unknown>;
    isDone?: boolean;
}

/** 旧版 Worker 输入消息类型 */
interface LegacyInputMessage {
    type: 'parse' | 'done' | 'reset';
    chunk?: string;
}

// ============ 状态变量 ============

// 行缓冲区
let lineBuffer = '';

// 持久的 TextDecoder 实例，用于处理 UTF-8 多字节字符跨 chunk 的情况
let streamingDecoder: TextDecoder | null = null;

// ============ 解析函数 ============

/** 解析 SSE 数据行，返回新格式的 ParsedChunk */
function parseSSELine(line: string): ParsedChunk | null {
    if (!line.startsWith('data: ')) return null;

    const data = line.slice(6);
    if (data === '[DONE]') {
        return { type: 'done' };
    }

    try {
        const parsed = JSON.parse(data);

        // 处理元数据
        if (parsed?.type === 'meta' && parsed?.metadata) {
            return { type: 'meta', metadata: parsed.metadata };
        }

        const delta = parsed.choices?.[0]?.delta;
        if (!delta) return null;

        // 处理推理内容
        if (delta.reasoning_content) {
            return { type: 'reasoning', reasoning: delta.reasoning_content };
        }

        // 处理正常内容
        if (delta.content) {
            return { type: 'content', content: delta.content };
        }

        return null;
    } catch {
        return null;
    }
}

/** 处理接收到的文本数据块 */
function processChunk(chunk: string, useLegacyFormat: boolean): void {
    lineBuffer += chunk;
    const lines = lineBuffer.split('\n');
    lineBuffer = lines.pop() ?? '';

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const parsed = parseSSELine(trimmed);
        if (parsed) {
            if (useLegacyFormat) {
                // 转换为旧格式输出
                sendLegacyMessage(parsed);
            } else {
                // 新格式直接发送
                self.postMessage(parsed);
            }
        }
    }
}

/** 将新格式转换为旧格式并发送 */
function sendLegacyMessage(chunk: ParsedChunk): void {
    if (chunk.type === 'done') {
        const msg: SSEWorkerMessage = {
            type: 'chunk',
            data: { isDone: true }
        };
        self.postMessage(msg);
    } else if (chunk.type === 'error') {
        const msg: SSEWorkerMessage = {
            type: 'error',
            error: chunk.error
        };
        self.postMessage(msg);
    } else {
        const data: SSEParsedData = {};
        if (chunk.content) data.content = chunk.content;
        if (chunk.reasoning) data.reasoning = chunk.reasoning;
        if (chunk.metadata) data.metadata = chunk.metadata;

        const msg: SSEWorkerMessage = {
            type: 'chunk',
            data
        };
        self.postMessage(msg);
    }
}

/** 重置状态 */
function resetState(): void {
    lineBuffer = '';
    streamingDecoder = null;
}

// ============ 消息处理 ============

// 统一的输入消息类型
type InputMessage = WorkerMessage | LegacyInputMessage;

self.onmessage = (event: MessageEvent<InputMessage>) => {
    const msg = event.data;

    // 检测消息格式
    if (msg.type === 'start' || msg.type === 'stop') {
        // 新格式
        if (msg.type === 'stop') {
            resetState();
            return;
        }

        if (msg.type === 'start' && (msg as WorkerMessage).streamData) {
            // 初始化或复用流式解码器（处理 UTF-8 多字节字符跨 chunk）
            if (!streamingDecoder) {
                streamingDecoder = new TextDecoder('utf-8', { fatal: false });
            }
            const text = streamingDecoder.decode(
                (msg as WorkerMessage).streamData,
                { stream: true }  // 关键：启用流式模式
            );
            processChunk(text, false);
        }
    } else if (msg.type === 'parse' || msg.type === 'done' || msg.type === 'reset') {
        // 旧格式
        if (msg.type === 'reset') {
            resetState();
            return;
        }

        if (msg.type === 'done') {
            // 处理剩余的 lineBuffer
            if (lineBuffer.trim()) {
                const parsed = parseSSELine(lineBuffer.trim());
                if (parsed) {
                    sendLegacyMessage(parsed);
                }
            }
            // 发送完成消息
            const doneMsg: SSEWorkerMessage = { type: 'done' };
            self.postMessage(doneMsg);
            resetState();
            return;
        }

        if (msg.type === 'parse' && (msg as LegacyInputMessage).chunk) {
            processChunk((msg as LegacyInputMessage).chunk!, true);
        }
    }
};
