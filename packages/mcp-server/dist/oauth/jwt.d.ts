/**
 * MCP OAuth JWT 签发与验证
 *
 * 使用 jose 库 + HS256 对称签名
 */
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';
export declare function getAllowedTokenAudiences(issuerInput?: string | URL): string[];
declare function getRefreshTokenTTL(): number;
export declare function signAccessToken(userId: string, clientId: string, scope: string, resource?: string): Promise<{
    token: string;
    expiresIn: number;
}>;
export declare function verifyAccessToken(token: string): Promise<AuthInfo>;
export declare function generateRefreshToken(): string;
export { getRefreshTokenTTL };
