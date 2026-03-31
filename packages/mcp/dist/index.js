#!/usr/bin/env node
/**
 * MingAI MCP Server - Local (stdio)
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { handleToolCall, } from '@mingai/core';
import { buildListToolsPayload, buildToolSuccessPayload, } from '@mingai/core/transport';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { version } = require('../package.json');
// 创建服务器
const server = new McpServer({ name: 'mingai-mcp', version }, { capabilities: { tools: {} } });
// 列出工具
server.server.setRequestHandler(ListToolsRequestSchema, async () => buildListToolsPayload());
// 调用工具
server.server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        const result = await handleToolCall(name, args || {});
        const responseFormat = args?.responseFormat === 'markdown' ? 'markdown' : 'json';
        const detailLevel = args?.detailLevel === 'full'
            ? 'full'
            : args?.detailLevel === 'more' || args?.detailLevel === 'facts'
                ? 'more'
                : args?.detailLevel === 'debug'
                    ? 'full'
                    : 'default';
        return buildToolSuccessPayload(name, result, responseFormat, { detailLevel });
    }
    catch (error) {
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
