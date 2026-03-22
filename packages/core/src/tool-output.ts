import { getToolRegistryEntry } from './tool-registry.js';

export type ToolContentItem = {
  type: 'text';
  text: string;
};

export type RenderedToolResult = {
  content: ToolContentItem[];
  structuredContent?: unknown;
};

function stringifyResult(result: unknown): string {
  return typeof result === 'object' && result !== null
    ? JSON.stringify(result, null, 2)
    : String(result);
}

function attachStructuredRuntimeExtras(canonicalJSON: unknown, result: unknown): unknown {
  if (typeof canonicalJSON !== 'object' || canonicalJSON === null) return canonicalJSON;
  if (typeof result !== 'object' || result === null) return canonicalJSON;
  if (!('placeResolutionInfo' in result)) return canonicalJSON;

  return {
    ...canonicalJSON,
    placeResolutionInfo: (result as { placeResolutionInfo?: unknown }).placeResolutionInfo,
  };
}

export function renderToolResult(
  toolName: string,
  result: unknown,
  responseFormat: 'json' | 'markdown' = 'json',
): RenderedToolResult {
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
