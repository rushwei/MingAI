import { getToolRegistryEntry } from './tool-registry.js';
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

function stringifyResult(result: unknown): string {
  return typeof result === 'object' && result !== null
    ? JSON.stringify(result, null, 2)
    : String(result);
}

export function renderToolResult(
  toolName: string,
  result: unknown,
  responseFormat: 'json' | 'markdown' = 'json',
  options?: RenderToolOptions,
): RenderedToolResult {
  const entry = getToolRegistryEntry(toolName);
  const canonicalJSON = entry?.jsonFormatter
    ? entry.jsonFormatter(result, options)
    : undefined;

  // 运行时扩展：通过 manifest 钩子合并（替代原先的 placeResolutionInfo 硬编码）
  let structuredContent = canonicalJSON !== undefined
    ? (entry?.mergeRuntimeExtras
      ? entry.mergeRuntimeExtras(canonicalJSON, result)
      : canonicalJSON)
    : (typeof result === 'object' && result !== null && !!entry?.definition.outputSchema ? result : undefined);

  const textContent = entry?.markdownFormatter
    ? entry.markdownFormatter(result, options)
    : stringifyResult(result);

  if (options?.detailLevel === 'debug' && structuredContent && entry?.debugJsonFormatter) {
    const rawCanonical = entry.debugJsonFormatter(result, options);
    const rawText = entry.debugMarkdownFormatter?.(result, options);
    structuredContent = {
      ...(typeof structuredContent === 'object' && structuredContent !== null ? structuredContent as Record<string, unknown> : { value: structuredContent }),
      debug: {
        rawCanonical,
        ...(rawText ? { rawText } : {}),
      },
    };
  }

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
