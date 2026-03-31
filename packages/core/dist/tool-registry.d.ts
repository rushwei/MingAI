import { type ToolDefinition } from './tool-schema.js';
type ToolHandler = (args: unknown) => unknown | Promise<unknown>;
type RenderOptions = {
    detailLevel?: 'default' | 'more' | 'full' | 'safe' | 'facts' | 'debug';
};
type MarkdownFormatter = (result: unknown, options?: RenderOptions) => string;
type JsonFormatter = (result: unknown, options?: RenderOptions) => unknown;
export interface ToolRegistryEntry {
    definition: ToolDefinition;
    handler: ToolHandler;
    markdownFormatter?: MarkdownFormatter;
    jsonFormatter?: JsonFormatter;
    debugMarkdownFormatter?: MarkdownFormatter;
    debugJsonFormatter?: JsonFormatter;
}
export declare const toolRegistry: ToolRegistryEntry[];
export declare const toolRegistryMap: Map<string, ToolRegistryEntry>;
export declare function getToolRegistryEntry(name: string): ToolRegistryEntry | undefined;
export {};
//# sourceMappingURL=tool-registry.d.ts.map