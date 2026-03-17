#!/usr/bin/env node
/**
 * MingAI MCP Server - Local (stdio)
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema, } from '@modelcontextprotocol/sdk/types.js';
import { tools, handleToolCall, renderToolResult, } from '@mingai/mcp-core';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { version } = require('../package.json');
// 创建服务器
const server = new McpServer({ name: 'mingai-mcp', version }, { capabilities: { tools: {} } });
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
        const responseFormat = args?.responseFormat === 'markdown' ? 'markdown' : 'json';
        const rendered = renderToolResult(name, result, responseFormat);
        const humanReadableContent = rendered.content;
        // 始终返回 structuredContent（给 AI 用）+ content（给人看）
        if (tool?.outputSchema && typeof result === 'object' && result !== null) {
            return {
                structuredContent: result,
                content: humanReadableContent,
            };
        }
        return rendered;
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
