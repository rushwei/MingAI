/**
 * MCP OAuth 数据存储层
 *
 * 实现 OAuthRegisteredClientsStore 接口 + 授权码/Token CRUD
 */
import crypto from 'crypto';
import { getSupabaseClient } from '../supabase.js';
import { getRefreshTokenTTL } from './jwt.js';
import { oauthDebug, oauthError, oauthWarn } from './logger.js';
// ─── Client Store（SDK 接口）───
export class MingAIClientsStore {
    async getClient(clientId) {
        let data = null;
        let error = null;
        try {
            const supabase = getSupabaseClient();
            const result = await supabase
                .from('mcp_oauth_clients')
                .select('*')
                .eq('client_id', clientId)
                .maybeSingle();
            data = result.data;
            error = result.error;
        }
        catch (cause) {
            throw new Error(`Failed to query OAuth client store: ${cause instanceof Error ? cause.message : String(cause)}`);
        }
        if (error) {
            throw new Error(`Failed to query OAuth client store: ${error.message ?? 'unknown error'} (${error.code ?? 'n/a'})`);
        }
        if (!data) {
            oauthWarn('getClient: no client found');
            return undefined;
        }
        return {
            client_id: data.client_id,
            client_secret: data.client_secret ?? undefined,
            client_id_issued_at: data.client_id_issued_at ?? undefined,
            client_secret_expires_at: data.client_secret_expires_at ?? undefined,
            redirect_uris: data.redirect_uris,
            grant_types: data.grant_types ?? undefined,
            response_types: data.response_types ?? undefined,
            token_endpoint_auth_method: data.token_endpoint_auth_method ?? undefined,
            client_name: data.client_name ?? undefined,
            client_uri: data.client_uri ?? undefined,
            logo_uri: data.logo_uri ?? undefined,
            scope: data.scope ?? undefined,
        };
    }
    async registerClient(clientData) {
        const supabase = getSupabaseClient();
        // SDK 会预先生成 client_id，优先使用；仅在缺失时自行生成
        const clientId = clientData.client_id || crypto.randomUUID();
        const issuedAt = clientData.client_id_issued_at || Math.floor(Date.now() / 1000);
        const row = {
            client_id: clientId,
            client_secret: clientData.client_secret ?? null,
            client_secret_expires_at: clientData.client_secret_expires_at ?? null,
            client_id_issued_at: issuedAt,
            redirect_uris: clientData.redirect_uris,
            grant_types: clientData.grant_types ?? ['authorization_code', 'refresh_token'],
            response_types: clientData.response_types ?? ['code'],
            token_endpoint_auth_method: clientData.token_endpoint_auth_method ?? 'none',
            client_name: clientData.client_name ?? null,
            client_uri: clientData.client_uri ?? null,
            logo_uri: clientData.logo_uri ?? null,
            scope: clientData.scope ?? null,
        };
        oauthDebug('registerClient called');
        const { error } = await supabase.from('mcp_oauth_clients').insert(row);
        if (error) {
            oauthError(`registerClient failed (${error.code ?? 'n/a'})`, error.message);
            throw new Error(`Failed to register client: ${error.message}`);
        }
        oauthDebug('registerClient succeeded');
        return {
            ...clientData,
            client_id: clientId,
            client_id_issued_at: issuedAt,
        };
    }
}
export async function saveAuthorizationCode(params) {
    const supabase = getSupabaseClient();
    const code = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 分钟
    oauthDebug('saveAuthorizationCode called');
    const { error } = await supabase.from('mcp_oauth_codes').insert({
        code,
        client_id: params.clientId,
        user_id: params.userId,
        redirect_uri: params.redirectUri,
        code_challenge: params.codeChallenge,
        code_challenge_method: 'S256',
        scope: params.scope ?? null,
        resource: params.resource ?? null,
        expires_at: expiresAt.toISOString(),
    });
    if (error) {
        oauthError(`saveAuthorizationCode failed (${error.code ?? 'n/a'})`, error.message);
        throw new Error(`Failed to save auth code: ${error.message}`);
    }
    oauthDebug('saveAuthorizationCode succeeded');
    return code;
}
function toStoredAuthCode(data) {
    return {
        code: data.code,
        clientId: data.client_id,
        userId: data.user_id,
        redirectUri: data.redirect_uri,
        codeChallenge: data.code_challenge,
        codeChallengeMethod: data.code_challenge_method,
        scope: data.scope,
        resource: data.resource,
        expiresAt: new Date(data.expires_at),
    };
}
export async function consumeAuthorizationCodeAtomically(code, supabase = getSupabaseClient()) {
    oauthDebug('consumeAuthorizationCodeAtomically called');
    // 单条 UPDATE + 条件过滤，避免并发重放。
    const { data, error } = await supabase
        .from('mcp_oauth_codes')
        .update({ used: true })
        .eq('code', code)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .select('*')
        .maybeSingle();
    if (error) {
        oauthError(`consumeAuthorizationCodeAtomically query failed (${error.code ?? 'n/a'})`, error.message);
        return null;
    }
    if (!data) {
        oauthWarn('consumeAuthorizationCodeAtomically: no matching code');
        return null;
    }
    oauthDebug('consumeAuthorizationCodeAtomically succeeded');
    return toStoredAuthCode(data);
}
export async function getAndConsumeAuthorizationCode(code) {
    return consumeAuthorizationCodeAtomically(code);
}
/**
 * 查询授权码对应的 code_challenge（不消费 code）。
 *
 * SDK 流程：先调 challengeForAuthorizationCode 做 PKCE 校验，
 * 再调 exchangeAuthorizationCode 原子消费 code。
 * 此处只读不写是安全的——consumeAuthorizationCodeAtomically 的
 * UPDATE ... WHERE used=false 保证了并发下只有一个请求能成功换码。
 */
export async function getCodeChallenge(code) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
        .from('mcp_oauth_codes')
        .select('code_challenge')
        .eq('code', code)
        .eq('used', false)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
    if (error || !data)
        return null;
    return data.code_challenge;
}
// ─── Refresh Token 存储 ───
export async function saveRefreshToken(params, supabase = getSupabaseClient()) {
    const ttlMs = getRefreshTokenTTL() * 1000;
    const expiresAt = new Date(Date.now() + ttlMs);
    const { error } = await supabase.from('mcp_oauth_tokens').insert({
        refresh_token: params.refreshToken,
        client_id: params.clientId,
        user_id: params.userId,
        scope: params.scope ?? null,
        resource: params.resource ?? null,
        expires_at: expiresAt.toISOString(),
    });
    if (error)
        throw new Error(`Failed to save refresh token: ${error.message}`);
}
export async function getActiveRefreshToken(refreshToken, supabase = getSupabaseClient()) {
    const { data, error } = await supabase
        .from('mcp_oauth_tokens')
        .select('user_id, client_id, scope, resource')
        .eq('refresh_token', refreshToken)
        .eq('revoked', false)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
    if (error || !data)
        return null;
    return {
        userId: data.user_id,
        clientId: data.client_id,
        scope: data.scope,
        resource: data.resource,
    };
}
export async function revokeRefreshToken(refreshToken) {
    const supabase = getSupabaseClient();
    await supabase
        .from('mcp_oauth_tokens')
        .update({ revoked: true })
        .eq('refresh_token', refreshToken);
}
