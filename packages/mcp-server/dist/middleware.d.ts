/**
 * MCP Server 中间件
 *
 * 挂载顺序：
 * express.json({ limit: '1mb' })
 *   → originValidationMiddleware
 *   → authMiddleware（per-user key 验证）
 *   → rateLimitMiddleware（userId 复合键）
 *   → sseConnectionLimitMiddleware（仅 GET）
 */
import type { Request, Response, NextFunction } from 'express';
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
export declare function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<Response<any, Record<string, any>> | undefined>;
export declare function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
export declare function sseConnectionLimitMiddleware(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
