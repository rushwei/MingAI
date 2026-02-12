/**
 * MCP OAuth 数据存储层
 *
 * 实现 OAuthRegisteredClientsStore 接口 + 授权码/Token CRUD
 */
import type { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';
import type { OAuthRegisteredClientsStore } from '@modelcontextprotocol/sdk/server/auth/clients.js';
import { getSupabaseClient } from '../supabase.js';
export declare class MingAIClientsStore implements OAuthRegisteredClientsStore {
    getClient(clientId: string): Promise<OAuthClientInformationFull | undefined>;
    registerClient(clientData: OAuthClientInformationFull): Promise<OAuthClientInformationFull>;
}
export interface StoredAuthCode {
    code: string;
    clientId: string;
    userId: string;
    redirectUri: string;
    codeChallenge: string;
    codeChallengeMethod: string;
    scope: string | null;
    resource: string | null;
    expiresAt: Date;
}
export interface StoredRefreshToken {
    userId: string;
    clientId: string;
    scope: string | null;
    resource: string | null;
}
type SupabaseFromOnly = Pick<ReturnType<typeof getSupabaseClient>, 'from'>;
export declare function saveAuthorizationCode(params: {
    clientId: string;
    userId: string;
    redirectUri: string;
    codeChallenge: string;
    scope?: string;
    resource?: string;
}): Promise<string>;
export declare function consumeAuthorizationCodeAtomically(code: string, supabase?: SupabaseFromOnly): Promise<StoredAuthCode | null>;
export declare function getAndConsumeAuthorizationCode(code: string): Promise<StoredAuthCode | null>;
/**
 * 查询授权码对应的 code_challenge（不消费 code）。
 *
 * SDK 流程：先调 challengeForAuthorizationCode 做 PKCE 校验，
 * 再调 exchangeAuthorizationCode 原子消费 code。
 * 此处只读不写是安全的——consumeAuthorizationCodeAtomically 的
 * UPDATE ... WHERE used=false 保证了并发下只有一个请求能成功换码。
 */
export declare function getCodeChallenge(code: string): Promise<string | null>;
export declare function saveRefreshToken(params: {
    refreshToken: string;
    clientId: string;
    userId: string;
    scope?: string;
    resource?: string;
}, supabase?: SupabaseFromOnly): Promise<void>;
export declare function getActiveRefreshToken(refreshToken: string, supabase?: SupabaseFromOnly): Promise<StoredRefreshToken | null>;
export declare function revokeRefreshToken(refreshToken: string): Promise<void>;
export {};
