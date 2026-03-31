export type ToolResponseFormat = 'json' | 'markdown';
export declare function buildListToolsPayload(): {
    tools: {
        name: string;
        description: string;
        inputSchema: {
            type: "object";
            properties: Record<string, unknown>;
            required: string[];
            examples?: unknown[];
        };
        outputSchema: {
            type: "object";
            properties: Record<string, unknown>;
        } | undefined;
        annotations: import("./tool-schema.js").ToolAnnotation | undefined;
    }[];
};
export declare function buildToolSuccessPayload(toolName: string, result: unknown, responseFormat?: ToolResponseFormat, options?: {
    detailLevel?: 'default' | 'more' | 'full' | 'safe' | 'facts' | 'debug';
}): import("./tool-output.js").RenderedToolResult;
//# sourceMappingURL=transport.d.ts.map