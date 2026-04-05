/**
 * MCP 工具定义契约与聚合
 */
import type { DaliurenInput } from '../../daliuren/types.js';
import type { BaziInput, BaziPillarsResolveInput, DayunInput, FortuneInput, LiuyaoInput, QimenInput, TarotInput, ZiweiFlyingStarInput, ZiweiHoroscopeInput, ZiweiInput } from '../../types.js';
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
        allOf?: unknown[];
        anyOf?: unknown[];
        oneOf?: unknown[];
    };
    outputDescription?: string;
    outputSchema?: {
        type: 'object';
        properties: Record<string, unknown>;
    };
    annotations?: ToolAnnotation;
}
export type ToolInput = BaziInput | BaziPillarsResolveInput | ZiweiInput | ZiweiHoroscopeInput | ZiweiFlyingStarInput | LiuyaoInput | TarotInput | FortuneInput | DayunInput | QimenInput | DaliurenInput;
//# sourceMappingURL=tool-types.d.ts.map