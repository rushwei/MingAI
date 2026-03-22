import { type ToolDefinition } from './tool-schema.js';
type ToolHandler = (args: unknown) => unknown | Promise<unknown>;
type MarkdownFormatter = (result: unknown) => string;
type JsonFormatter = (result: unknown) => unknown;
export interface ToolRegistryEntry {
    definition: ToolDefinition;
    handler: ToolHandler;
    markdownFormatter?: MarkdownFormatter;
    jsonFormatter?: JsonFormatter;
}
export declare const toolRegistry: ToolRegistryEntry[];
export declare const toolRegistryMap: Map<string, ToolRegistryEntry>;
export declare function getToolRegistryEntry(name: string): ToolRegistryEntry | undefined;
export {};
//# sourceMappingURL=tool-registry.d.ts.map