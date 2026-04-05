import type { RenderOptions } from './tool-contract.js';
export type ToolContentItem = {
    type: 'text';
    text: string;
};
export type RenderedToolResult = {
    content: ToolContentItem[];
    structuredContent?: unknown;
};
export type RenderToolOptions = RenderOptions;
export declare function renderToolResult(toolName: string, result: unknown, responseFormat?: 'json' | 'markdown', options?: RenderToolOptions): RenderedToolResult;
//# sourceMappingURL=tool-output.d.ts.map