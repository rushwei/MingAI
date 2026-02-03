/**
 * MCP Server 中间件
 */
import type { Request, Response, NextFunction } from 'express';
export declare function authMiddleware(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
export declare function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
