#!/usr/bin/env node
/**
 * MingAI MCP Server - Local (stdio)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import {
  tools,
  handleBaziCalculate,
  handleZiweiCalculate,
  handleLiuyaoAnalyze,
  handleTarotDraw,
  handleDailyFortune,
  handleLiunianAnalyze,
} from '@mingai/mcp-core';

// 工具调用处理
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function handleToolCall(name: string, args: any): Promise<unknown> {
  switch (name) {
    case 'bazi_calculate':
      return handleBaziCalculate(args);
    case 'ziwei_calculate':
      return handleZiweiCalculate(args);
    case 'liuyao_analyze':
      return handleLiuyaoAnalyze(args);
    case 'tarot_draw':
      return handleTarotDraw(args);
    case 'daily_fortune':
      return handleDailyFortune(args);
    case 'liunian_analyze':
      return handleLiunianAnalyze(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// 创建服务器
const server = new Server(
  { name: 'mingai-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// 列出工具
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: t.inputSchema,
    outputSchema: t.outputSchema,
  })),
}));

// 调用工具
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const result = await handleToolCall(name, args || {});
    // 检查工具是否定义了 outputSchema
    const tool = tools.find((t) => t.name === name);
    if (tool?.outputSchema) {
      // 有 outputSchema 时返回 structuredContent
      return { structuredContent: result };
    }
    // 无 outputSchema 时返回 text content
    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
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
