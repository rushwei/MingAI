/**
 * MCP OAuth Server Provider 实现
 *
 * 实现 MCP SDK 的 OAuthServerProvider 接口
 */
import { MingAIClientsStore } from './store.js';
import { getCodeChallenge, getAndConsumeAuthorizationCode, saveRefreshToken, getActiveRefreshToken, revokeRefreshToken, } from './store.js';
import { signAccessToken, verifyAccessToken as jwtVerify, generateRefreshToken, } from './jwt.js';
import { renderAuthorizePage } from './authorize-page.js';
function normalizeResource(resource) {
    if (!resource)
        return null;
    const raw = typeof resource === 'string' ? resource : resource.href;
    try {
        return new URL(raw).href;
    }
    catch {
        return raw;
    }
}
function parseScopes(scope) {
    if (!scope)
        return [];
    return [...new Set(scope.split(/\s+/).map((item) => item.trim()).filter(Boolean))];
}
function resolveRefreshScope(storedScope, requestedScopes) {
    const grantedScopes = parseScopes(storedScope || 'mcp:tools');
    if (grantedScopes.length === 0)
        grantedScopes.push('mcp:tools');
    const requested = [...new Set((requestedScopes ?? []).map((item) => item.trim()).filter(Boolean))];
    if (requested.length === 0) {
        return grantedScopes.join(' ');
    }
    const grantedSet = new Set(grantedScopes);
    if (requested.some((scope) => !grantedSet.has(scope))) {
        throw new Error('Refresh token scope escalation not allowed');
    }
    return requested.join(' ');
}
function resolveBoundResource(storedResource, requestedResource, tokenType = 'Authorization code') {
    const bound = normalizeResource(storedResource);
    const requested = normalizeResource(requestedResource);
    if (requested && requested !== bound) {
        throw new Error(`${tokenType} resource mismatch`);
    }
    return bound ?? undefined;
}
export class MingAIOAuthProvider {
    _clientsStore = new MingAIClientsStore();
    deps;
    constructor(deps) {
        this.deps = {
            getCodeChallenge,
            getAndConsumeAuthorizationCode,
            saveRefreshToken,
            getActiveRefreshToken,
            revokeRefreshToken,
            signAccessToken,
            verifyAccessToken: jwtVerify,
            generateRefreshToken,
            ...deps,
        };
    }
    get clientsStore() {
        return this._clientsStore;
    }
    /**
     * 渲染授权登录页面
     *
     * SDK 的 authorizationHandler 在验证 client_id / redirect_uri / PKCE 参数后调用此方法。
     * 我们渲染 HTML 登录表单，表单 POST 到 /oauth/login（自定义路由）。
     */
    async authorize(client, params, res) {
        const html = renderAuthorizePage({
            clientName: client.client_name,
            scopes: params.scopes ?? [],
            clientId: client.client_id,
            redirectUri: params.redirectUri,
            codeChallenge: params.codeChallenge,
            codeChallengeMethod: 'S256',
            state: params.state,
            scope: params.scopes?.join(' '),
            resource: params.resource?.href,
        });
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.status(200).send(html);
    }
    /**
     * 返回授权码对应的 code_challenge
     */
    async challengeForAuthorizationCode(_client, authorizationCode) {
        const challenge = await this.deps.getCodeChallenge(authorizationCode);
        if (!challenge)
            throw new Error('Authorization code not found or expired');
        return challenge;
    }
    /**
     * 用授权码换取 access_token + refresh_token
     */
    async exchangeAuthorizationCode(client, authorizationCode, _codeVerifier, redirectUri, resource) {
        const stored = await this.deps.getAndConsumeAuthorizationCode(authorizationCode);
        if (!stored)
            throw new Error('Invalid or expired authorization code');
        if (stored.clientId !== client.client_id) {
            throw new Error('Authorization code was issued to a different client');
        }
        if (redirectUri && stored.redirectUri !== redirectUri) {
            throw new Error('Authorization code redirect_uri mismatch');
        }
        const scope = stored.scope || 'mcp:tools';
        const boundResource = resolveBoundResource(stored.resource, resource, 'Authorization code');
        const { token: accessToken, expiresIn } = await this.deps.signAccessToken(stored.userId, client.client_id, scope, boundResource);
        const refreshToken = this.deps.generateRefreshToken();
        await this.deps.saveRefreshToken({
            refreshToken,
            clientId: client.client_id,
            userId: stored.userId,
            scope,
            resource: boundResource,
        });
        return {
            access_token: accessToken,
            token_type: 'bearer',
            expires_in: expiresIn,
            refresh_token: refreshToken,
            scope,
        };
    }
    /**
     * 用 refresh_token 换取新的 access_token（token rotation）
     */
    async exchangeRefreshToken(client, refreshToken, scopes, resource) {
        const stored = await this.deps.getActiveRefreshToken(refreshToken);
        if (!stored)
            throw new Error('Invalid or expired refresh token');
        if (stored.clientId !== client.client_id) {
            throw new Error('Refresh token was issued to a different client');
        }
        const scope = resolveRefreshScope(stored.scope, scopes);
        const boundResource = resolveBoundResource(stored.resource, resource, 'Refresh token');
        // 吊销旧 token（rotation）
        await this.deps.revokeRefreshToken(refreshToken);
        const { token: accessToken, expiresIn } = await this.deps.signAccessToken(stored.userId, client.client_id, scope, boundResource);
        const newRefreshToken = this.deps.generateRefreshToken();
        await this.deps.saveRefreshToken({
            refreshToken: newRefreshToken,
            clientId: client.client_id,
            userId: stored.userId,
            scope,
            resource: boundResource,
        });
        return {
            access_token: accessToken,
            token_type: 'bearer',
            expires_in: expiresIn,
            refresh_token: newRefreshToken,
            scope,
        };
    }
    /**
     * 验证 JWT access_token
     */
    async verifyAccessToken(token) {
        return this.deps.verifyAccessToken(token);
    }
    /**
     * 吊销 token
     */
    async revokeToken(_client, request) {
        // 仅处理 refresh_token 吊销（access_token 是 JWT，无法主动吊销）
        if (request.token_type_hint === 'access_token')
            return;
        await this.deps.revokeRefreshToken(request.token);
    }
}
