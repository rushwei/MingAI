import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const distRoot = resolve(process.cwd(), 'packages/mcp-server/dist');

function moduleUrl(relativePath) {
  const url = pathToFileURL(resolve(distRoot, relativePath));
  url.searchParams.set('t', `${Date.now()}-${Math.random()}`);
  return url.href;
}

async function importDist(relativePath) {
  return import(moduleUrl(relativePath));
}

test('renderAuthorizePage should include OAuth hidden fields and credential inputs', async () => {
  const { renderAuthorizePage } = await importDist('oauth/authorize-page.js');

  const html = renderAuthorizePage({
    clientName: 'ChatGPT',
    scopes: ['mcp:tools'],
    clientId: 'client-1',
    redirectUri: 'https://chat.openai.com/aip/mcp/callback',
    codeChallenge: 'challenge-1',
    codeChallengeMethod: 'S256',
    state: 'state-1',
    scope: 'mcp:tools',
    resource: 'https://mcp.mingai.fun/mcp',
  });

  assert.ok(html.includes('method="POST" action="/oauth/login"'));
  assert.ok(html.includes('name="client_id"'));
  assert.ok(html.includes('name="redirect_uri"'));
  assert.ok(html.includes('name="code_challenge"'));
  assert.ok(html.includes('name="code_challenge_method"'));
  assert.ok(html.includes('name="email"'));
  assert.ok(html.includes('name="password"'));
});

test('renderAuthorizePage should escape client and error text to prevent XSS', async () => {
  const { renderAuthorizePage } = await importDist('oauth/authorize-page.js');

  const html = renderAuthorizePage({
    clientName: '<script>alert(1)</script>',
    scopes: ['<img src=x onerror=alert(2)>'],
    error: '<b>wrong</b>',
    clientId: 'client-1',
    redirectUri: 'https://chat.openai.com/aip/mcp/callback',
    codeChallenge: 'challenge-1',
    codeChallengeMethod: 'S256',
  });

  assert.ok(html.includes('&lt;script&gt;alert(1)&lt;/script&gt;'));
  assert.ok(html.includes('&lt;img src=x onerror=alert(2)&gt;'));
  assert.ok(html.includes('&lt;b&gt;wrong&lt;/b&gt;'));
  assert.equal(html.includes('<script>alert(1)</script>'), false);
});

test('renderAuthorizePage should render default scope description when scopes are empty', async () => {
  const { renderAuthorizePage } = await importDist('oauth/authorize-page.js');

  const html = renderAuthorizePage({
    scopes: [],
    clientId: 'client-1',
    redirectUri: 'https://chat.openai.com/aip/mcp/callback',
    codeChallenge: 'challenge-1',
    codeChallengeMethod: 'S256',
  });

  assert.ok(html.includes('mcp:tools'));
});
