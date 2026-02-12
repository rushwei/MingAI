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

test('user mcp tutorial includes copy buttons for Cherry and Cursor snippets', async () => {
  const source = await readFile(userMcpPagePath, 'utf-8');

  assert.ok(
    source.includes('复制配置'),
    'tutorial should provide copy config buttons'
  );
  assert.ok(
    source.includes('handleCopySnippet'),
    'tutorial should include reusable snippet copy handler'
  );
  assert.ok(
    source.includes("keyData?.key_code || '你的 MCP Key'"),
    'tutorial should use generated key in snippets when available'
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

test('user mcp page should keep copy and regenerate actions side by side', async () => {
  const source = await readFile(userMcpPagePath, 'utf-8');

  assert.match(
    source,
    /<div className="flex flex-wrap items-center gap-2">[\s\S]*复制[\s\S]*重新生成 Key[\s\S]*<\/div>/,
    'copy and regenerate actions should appear in the same action area'
  );
});

test('user mcp page should always display full key without one-time visibility state', async () => {
  const source = await readFile(userMcpPagePath, 'utf-8');

  assert.ok(
    !source.includes('showFullKey'),
    'page should not rely on showFullKey toggle anymore'
  );
  assert.ok(
    !source.includes('maskKey('),
    'page should not mask key display by default'
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
