/**
 * MCP Server 中间件
 *
 * 挂载顺序：
 * express.json({ limit: '1mb' })
 *   → originValidationMiddleware
 *   → dualAuthMiddleware（OAuth JWT 优先，API Key fallback）
 *   → rateLimitMiddleware（userId 复合键）
 *   → sseConnectionLimitMiddleware（仅 GET）
 */
import type { Request, Response, NextFunction } from 'express';
import type { OAuthTokenVerifier } from '@modelcontextprotocol/sdk/server/auth/provider.js';
export interface McpAuthInfo {
    userId: string;
    keyId: string;
}
declare global {
    namespace Express {
        interface Request {
            mcpAuth?: McpAuthInfo;
        }
    }
}
export declare function originValidationMiddleware(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
export declare function hostValidationMiddleware(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
export declare function readPositiveIntEnv(name: string, fallback: number): number;
export declare function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
export declare function sseConnectionLimitMiddleware(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
export declare function oauthRateLimitMiddleware(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
export declare function dualAuthMiddleware(verifier: OAuthTokenVerifier): (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
