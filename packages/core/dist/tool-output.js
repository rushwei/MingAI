import { getToolRegistryEntry } from './tool-registry.js';
function stringifyResult(result) {
    return typeof result === 'object' && result !== null
        ? JSON.stringify(result, null, 2)
        : String(result);
}
export function renderToolResult(toolName, result, responseFormat = 'json') {
    const entry = getToolRegistryEntry(toolName);
    const canonicalJSON = entry?.jsonFormatter
        ? entry.jsonFormatter(result)
        : undefined;
    const structuredContent = typeof result === 'object' && result !== null && !!entry?.definition.outputSchema
        ? result
        : (typeof canonicalJSON === 'object' && canonicalJSON !== null ? canonicalJSON : undefined);
    if (responseFormat === 'markdown' && entry?.markdownFormatter) {
        return {
            content: [{ type: 'text', text: entry.markdownFormatter(result) }],
            structuredContent,
        };
    }
    if (canonicalJSON !== undefined) {
        return {
            content: [{ type: 'text', text: JSON.stringify(canonicalJSON, null, 2) }],
            structuredContent,
        };
    }
    return {
        content: [{ type: 'text', text: stringifyResult(result) }],
        structuredContent,
    };
}
