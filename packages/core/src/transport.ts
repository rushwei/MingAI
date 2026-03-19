import { getToolRegistryEntry, toolRegistry } from './tool-registry.js';
import { renderToolResult } from './tool-output.js';

export type ToolResponseFormat = 'json' | 'markdown';

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

export function buildToolSuccessPayload(
  toolName: string,
  result: unknown,
  responseFormat: ToolResponseFormat = 'json',
) {
  const entry = getToolRegistryEntry(toolName);
  const rendered = renderToolResult(toolName, result, responseFormat);

  if (entry?.definition.outputSchema && typeof result === 'object' && result !== null) {
    return {
      structuredContent: result,
      content: rendered.content,
    };
  }

  return rendered;
}
