/**
 * MCP 工具定义
 */
import type { BaziInput, BaziPillarsResolveInput, ZiweiInput, ZiweiHoroscopeInput, ZiweiFlyingStarInput, LiuyaoInput, TarotInput, FortuneInput, DayunInput, QimenInput } from './types.js';
import type { DaliurenInput } from './daliuren/types.js';
export interface ToolAnnotation {
    readOnlyHint?: boolean;
    destructiveHint?: boolean;
    idempotentHint?: boolean;
    openWorldHint?: boolean;
}
export interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: {
        type: 'object';
        properties: Record<string, unknown>;
        required: string[];
        examples?: unknown[];
    };
    outputDescription?: string;
    outputSchema?: {
        type: 'object';
        properties: Record<string, unknown>;
    };
    annotations?: ToolAnnotation;
}
export declare const toolDefinitions: ToolDefinition[];
export type ToolInput = BaziInput | BaziPillarsResolveInput | ZiweiInput | ZiweiHoroscopeInput | ZiweiFlyingStarInput | LiuyaoInput | TarotInput | FortuneInput | DayunInput | QimenInput | DaliurenInput;
//# sourceMappingURL=tool-schema.d.ts.map