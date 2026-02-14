import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { access } from 'node:fs/promises';

const adminMcpPagePath = resolve(process.cwd(), 'src/app/admin/mcp/page.tsx');
const adminMcpPanelPath = resolve(process.cwd(), 'src/components/admin/McpKeyManagementPanel.tsx');
const accessLogPanelPath = resolve(process.cwd(), 'src/components/admin/McpAccessLogPanel.tsx');
const mcpLogsRoutePath = resolve(process.cwd(), 'src/app/api/admin/mcp-logs/route.ts');
const userMcpPagePath = resolve(process.cwd(), 'src/app/user/mcp/page.tsx');

test('admin mcp page should only keep key management tab', async () => {
  const source = await readFile(adminMcpPagePath, 'utf-8');

  assert.ok(
    source.includes("'keys'"),
    'admin mcp page should keep keys tab'
  );
  assert.ok(
    !source.includes("'logs'"),
    'admin mcp page should remove logs tab'
  );
  assert.ok(
    !source.includes('McpAccessLogPanel'),
    'admin mcp page should not import log panel'
  );
});

test('admin mcp logs API and panel files should be removed', async () => {
  await assert.rejects(
    access(accessLogPanelPath),
    /ENOENT/,
    'McpAccessLogPanel file should be removed'
  );
  await assert.rejects(
    access(mcpLogsRoutePath),
    /ENOENT/,
    'mcp-logs API route should be removed'
  );
});

test('user mcp page includes copy buttons for Cherry and IDE snippets', async () => {
  const source = await readFile(userMcpPagePath, 'utf-8');

  assert.ok(
    source.includes("handleCopySnippet('cherry', cherryConfig)"),
    'page should provide cherry snippet copy action'
  );
  assert.ok(
    source.includes("handleCopySnippet('ide', ideConfig)"),
    'page should provide ide snippet copy action'
  );
  assert.ok(
    source.includes('handleCopySnippet'),
    'page should include reusable snippet copy handler'
  );
  assert.ok(
    source.includes("keyData?.key_code || '你的 MCP Key'"),
    'snippets should use generated key when available'
  );
});

test('user mcp page should render key data in a table-like layout', async () => {
  const source = await readFile(userMcpPagePath, 'utf-8');

  assert.ok(
    source.includes('<table'),
    'user mcp page should use table layout for key metadata'
  );
  assert.ok(
    source.includes('状态') && source.includes('上次使用') && source.includes('创建时间'),
    'table should include core key fields'
  );
});

test('user mcp page should keep copy and reset actions side by side in action column', async () => {
  const source = await readFile(userMcpPagePath, 'utf-8');

  assert.match(
    source,
    /<div className="flex gap-1">[\s\S]*title="复制"[\s\S]*title="重置"[\s\S]*<\/div>/,
    'copy and reset actions should appear in the same action area'
  );
});

test('user mcp page should mask key by default and support visibility toggle', async () => {
  const source = await readFile(userMcpPagePath, 'utf-8');

  assert.ok(
    source.includes('maskKey('),
    'page should provide key masking helper'
  );
  assert.ok(
    source.includes('showKey ? keyData.key_code : maskKey(keyData.key_code)'),
    'page should support toggling between masked and full key'
  );
  assert.ok(
    source.includes("{showKey ? '隐藏' : '显示'}"),
    'page should render visibility toggle labels'
  );
});

test('admin mcp panel should provide unban action for banned keys', async () => {
  const source = await readFile(adminMcpPanelPath, 'utf-8');

  assert.ok(
    source.includes('解除封禁'),
    'admin panel should render unban action for banned keys'
  );
  assert.ok(
    source.includes("method: 'PATCH'"),
    'admin panel should call PATCH route when unbanning a user key'
  );
});
