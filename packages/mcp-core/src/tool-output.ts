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

export function hasMarkdownFormatter(toolName: string): boolean {
  return !!getToolRegistryEntry(toolName)?.markdownFormatter;
}

export function formatAsMarkdown(toolName: string, result: unknown): string {
  const formatter = getToolRegistryEntry(toolName)?.markdownFormatter;
  if (!formatter) {
    return stringifyResult(result);
  }

  return formatter(result);
}

export function renderToolResult(
  toolName: string,
  result: unknown,
  responseFormat: 'json' | 'markdown' = 'json',
): RenderedToolResult {
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
