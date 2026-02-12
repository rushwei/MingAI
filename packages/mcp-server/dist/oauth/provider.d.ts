/**
 * MCP OAuth Server Provider 实现
 *
 * 实现 MCP SDK 的 OAuthServerProvider 接口
 */
import type { Response } from 'express';
import type { OAuthServerProvider, AuthorizationParams } from '@modelcontextprotocol/sdk/server/auth/provider.js';
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import type { OAuthClientInformationFull, OAuthTokens, OAuthTokenRevocationRequest } from '@modelcontextprotocol/sdk/shared/auth.js';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
import { type StoredAuthCode, type StoredRefreshToken } from './store.js';
type OAuthProviderDeps = {
    getCodeChallenge: (code: string) => Promise<string | null>;
    getAndConsumeAuthorizationCode: (code: string) => Promise<StoredAuthCode | null>;
    saveRefreshToken: (params: {
        refreshToken: string;
        clientId: string;
        userId: string;
        scope?: string;
        resource?: string;
    }) => Promise<void>;
    getActiveRefreshToken: (refreshToken: string) => Promise<StoredRefreshToken | null>;
    revokeRefreshToken: (refreshToken: string) => Promise<void>;
    signAccessToken: (userId: string, clientId: string, scope: string, resource?: string) => Promise<{
        token: string;
        expiresIn: number;
    }>;
    verifyAccessToken: (token: string) => Promise<AuthInfo>;
    generateRefreshToken: () => string;
};
export declare class MingAIOAuthProvider implements OAuthServerProvider {
    private _clientsStore;
    private deps;
    constructor(deps?: Partial<OAuthProviderDeps>);
    get clientsStore(): OAuthRegisteredClientsStore;
    /**
     * 渲染授权登录页面
     *
     * SDK 的 authorizationHandler 在验证 client_id / redirect_uri / PKCE 参数后调用此方法。
     * 我们渲染 HTML 登录表单，表单 POST 到 /oauth/login（自定义路由）。
     */
    authorize(client: OAuthClientInformationFull, params: AuthorizationParams, res: Response): Promise<void>;
    /**
     * 返回授权码对应的 code_challenge
     */
    challengeForAuthorizationCode(_client: OAuthClientInformationFull, authorizationCode: string): Promise<string>;
    /**
     * 用授权码换取 access_token + refresh_token
     */
    exchangeAuthorizationCode(client: OAuthClientInformationFull, authorizationCode: string, _codeVerifier?: string, redirectUri?: string, resource?: URL): Promise<OAuthTokens>;
    /**
     * 用 refresh_token 换取新的 access_token（token rotation）
     */
    exchangeRefreshToken(client: OAuthClientInformationFull, refreshToken: string, scopes?: string[], resource?: URL): Promise<OAuthTokens>;
    /**
     * 验证 JWT access_token
     */
    verifyAccessToken(token: string): Promise<AuthInfo>;
    /**
     * 吊销 token
     */
    revokeToken(_client: OAuthClientInformationFull, request: OAuthTokenRevocationRequest): Promise<void>;
}
export {};
