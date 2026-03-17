export type ToolContentItem = {
    type: 'text';
    text: string;
};
export type RenderedToolResult = {
    content: ToolContentItem[];
    structuredContent?: unknown;
};
export declare function hasMarkdownFormatter(toolName: string): boolean;
export declare function formatAsMarkdown(toolName: string, result: unknown): string;
export declare function renderToolResult(toolName: string, result: unknown, responseFormat?: 'json' | 'markdown'): RenderedToolResult;
//# sourceMappingURL=tool-output.d.ts.map