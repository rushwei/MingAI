#!/usr/bin/env node
/**
 * MingAI MCP Server - Local (stdio)
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import {
  tools,
  handleToolCall,
} from '@mingai/mcp-core';

// 创建服务器
const server = new McpServer(
  { name: 'mingai-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// 列出工具
server.server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
    outputSchema: t.outputSchema,
  })),
}));

// 调用工具
server.server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = await handleToolCall(name, args || {});
    const humanReadableText =
      typeof result === 'string'
        ? result
        : JSON.stringify(result, null, 2) ?? String(result);
    const humanReadableContent = [{ type: 'text', text: humanReadableText }];
    // 检查工具是否定义了 outputSchema
    const tool = tools.find((t) => t.name === name);
    if (tool?.outputSchema) {
      // 有 outputSchema 时同时返回 structuredContent + 可读 content
      return {
        structuredContent: result,
        content: humanReadableContent,
      };
    }
    // 无 outputSchema 时返回 text content
    return {
      content: humanReadableContent,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: 'text', text: `Error: ${message}` }],
      isError: true,
    };
  }
});

// 启动服务器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
