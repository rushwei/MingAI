/**
 * Tool contract — 单个工具的统一装配契约
 * 内部统一以 contract 语义表达“定义 + 执行器 + 渲染器 + schema”。
 */
import type { ToolDefinition } from './tool-schema.js';
export type RenderOptions = {
    detailLevel?: 'default' | 'more' | 'full' | 'safe' | 'facts' | 'debug';
};
export interface ToolContract<TInput = unknown, TOutput = unknown> {
    definition: ToolDefinition;
    execute: (input: TInput) => TOutput | Promise<TOutput>;
    renderText: (result: TOutput, options?: RenderOptions) => string;
    renderJSON: (result: TOutput, options?: RenderOptions) => unknown;
    canonicalOutputSchema?: {
        type: 'object';
        properties: Record<string, unknown>;
    };
    debugRenderText?: (result: TOutput, options?: RenderOptions) => string;
    debugRenderJSON?: (result: TOutput, options?: RenderOptions) => unknown;
    mergeRuntimeExtras?: (canonicalJSON: unknown, rawResult: unknown) => unknown;
}
type DetailLevelRenderer<TOutput, TResult> = (result: TOutput, options?: {
    detailLevel?: RenderOptions['detailLevel'];
}) => TResult;
export declare function defineToolContract<TInput, TOutput>(contract: ToolContract<TInput, TOutput>): ToolContract<TInput, TOutput>;
export declare function defineCanonicalToolContract<TInput, TOutput>(contract: Omit<ToolContract<TInput, TOutput>, 'renderText' | 'renderJSON'> & {
    renderText: DetailLevelRenderer<TOutput, string>;
    renderJSON: DetailLevelRenderer<TOutput, unknown>;
}): ToolContract<TInput, TOutput>;
export declare function mergePlaceResolutionInfo(canonicalJSON: unknown, rawResult: unknown): unknown;
export {};
//# sourceMappingURL=tool-contract.d.ts.map