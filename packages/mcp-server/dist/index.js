/**
 * MingAI MCP Server - Online (Streamable HTTP)
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
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema, isInitializeRequest, } from '@modelcontextprotocol/sdk/types.js';
import { tools, handleBaziCalculate, handleBaziPillarsResolve, handleZiweiCalculate, handleLiuyaoAnalyze, handleTarotDraw, handleDailyFortune, handleLiunianAnalyze, } from '@mingai/mcp-core';
import { authMiddleware, rateLimitMiddleware } from './middleware.js';
// 工具调用处理
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleToolCall(name, args) {
    switch (name) {
        case 'bazi_calculate':
            return handleBaziCalculate(args);
        case 'bazi_pillars_resolve':
            return handleBaziPillarsResolve(args);
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
// 存储活跃会话
const sessions = new Map();
function getSessionIdHeader(req) {
    const sessionId = req.headers['mcp-session-id'];
    return typeof sessionId === 'string' ? sessionId : undefined;
}
function cleanupSession(sessionId) {
    const session = sessions.get(sessionId);
    if (!session)
        return;
    sessions.delete(sessionId);
    session.server.close().catch(() => { });
}
function createMcpServer() {
    const server = new McpServer({ name: 'mingai-mcp-online', version: '1.0.0' }, { capabilities: { tools: {} } });
    // 列出工具
    server.server.setRequestHandler(ListToolsRequestSchema, async () => ({
        tools: tools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
            outputSchema: t.outputSchema,
        })),
    }));
    // 调用工具
    server.server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        try {
            const result = await handleToolCall(name, args || {});
            const humanReadableText = typeof result === 'string'
                ? result
                : JSON.stringify(result, null, 2) ?? String(result);
            const humanReadableContent = [{ type: 'text', text: humanReadableText }];
            // 检查工具是否定义了 outputSchema
            const tool = tools.find((t) => t.name === name);
            if (tool?.outputSchema) {
                // 有 outputSchema 时同时返回 structuredContent + 可读 content
                return {
                    structuredContent: result,
                    content: humanReadableContent,
                };
            }
            // 无 outputSchema 时返回 text content
            return {
                content: humanReadableContent,
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
    return server;
}
// Streamable HTTP - POST: 初始化或会话消息
app.post('/mcp', authMiddleware, rateLimitMiddleware, async (req, res) => {
    const sessionId = getSessionIdHeader(req);
    // 已有会话：复用 transport
    if (sessionId) {
        const existing = sessions.get(sessionId);
        if (!existing) {
            return res.status(404).json({ error: 'Session not found' });
        }
        await existing.transport.handleRequest(req, res, req.body);
        return;
    }
    // 新建会话必须是 initialize 请求
    if (!isInitializeRequest(req.body)) {
        return res.status(400).json({
            jsonrpc: '2.0',
            error: {
                code: -32000,
                message: 'Bad Request: No valid session ID provided',
            },
            id: null,
        });
    }
    const server = createMcpServer();
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (initializedSessionId) => {
            sessions.set(initializedSessionId, { server, transport });
        },
        onsessionclosed: (closedSessionId) => {
            cleanupSession(closedSessionId);
        },
    });
    transport.onclose = () => {
        if (transport.sessionId) {
            cleanupSession(transport.sessionId);
        }
    };
    transport.onerror = () => {
        if (transport.sessionId) {
            cleanupSession(transport.sessionId);
        }
    };
    try {
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
    }
    catch (error) {
        if (transport.sessionId) {
            sessions.delete(transport.sessionId);
        }
        await server.close().catch(() => { });
        if (!res.headersSent) {
            return res.status(500).json({
                jsonrpc: '2.0',
                error: {
                    code: -32603,
                    message: 'Internal server error',
                },
                id: null,
            });
        }
        throw error;
    }
});
// Streamable HTTP - GET: 建立/恢复 SSE 流
app.get('/mcp', authMiddleware, rateLimitMiddleware, async (req, res) => {
    const sessionId = getSessionIdHeader(req);
    if (!sessionId) {
        return res.status(400).json({ error: 'Missing mcp-session-id header' });
    }
    const session = sessions.get(sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    await session.transport.handleRequest(req, res);
});
// Streamable HTTP - DELETE: 关闭会话
app.delete('/mcp', authMiddleware, rateLimitMiddleware, async (req, res) => {
    const sessionId = getSessionIdHeader(req);
    if (!sessionId) {
        return res.status(400).json({ error: 'Missing mcp-session-id header' });
    }
    const session = sessions.get(sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    await session.transport.handleRequest(req, res, req.body);
});
// 启动服务器
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`MingAI MCP Server (Streamable HTTP) running on port ${PORT} at /mcp`);
});
