import type { RenderOptions } from './tool-contract.js';
import { renderToolResult } from './tool-output.js';
import { toolRegistry } from './tool-registry.js';

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
  options?: RenderOptions,
) {
  const rendered = renderToolResult(toolName, result, responseFormat, options);

  if (rendered.structuredContent !== undefined) {
    return {
      structuredContent: rendered.structuredContent,
      content: rendered.content,
    };
  }

  return rendered;
}
