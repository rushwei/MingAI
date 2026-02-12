/**
 * MCP OAuth 授权页面 HTML 模板
 */

export function renderAuthorizePage(params: {
  clientName?: string;
  scopes: string[];
  error?: string;
  // 隐藏字段（回传给 POST /oauth/login）
  clientId: string;
  redirectUri: string;
  codeChallenge: string;
  codeChallengeMethod: string;
  state?: string;
  scope?: string;
  resource?: string;
}): string {
  const displayName = params.clientName || params.clientId;
  const scopeDesc = params.scopes.length > 0
    ? params.scopes.map((s) => `<li>${escapeHtml(s)}</li>`).join('')
    : '<li>mcp:tools（命理工具访问）</li>';

  const errorBlock = params.error
    ? `<div class="error">${escapeHtml(params.error)}</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>授权 - MingAI MCP</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0a0a0a; color: #e5e5e5;
      min-height: 100vh; display: flex; align-items: center; justify-content: center;
      padding: 1rem;
    }
    .card {
      background: #171717; border: 1px solid #262626; border-radius: 1rem;
      padding: 2rem; width: 100%; max-width: 400px;
    }
    .brand { text-align: center; margin-bottom: 1.5rem; }
    .brand h1 { font-size: 1.25rem; font-weight: 600; }
    .brand p { color: #a3a3a3; font-size: 0.875rem; margin-top: 0.5rem; }
    .client-info {
      background: #1a1a2e; border: 1px solid #262650; border-radius: 0.75rem;
      padding: 1rem; margin-bottom: 1.5rem; text-align: center;
    }
    .client-info .name { font-weight: 600; color: #c4b5fd; }
    .scopes { font-size: 0.8rem; color: #a3a3a3; margin-top: 0.5rem; }
    .scopes ul { list-style: none; padding: 0; }
    .scopes li::before { content: "✓ "; color: #4ade80; }
    .error {
      background: #2d1b1b; border: 1px solid #7f1d1d; border-radius: 0.5rem;
      padding: 0.75rem; margin-bottom: 1rem; color: #fca5a5; font-size: 0.875rem;
    }
    label { display: block; font-size: 0.875rem; color: #a3a3a3; margin-bottom: 0.25rem; }
    input[type="email"], input[type="password"] {
      width: 100%; padding: 0.625rem 0.75rem; border-radius: 0.5rem;
      border: 1px solid #333; background: #0a0a0a; color: #e5e5e5;
      font-size: 0.9rem; margin-bottom: 1rem; outline: none;
    }
    input:focus { border-color: #7c3aed; }
    .actions { display: flex; gap: 0.75rem; margin-top: 0.5rem; }
    .btn {
      flex: 1; padding: 0.625rem; border-radius: 0.5rem; border: none;
      font-size: 0.9rem; font-weight: 500; cursor: pointer; transition: opacity 0.15s;
    }
    .btn:hover { opacity: 0.85; }
    .btn-primary { background: #7c3aed; color: white; }
    .btn-secondary { background: #262626; color: #a3a3a3; border: 1px solid #333; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">
      <h1>MingAI MCP</h1>
      <p>授权第三方应用访问命理工具</p>
    </div>

    <div class="client-info">
      <span class="name">${escapeHtml(displayName)}</span> 请求访问你的 MingAI 账户
      <div class="scopes"><ul>${scopeDesc}</ul></div>
    </div>

    ${errorBlock}

    <form method="POST" action="/oauth/login">
      <input type="hidden" name="client_id" value="${escapeAttr(params.clientId)}" />
      <input type="hidden" name="redirect_uri" value="${escapeAttr(params.redirectUri)}" />
      <input type="hidden" name="code_challenge" value="${escapeAttr(params.codeChallenge)}" />
      <input type="hidden" name="code_challenge_method" value="${escapeAttr(params.codeChallengeMethod)}" />
      ${params.state ? `<input type="hidden" name="state" value="${escapeAttr(params.state)}" />` : ''}
      ${params.scope ? `<input type="hidden" name="scope" value="${escapeAttr(params.scope)}" />` : ''}
      ${params.resource ? `<input type="hidden" name="resource" value="${escapeAttr(params.resource)}" />` : ''}

      <label for="email">邮箱</label>
      <input type="email" id="email" name="email" required autocomplete="email" placeholder="your@email.com" />

      <label for="password">密码</label>
      <input type="password" id="password" name="password" required autocomplete="current-password" placeholder="••••••••" />

      <div class="actions">
        <button type="button" class="btn btn-secondary" onclick="window.close()">拒绝</button>
        <button type="submit" class="btn btn-primary">授权</button>
      </div>
    </form>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
}
