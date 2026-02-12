import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

function wait(ms) {
  return new Promise((resolveWait) => {
    setTimeout(resolveWait, ms);
  });
}

async function getFreePort() {
  const server = createServer();
  await new Promise((resolveListen, rejectListen) => {
    server.listen(0, '127.0.0.1', (error) => {
      if (error) rejectListen(error);
      else resolveListen();
    });
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    await new Promise((resolveClose) => server.close(() => resolveClose()));
    throw new Error('Failed to allocate free port');
  }
  const port = address.port;
  await new Promise((resolveClose) => server.close(() => resolveClose()));
  return port;
}

async function waitForHealth(port, childProcess) {
  const startedAt = Date.now();
  const timeoutMs = 10_000;

  while (Date.now() - startedAt < timeoutMs) {
    if (childProcess.exitCode !== null) {
      throw new Error(`MCP server exited early with code ${childProcess.exitCode}`);
    }

    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      if (response.ok) return;
    } catch {
      // Server not ready yet.
    }

    await wait(100);
  }

  throw new Error('Timed out waiting for MCP server health endpoint');
}

async function closeServer(server) {
  await new Promise((resolveClose) => server.close(() => resolveClose()));
}

async function stopProcess(childProcess) {
  if (childProcess.exitCode !== null) return;
  childProcess.kill('SIGTERM');
  await Promise.race([
    new Promise((resolveExit) => childProcess.once('exit', () => resolveExit(undefined))),
    wait(3_000),
  ]);
  if (childProcess.exitCode === null) {
    childProcess.kill('SIGKILL');
    await new Promise((resolveExit) => childProcess.once('exit', () => resolveExit(undefined)));
  }
}

test('dist auth middleware should revalidate cached key and reject revoked key immediately', async () => {
  let verifyCalls = 0;

  const fakeSupabase = createServer(async (req, res) => {
    const requestUrl = req.url || '';

    // Consume request stream to keep server behavior deterministic.
    for await (const chunk of req) {
      void chunk;
    }

    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'POST' && requestUrl.startsWith('/rest/v1/rpc/mcp_verify_api_key')) {
      verifyCalls += 1;
      if (verifyCalls === 1) {
        res.writeHead(200);
        res.end(JSON.stringify([{ key_id: 'key-1', user_id: 'user-1' }]));
        return;
      }
      res.writeHead(200);
      res.end(JSON.stringify([]));
      return;
    }

    if (req.method === 'POST' && requestUrl.startsWith('/rest/v1/rpc/mcp_touch_key_last_used')) {
      res.writeHead(200);
      res.end(JSON.stringify(null));
      return;
    }

    if (req.method === 'POST' && requestUrl.startsWith('/auth/v1/token')) {
      res.writeHead(200);
      res.end(JSON.stringify({
        access_token: 'system-admin-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        refresh_token: 'system-admin-refresh-token',
        user: { id: 'system-admin-user' },
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      }));
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ error: 'not found' }));
  });

  const supabasePort = await getFreePort();
  await new Promise((resolveListen, rejectListen) => {
    fakeSupabase.listen(supabasePort, '127.0.0.1', (error) => {
      if (error) rejectListen(error);
      else resolveListen();
    });
  });

  const mcpPort = await getFreePort();
  const mcpCwd = resolve(process.cwd(), 'packages/mcp-server');
  const mcpProcess = spawn(process.execPath, ['dist/index.js'], {
    cwd: mcpCwd,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      PORT: String(mcpPort),
      MCP_HOST: '127.0.0.1',
      SUPABASE_URL: `http://127.0.0.1:${supabasePort}`,
      SUPABASE_ANON_KEY: 'test-anon-key',
      SUPABASE_SYSTEM_ADMIN_EMAIL: 'admin@example.com',
      SUPABASE_SYSTEM_ADMIN_PASSWORD: 'admin-password',
      MCP_ALLOWED_HOSTS: `127.0.0.1:${mcpPort}`,
    },
    stdio: ['ignore', 'ignore', 'pipe'],
  });

  let stderr = '';
  mcpProcess.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  try {
    await waitForHealth(mcpPort, mcpProcess);

    const requestUrl = `http://127.0.0.1:${mcpPort}/mcp`;
    const headers = {
      'x-api-key': 'sk-mcp-mingai-test-key',
      'content-type': 'application/json',
      accept: 'application/json, text/event-stream',
    };

    const firstResponse = await fetch(requestUrl, {
      method: 'POST',
      headers,
      body: '{}',
    });

    assert.equal(
      firstResponse.status,
      400,
      'first request should pass auth and fail later with initialize validation error'
    );

    const secondResponse = await fetch(requestUrl, {
      method: 'POST',
      headers,
      body: '{}',
    });

    assert.equal(
      secondResponse.status,
      401,
      `second request should be rejected after backend revocation; stderr: ${stderr}`
    );
    assert.ok(verifyCalls >= 2, 'cached key path should still revalidate via RPC');
  } finally {
    await stopProcess(mcpProcess);
    await closeServer(fakeSupabase);
  }
});
