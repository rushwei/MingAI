/**
 * MCP 工具定义
 */
import type { BaziInput, BaziPillarsResolveInput, ZiweiInput, LiuyaoInput, TarotInput, FortuneInput, DayunInput } from './types.js';
export interface ToolDefinition {
    name: string;
    description: string;
    inputSchema: {
        type: 'object';
        properties: Record<string, unknown>;
        required: string[];
    };
    outputDescription?: string;
    outputSchema?: {
        type: 'object';
        properties: Record<string, unknown>;
    };
}
export declare const tools: ToolDefinition[];
export type ToolInput = BaziInput | BaziPillarsResolveInput | ZiweiInput | LiuyaoInput | TarotInput | FortuneInput | DayunInput;
//# sourceMappingURL=tools.d.ts.map