const OAUTH_DEBUG_ENABLED = process.env.MCP_OAUTH_DEBUG === 'true';
export function isOAuthDebugEnabled() {
    return OAUTH_DEBUG_ENABLED;
}
export function oauthDebug(message) {
    if (OAUTH_DEBUG_ENABLED) {
        console.log(`[OAuth] ${message}`);
    }
}
export function oauthWarn(message) {
    console.warn(`[OAuth] ${message}`);
}
export function oauthError(message, error) {
    if (error instanceof Error) {
        console.error(`[OAuth] ${message}: ${error.message}`);
        return;
    }
    if (typeof error === 'string') {
        console.error(`[OAuth] ${message}: ${error}`);
        return;
    }
    console.error(`[OAuth] ${message}`);
}
