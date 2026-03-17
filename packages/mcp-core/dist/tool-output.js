import { getToolRegistryEntry } from './tool-registry.js';
function stringifyResult(result) {
    return typeof result === 'object' && result !== null
        ? JSON.stringify(result, null, 2)
        : String(result);
}
export function hasMarkdownFormatter(toolName) {
    return !!getToolRegistryEntry(toolName)?.markdownFormatter;
}
export function formatAsMarkdown(toolName, result) {
    const formatter = getToolRegistryEntry(toolName)?.markdownFormatter;
    if (!formatter) {
        return stringifyResult(result);
    }
    return formatter(result);
}
export function renderToolResult(toolName, result, responseFormat = 'json') {
    const entry = getToolRegistryEntry(toolName);
    const hasStructuredContent = typeof result === 'object' && result !== null && !!entry?.definition.outputSchema;
    const text = responseFormat === 'markdown' && entry?.markdownFormatter
        ? entry.markdownFormatter(result)
        : stringifyResult(result);
    return {
        content: [{ type: 'text', text }],
        structuredContent: hasStructuredContent ? result : undefined,
    };
}
