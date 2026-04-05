/**
 * 工具注册表
 *
 * 基于 tool contract 模式：每个术数的装配信息由 tool-catalog.ts 集中管理，
 * 本文件只负责将 contract 转换为 ToolRegistryEntry。
 */

import { toolCatalog } from './tool-catalog.js';
import type { RenderOptions, ToolContract } from './tool-contract.js';
import type { ToolDefinition } from './tool-schema.js';

type ToolHandler = (args: unknown) => unknown | Promise<unknown>;
type MarkdownFormatter = (result: unknown, options?: RenderOptions) => string;
type JsonFormatter = (result: unknown, options?: RenderOptions) => unknown;

export interface ToolRegistryEntry {
  definition: ToolDefinition;
  execute: ToolHandler;
  markdownFormatter?: MarkdownFormatter;
  jsonFormatter?: JsonFormatter;
  debugMarkdownFormatter?: MarkdownFormatter;
  debugJsonFormatter?: JsonFormatter;
  /** 运行时扩展合并钩子（来自 tool contract） */
  mergeRuntimeExtras?: (canonicalJSON: unknown, rawResult: unknown) => unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toolContractToRegistryEntry(contract: ToolContract<any, any>): ToolRegistryEntry {
  const definition = contract.canonicalOutputSchema
    ? { ...contract.definition, outputSchema: contract.canonicalOutputSchema }
    : contract.definition;

  return {
    definition,
    execute: contract.execute as ToolHandler,
    markdownFormatter: contract.renderText as MarkdownFormatter,
    jsonFormatter: contract.renderJSON as JsonFormatter,
    debugMarkdownFormatter: contract.debugRenderText as MarkdownFormatter | undefined,
    debugJsonFormatter: contract.debugRenderJSON as JsonFormatter | undefined,
    mergeRuntimeExtras: contract.mergeRuntimeExtras,
  };
}

export const toolRegistry: ToolRegistryEntry[] = toolCatalog.map(toolContractToRegistryEntry);

export const toolRegistryMap = new Map(toolRegistry.map((entry) => [entry.definition.name, entry] as const));

export function getToolRegistryEntry(name: string): ToolRegistryEntry | undefined {
  return toolRegistryMap.get(name);
}
