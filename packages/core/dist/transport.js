import { toolRegistry } from './tool-registry.js';
import { renderToolResult } from './tool-output.js';
export function buildListToolsPayload() {
    return {
        tools: toolRegistry.map(({ definition }) => ({
            name: definition.name,
            description: definition.description,
            inputSchema: definition.inputSchema,
            outputSchema: definition.outputSchema,
            annotations: definition.annotations,
        })),
    };
}
export function buildToolSuccessPayload(toolName, result, responseFormat = 'json', options) {
    const rendered = renderToolResult(toolName, result, responseFormat, options);
    if (rendered.structuredContent !== undefined) {
        return {
            structuredContent: rendered.structuredContent,
            content: rendered.content,
        };
    }
    return rendered;
}
