/**
 * MCP OAuth 授权页面 HTML 模板
 */
export declare function renderAuthorizePage(params: {
    clientName?: string;
    scopes: string[];
    error?: string;
    clientId: string;
    redirectUri: string;
    codeChallenge: string;
    codeChallengeMethod: string;
    state?: string;
    scope?: string;
    resource?: string;
}): string;
