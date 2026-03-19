/**
 * MCP 工具定义
 */

import { toolRegistry } from './tool-registry.js';

export type {
  ToolAnnotation,
  ToolDefinition,
  ToolInput,
} from './tool-schema.js';

export const tools = toolRegistry.map((entry) => entry.definition);
