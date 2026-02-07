/**
 * MingAI MCP Server - Online (SSE/HTTP)
 */
import { config } from 'dotenv';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
// 仅加载仓库根目录 .env，统一配置来源。
const currentFileDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentFileDir, '../../..');
config({ path: resolve(repoRoot, '.env'), override: false });
import crypto from 'crypto';
import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { tools, handleBaziCalculate, handleZiweiCalculate, handleLiuyaoAnalyze, handleTarotDraw, handleDailyFortune, handleLiunianAnalyze, } from '@mingai/mcp-core';
import { authMiddleware, rateLimitMiddleware } from './middleware.js';
// 工具调用处理
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleToolCall(name, args) {
    switch (name) {
        case 'bazi_calculate':
            return handleBaziCalculate(args);
        case 'ziwei_calculate':
            return handleZiweiCalculate(args);
        case 'liuyao_analyze':
            return handleLiuyaoAnalyze(args);
        case 'tarot_draw':
            return handleTarotDraw(args);
        case 'daily_fortune':
            return handleDailyFortune(args);
        case 'liunian_analyze':
            return handleLiunianAnalyze(args);
        default:
            throw new Error(`Unknown tool: ${name}`);
    }
}
const app = express();
app.use(express.json());
// 健康检查
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// 存储活跃的 transport
const transports = new Map();
// SSE 端点
app.get('/sse', authMiddleware, rateLimitMiddleware, async (_req, res) => {
    const sessionId = crypto.randomUUID();
    const transport = new SSEServerTransport(`/message/${sessionId}`, res);
    transports.set(sessionId, transport);
    const server = new Server({ name: 'mingai-mcp-online', version: '1.0.0' }, { capabilities: { tools: {} } });
    // 列出工具
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: tools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
            outputSchema: t.outputSchema,
        })),
    }));
    // 调用工具
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        try {
            const result = await handleToolCall(name, args || {});
            // 检查工具是否定义了 outputSchema
            const tool = tools.find((t) => t.name === name);
            if (tool?.outputSchema) {
                // 有 outputSchema 时返回 structuredContent
                return { structuredContent: result };
            }
            // 无 outputSchema 时返回 text content
            return {
                content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
            };
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return {
                content: [{ type: 'text', text: `Error: ${message}` }],
                isError: true,
            };
        }
    });
    // 连接服务器 (connect 会自动调用 transport.start())
    await server.connect(transport);
    // 清理函数
    const cleanup = () => {
        transports.delete(sessionId);
        server.close().catch(() => { });
    };
    // 连接关闭时清理
    res.on('close', cleanup);
    res.on('error', cleanup);
});
// 消息端点
app.post('/message/:sessionId', authMiddleware, async (req, res) => {
    const sessionId = req.params.sessionId;
    const transport = transports.get(sessionId);
    if (!transport) {
        return res.status(404).json({ error: 'Session not found' });
    }
    // 传递已解析的 body，避免 express.json() 导致的 "stream is not readable" 错误
    await transport.handlePostMessage(req, res, req.body);
});
// 启动服务器
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`MingAI MCP Server running on port ${PORT}`);
});
