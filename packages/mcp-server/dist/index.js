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
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
import { tools, handleToolCall, } from '@mingai/mcp-core';
import { dualAuthMiddleware, rateLimitMiddleware, originValidationMiddleware, hostValidationMiddleware, sseConnectionLimitMiddleware, readPositiveIntEnv, } from './middleware.js';
import { MingAIOAuthProvider } from './oauth/provider.js';
import { saveAuthorizationCode } from './oauth/store.js';
import { renderAuthorizePage } from './oauth/authorize-page.js';
import { validateOAuthLoginRequest } from './oauth/login-validation.js';
import { getAllowedTokenAudiences } from './oauth/jwt.js';
import { isOAuthDebugEnabled, oauthError } from './oauth/logger.js';
import { getSupabaseAuthClient } from './supabase.js';
// ─── 会话管理配置 ───
const MAX_TOTAL_SESSIONS = readPositiveIntEnv('MCP_MAX_SESSIONS', 1000);
const SESSION_TTL = readPositiveIntEnv('MCP_SESSION_TTL_MS', 1800000); // 30min
const SESSION_IDLE = readPositiveIntEnv('MCP_SESSION_IDLE_MS', 600000); // 10min
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
// ─── OAuth Provider ───
const oauthProvider = new MingAIOAuthProvider();
const issuerUrl = new URL(process.env.MCP_ISSUER_URL || 'https://mcp.mingai.fun');
const scopesSupported = ['mcp:tools'];
const resourceName = 'MingAI MCP Server';
const resourceServerUrl = new URL('/mcp', issuerUrl);
const oauthMetadataCompatibility = {
    issuer: issuerUrl.href,
    authorization_endpoint: new URL('/authorize', issuerUrl).href,
    response_types_supported: ['code'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint: new URL('/token', issuerUrl).href,
    token_endpoint_auth_methods_supported: ['client_secret_post', 'none'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    scopes_supported: [...scopesSupported],
    revocation_endpoint: new URL('/revoke', issuerUrl).href,
    revocation_endpoint_auth_methods_supported: ['client_secret_post'],
    registration_endpoint: new URL('/register', issuerUrl).href,
};
const protectedResourceMetadataCompatibility = {
    resource: resourceServerUrl.href,
    authorization_servers: [issuerUrl.href],
    scopes_supported: [...scopesSupported],
    resource_name: resourceName,
};
const app = express();
// trust proxy（反向代理后需要）
if (process.env.MCP_TRUST_PROXY === 'true') {
    app.set('trust proxy', true);
}
if (isOAuthDebugEnabled()) {
    // ─── OAuth 请求日志（调试用）───
    app.use((req, _res, next) => {
        const oauthPaths = ['/register', '/token', '/authorize', '/revoke', '/.well-known/'];
        const isOAuth = oauthPaths.some((p) => req.path.startsWith(p));
        if (isOAuth) {
            console.log(`[OAuth:req] ${req.method} ${req.path}`);
        }
        next();
    });
}
// ─── OAuth 路由（必须在 app root 且在 express.json 之前）───
// mcpAuthRouter 内部自带 express.urlencoded 解析
app.use(mcpAuthRouter({
    provider: oauthProvider,
    issuerUrl,
    resourceServerUrl,
    scopesSupported: [...scopesSupported],
    resourceName,
    // 禁用 SDK 内置限流，使用我们自己的
    authorizationOptions: { rateLimit: false },
    tokenOptions: { rateLimit: false },
    clientRegistrationOptions: { rateLimit: false },
    revocationOptions: { rateLimit: false },
}));
// ─── OAuth 登录表单处理（授权页 POST 目标）───
app.post('/oauth/login', express.urlencoded({ extended: false }), async (req, res) => {
    const { email, password, client_id, redirect_uri, code_challenge, code_challenge_method, state, scope, resource, } = req.body;
    // 参数校验
    if (!email || !password || !client_id || !redirect_uri || !code_challenge) {
        const html = renderAuthorizePage({
            clientId: client_id || '',
            redirectUri: redirect_uri || '',
            codeChallenge: code_challenge || '',
            codeChallengeMethod: code_challenge_method || 'S256',
            state, scope, resource,
            scopes: scope ? scope.split(' ') : [],
            error: '请填写邮箱和密码',
        });
        return res.status(400).send(html);
    }
    // 验证客户端
    let client;
    try {
        client = await oauthProvider.clientsStore.getClient(client_id);
    }
    catch (error) {
        oauthError('OAuth client lookup failed', error);
        return res.status(500).json({ error: 'OAuth service unavailable' });
    }
    if (!client) {
        return res.status(400).json({ error: 'Invalid client_id' });
    }
    const validation = validateOAuthLoginRequest({
        client,
        redirectUri: redirect_uri,
        scope,
        resource,
        issuerUrl,
        allowedAudiences: getAllowedTokenAudiences(issuerUrl),
    });
    if (!validation.ok) {
        const errorMessageMap = {
            'Invalid redirect_uri': 'redirect_uri 非法或未注册',
            'Invalid scope': 'scope 非法或超出客户端权限',
            'Invalid resource': 'resource 非法',
        };
        const html = renderAuthorizePage({
            clientName: client.client_name,
            clientId: client_id,
            redirectUri: redirect_uri,
            codeChallenge: code_challenge,
            codeChallengeMethod: code_challenge_method || 'S256',
            state,
            scope,
            resource,
            scopes: scope ? scope.split(' ') : [],
            error: errorMessageMap[validation.error] || '授权参数非法',
        });
        return res.status(400).send(html);
    }
    const validated = validation.value;
    // 用 Supabase Auth 验证用户凭据（需要纯 anon 客户端，不能用 accessToken 模式）
    const supabase = getSupabaseAuthClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    if (authError || !authData.user) {
        const clientInfo = await oauthProvider.clientsStore.getClient(client_id);
        const html = renderAuthorizePage({
            clientName: clientInfo?.client_name,
            clientId: client_id,
            redirectUri: validated.redirectUri,
            codeChallenge: code_challenge,
            codeChallengeMethod: code_challenge_method || 'S256',
            state,
            scope: validated.scope,
            resource: validated.resource,
            scopes: validated.scopes,
            error: '邮箱或密码错误',
        });
        return res.status(401).send(html);
    }
    // 生成授权码
    try {
        const code = await saveAuthorizationCode({
            clientId: client_id,
            userId: authData.user.id,
            redirectUri: validated.redirectUri,
            codeChallenge: code_challenge,
            scope: validated.scope,
            resource: validated.resource,
        });
        // 重定向回客户端
        const redirectUrl = new URL(validated.redirectUri);
        redirectUrl.searchParams.set('code', code);
        if (state)
            redirectUrl.searchParams.set('state', state);
        res.redirect(302, redirectUrl.href);
    }
    catch {
        const html = renderAuthorizePage({
            clientName: client.client_name,
            clientId: client_id,
            redirectUri: validated.redirectUri,
            codeChallenge: code_challenge,
            codeChallengeMethod: code_challenge_method || 'S256',
            state,
            scope: validated.scope,
            resource: validated.resource,
            scopes: validated.scopes,
            error: '授权失败，请重试',
        });
        return res.status(500).send(html);
    }
});
app.use(express.json({ limit: '1mb' }));
// 兼容某些客户端/网关刷新连接时探测根路径
app.get('/', (_req, res) => {
    res.status(200).json({
        name: 'MingAI MCP Server',
        status: 'ok',
        transport: 'streamable-http',
        mcp_endpoint: resourceServerUrl.pathname,
        oauth_authorization_server_metadata: '/.well-known/oauth-authorization-server',
        oauth_protected_resource_metadata: `/.well-known/oauth-protected-resource${resourceServerUrl.pathname}`,
    });
});
// 兼容 OIDC 发现探测（部分客户端会尝试 openid-configuration）
app.get('/.well-known/openid-configuration', (_req, res) => {
    res.status(200).json(oauthMetadataCompatibility);
});
app.get('/token/.well-known/openid-configuration', (_req, res) => {
    res.status(200).json(oauthMetadataCompatibility);
});
app.get('/.well-known/oauth-authorization-server/token', (_req, res) => {
    res.status(200).json(oauthMetadataCompatibility);
});
app.get('/.well-known/openid-configuration/token', (_req, res) => {
    res.status(200).json(oauthMetadataCompatibility);
});
// 兼容客户端对 root protected-resource metadata 的探测
app.get('/.well-known/oauth-protected-resource', (_req, res) => {
    res.status(200).json(protectedResourceMetadataCompatibility);
});
// 健康检查（不需要认证）
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// ─── 双模式认证中间件实例 ───
const mcpAuth = dualAuthMiddleware(oauthProvider);
const SEED_SCOPED_TOOLS = new Set(['liuyao_analyze', 'tarot_draw', 'daily_fortune']);
function withSeedScope(name, args, auth) {
    if (!SEED_SCOPED_TOOLS.has(name)) {
        return args || {};
    }
    if (!args || typeof args !== 'object' || Array.isArray(args)) {
        return { seedScope: auth.userId };
    }
    return {
        ...args,
        seedScope: auth.userId,
    };
}
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
    return session.auth.userId === auth.userId;
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
function createMcpServer(auth) {
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
        const toolArgs = withSeedScope(name, args, auth);
        try {
            const result = await handleToolCall(name, toolArgs);
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
async function handleStatelessRequest(req, res, auth, parsedBody) {
    const server = createMcpServer(auth);
    const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
    });
    transport.onclose = () => {
        void server.close().catch(() => { });
    };
    transport.onerror = () => {
        void server.close().catch(() => { });
    };
    try {
        await server.connect(transport);
        await transport.handleRequest(req, res, parsedBody);
    }
    catch (error) {
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
    finally {
        if (req.method !== 'GET') {
            await server.close().catch(() => { });
        }
    }
}
// Streamable HTTP - POST: 初始化或会话消息
app.post('/mcp', originValidationMiddleware, hostValidationMiddleware, mcpAuth, rateLimitMiddleware, async (req, res) => {
    const sessionId = getSessionIdHeader(req);
    const auth = req.mcpAuth;
    // 已有会话：复用 transport
    if (sessionId) {
        const existing = sessions.get(sessionId);
        if (!existing) {
            return res.status(404).json({ error: 'Session not found' });
        }
        if (!isSessionOwner(existing, auth)) {
            return res.status(403).json({ error: 'Session does not belong to current user' });
        }
        existing.lastActivityAt = Date.now();
        await existing.transport.handleRequest(req, res, req.body);
        return;
    }
    // 兼容无 session-id 的 stateless 客户端（例如部分 MCP 集成实现）
    if (!sessionId && !isInitializeRequest(req.body)) {
        await handleStatelessRequest(req, res, auth, req.body);
        return;
    }
    // 会话上限检查
    if (sessions.size >= MAX_TOTAL_SESSIONS) {
        return res.status(503).json({ error: 'Server at capacity, try again later' });
    }
    const server = createMcpServer(auth);
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
app.get('/mcp', originValidationMiddleware, hostValidationMiddleware, mcpAuth, rateLimitMiddleware, sseConnectionLimitMiddleware, async (req, res) => {
    const sessionId = getSessionIdHeader(req);
    const auth = req.mcpAuth;
    if (!sessionId) {
        await handleStatelessRequest(req, res, auth);
        return;
    }
    const session = sessions.get(sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    if (!isSessionOwner(session, auth)) {
        return res.status(403).json({ error: 'Session does not belong to current user' });
    }
    session.lastActivityAt = Date.now();
    await session.transport.handleRequest(req, res);
});
// Streamable HTTP - DELETE: 关闭会话
app.delete('/mcp', originValidationMiddleware, hostValidationMiddleware, mcpAuth, rateLimitMiddleware, async (req, res) => {
    const sessionId = getSessionIdHeader(req);
    const auth = req.mcpAuth;
    if (!sessionId) {
        await handleStatelessRequest(req, res, auth, req.body);
        return;
    }
    const session = sessions.get(sessionId);
    if (!session) {
        return res.status(404).json({ error: 'Session not found' });
    }
    if (!isSessionOwner(session, auth)) {
        return res.status(403).json({ error: 'Session does not belong to current user' });
    }
    session.lastActivityAt = Date.now();
    await session.transport.handleRequest(req, res, req.body);
});
// 启动服务器
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.MCP_HOST || '127.0.0.1';
const httpServer = app.listen(PORT, HOST, () => {
    console.log(`MingAI MCP Server (Streamable HTTP + OAuth 2.1) running on ${HOST}:${PORT} at /mcp`);
});
// ─── 优雅关闭 ───
function gracefulShutdown(signal) {
    console.log(`\n[${signal}] Shutting down MCP server...`);
    // 停止接受新连接
    httpServer.close(() => {
        console.log('HTTP server closed');
    });
    // 清理所有活跃会话
    for (const [id] of sessions) {
        cleanupSession(id);
    }
    console.log(`Cleaned up ${sessions.size === 0 ? 'all' : sessions.size} sessions`);
    // 给进行中的请求一点时间完成
    setTimeout(() => {
        process.exit(0);
    }, 3000);
}
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
