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

export function renderToolResult(
  toolName: string,
  result: unknown,
  responseFormat: 'json' | 'markdown' = 'json',
): RenderedToolResult {
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
