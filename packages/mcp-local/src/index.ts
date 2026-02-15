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
  formatAsMarkdown,
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
    annotations: t.annotations,
  })),
}));

// 调用工具
server.server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = await handleToolCall(name, args || {});

    const tool = tools.find((t) => t.name === name);

    // 始终返回 structuredContent（JSON 对象），除非结果是错误
    const hasStructuredContent = typeof result === 'object' && result !== null;

    // content 格式：根据 responseFormat 决定
    let humanReadableText: string;
    if (hasStructuredContent && args?.responseFormat === 'markdown') {
      // 要求 markdown 格式
      humanReadableText = formatAsMarkdown(name, result);
    } else {
      // 默认 JSON 格式
      humanReadableText = hasStructuredContent
        ? JSON.stringify(result, null, 2)
        : String(result);
    }

    const humanReadableContent = [{ type: 'text', text: humanReadableText }];

    // 始终返回 structuredContent（给 AI 用）+ content（给人看）
    if (tool?.outputSchema && hasStructuredContent) {
      return {
        structuredContent: result,
        content: humanReadableContent,
      };
    }
    return { content: humanReadableContent };
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
