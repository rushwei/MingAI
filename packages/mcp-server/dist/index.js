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
import { authMiddleware, rateLimitMiddleware, originValidationMiddleware, hostValidationMiddleware, sseConnectionLimitMiddleware, } from './middleware.js';
function readPositiveIntEnv(name, fallback) {
    const raw = process.env[name];
    if (!raw)
        return fallback;
    const parsed = Number.parseInt(raw, 10);
    if (!Number.isFinite(parsed) || parsed <= 0)
        return fallback;
    return parsed;
}
// ─── 会话管理配置 ───
const MAX_TOTAL_SESSIONS = readPositiveIntEnv('MCP_MAX_SESSIONS', 1000);
const SESSION_TTL = readPositiveIntEnv('MCP_SESSION_TTL_MS', 1800000); // 30min
const SESSION_IDLE = readPositiveIntEnv('MCP_SESSION_IDLE_MS', 600000); // 10min
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
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
// trust proxy（反向代理后需要）
if (process.env.MCP_TRUST_PROXY === 'true') {
    app.set('trust proxy', true);
}
app.use(express.json({ limit: '1mb' }));
// 健康检查（不需要认证）
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
function isSessionOwner(session, auth) {
    return session.auth.userId === auth.userId && session.auth.keyId === auth.keyId;
}
// 定期清理过期/空闲会话
setInterval(() => {
    const now = Date.now();
    for (const [id, ctx] of sessions) {
        if (now - ctx.createdAt > SESSION_TTL || now - ctx.lastActivityAt > SESSION_IDLE) {
            cleanupSession(id);
        }
    }
}, 60_000);
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
    // 调用工具（错误脱敏）
    server.server.setRequestHandler(CallToolRequestSchema, async (request) => {
        const { name, arguments: args } = request.params;
        try {
            const result = await handleToolCall(name, args || {});
            const humanReadableText = typeof result === 'string'
                ? result
                : JSON.stringify(result, null, 2) ?? String(result);
            const humanReadableContent = [{ type: 'text', text: humanReadableText }];
            const tool = tools.find((t) => t.name === name);
            if (tool?.outputSchema) {
                return {
                    structuredContent: result,
                    content: humanReadableContent,
                };
            }
            return { content: humanReadableContent };
        }
        catch (error) {
            const internalMessage = error instanceof Error ? error.message : String(error);
            const userMessage = IS_PRODUCTION
                ? 'Tool execution failed'
                : `Error: ${internalMessage}`;
            return {
                content: [{ type: 'text', text: userMessage }],
                isError: true,
            };
        }
    });
    return server;
}
// Streamable HTTP - POST: 初始化或会话消息
app.post('/mcp', originValidationMiddleware, hostValidationMiddleware, authMiddleware, rateLimitMiddleware, async (req, res) => {
    const sessionId = getSessionIdHeader(req);
    const auth = req.mcpAuth;
    // 已有会话：复用 transport
    if (sessionId) {
        const existing = sessions.get(sessionId);
        if (!existing) {
            return res.status(404).json({ error: 'Session not found' });
        }
        if (!isSessionOwner(existing, auth)) {
            return res.status(403).json({ error: 'Session does not belong to current API key' });
        }
        existing.lastActivityAt = Date.now();
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
    // 会话上限检查
    if (sessions.size >= MAX_TOTAL_SESSIONS) {
        return res.status(503).json({ error: 'Server at capacity, try again later' });
    }
    const server = createMcpServer();
    const now = Date.now();
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => crypto.randomUUID(),
        onsessioninitialized: (initializedSessionId) => {
            sessions.set(initializedSessionId, {
                server, transport, auth,
                createdAt: now, lastActivityAt: now,
            });
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
app.get('/mcp', originValidationMiddleware, hostValidationMiddleware, authMiddleware, rateLimitMiddleware, sseConnectionLimitMiddleware, async (req, res) => {
    const sessionId = getSessionIdHeader(req);
    const auth = req.mcpAuth;
    if (!sessionId) {
        return res.status(400).json({ error: 'Missing mcp-session-id header' });
    }
    const session = sessions.get(sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    if (!isSessionOwner(session, auth)) {
        return res.status(403).json({ error: 'Session does not belong to current API key' });
    }
    session.lastActivityAt = Date.now();
    await session.transport.handleRequest(req, res);
});
// Streamable HTTP - DELETE: 关闭会话
app.delete('/mcp', originValidationMiddleware, hostValidationMiddleware, authMiddleware, rateLimitMiddleware, async (req, res) => {
    const sessionId = getSessionIdHeader(req);
    const auth = req.mcpAuth;
    if (!sessionId) {
        return res.status(400).json({ error: 'Missing mcp-session-id header' });
    }
    const session = sessions.get(sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    if (!isSessionOwner(session, auth)) {
        return res.status(403).json({ error: 'Session does not belong to current API key' });
    }
    session.lastActivityAt = Date.now();
    await session.transport.handleRequest(req, res, req.body);
});
// 启动服务器
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.MCP_HOST || '127.0.0.1';
app.listen(PORT, HOST, () => {
    console.log(`MingAI MCP Server (Streamable HTTP) running on ${HOST}:${PORT} at /mcp`);
});
