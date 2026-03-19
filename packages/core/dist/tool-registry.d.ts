import { type ToolDefinition } from './tool-schema.js';
type ToolHandler = (args: unknown) => unknown | Promise<unknown>;
type MarkdownFormatter = (result: unknown) => string;
export interface ToolRegistryEntry {
    definition: ToolDefinition;
    handler: ToolHandler;
    markdownFormatter?: MarkdownFormatter;
}
export declare const toolRegistry: ToolRegistryEntry[];
export declare const toolRegistryMap: Map<string, ToolRegistryEntry>;
export declare function getToolRegistryEntry(name: string): ToolRegistryEntry | undefined;
export {};
//# sourceMappingURL=tool-registry.d.ts.map