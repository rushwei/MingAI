import { getToolRegistryEntry } from './tool-registry.js';
function stringifyResult(result) {
    return typeof result === 'object' && result !== null
        ? JSON.stringify(result, null, 2)
        : String(result);
}
function attachStructuredRuntimeExtras(canonicalJSON, result) {
    if (typeof canonicalJSON !== 'object' || canonicalJSON === null)
        return canonicalJSON;
    if (typeof result !== 'object' || result === null)
        return canonicalJSON;
    if (!('placeResolutionInfo' in result))
        return canonicalJSON;
    return {
        ...canonicalJSON,
        placeResolutionInfo: result.placeResolutionInfo,
    };
}
export function renderToolResult(toolName, result, responseFormat = 'json') {
    const entry = getToolRegistryEntry(toolName);
    const canonicalJSON = entry?.jsonFormatter
        ? entry.jsonFormatter(result)
        : undefined;
    const structuredContent = canonicalJSON !== undefined
        ? attachStructuredRuntimeExtras(canonicalJSON, result)
        : (typeof result === 'object' && result !== null && !!entry?.definition.outputSchema ? result : undefined);
    const textContent = entry?.markdownFormatter
        ? entry.markdownFormatter(result)
        : stringifyResult(result);
    if (responseFormat === 'markdown' && entry?.markdownFormatter) {
        return {
            content: [{ type: 'text', text: textContent }],
            structuredContent,
        };
    }
    if (canonicalJSON !== undefined) {
        return {
            content: [{ type: 'text', text: textContent }],
            structuredContent,
        };
    }
    return {
        content: [{ type: 'text', text: stringifyResult(result) }],
        structuredContent,
    };
}
