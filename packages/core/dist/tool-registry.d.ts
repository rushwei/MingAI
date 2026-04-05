/**
 * 工具注册表
 *
 * 基于 tool contract 模式：每个术数的装配信息由 tool-catalog.ts 集中管理，
 * 本文件只负责将 contract 转换为 ToolRegistryEntry。
 */
import type { RenderOptions } from './tool-contract.js';
import type { ToolDefinition } from './tool-schema.js';
type ToolHandler = (args: unknown) => unknown | Promise<unknown>;
type MarkdownFormatter = (result: unknown, options?: RenderOptions) => string;
type JsonFormatter = (result: unknown, options?: RenderOptions) => unknown;
export interface ToolRegistryEntry {
    definition: ToolDefinition;
    execute: ToolHandler;
    markdownFormatter?: MarkdownFormatter;
    jsonFormatter?: JsonFormatter;
    debugMarkdownFormatter?: MarkdownFormatter;
    debugJsonFormatter?: JsonFormatter;
    /** 运行时扩展合并钩子（来自 tool contract） */
    mergeRuntimeExtras?: (canonicalJSON: unknown, rawResult: unknown) => unknown;
}
export declare const toolRegistry: ToolRegistryEntry[];
export declare const toolRegistryMap: Map<string, ToolRegistryEntry>;
export declare function getToolRegistryEntry(name: string): ToolRegistryEntry | undefined;
export {};
//# sourceMappingURL=tool-registry.d.ts.map