function normalizeUrl(input) {
    if (!input)
        return null;
    try {
        return new URL(input).href;
    }
    catch {
        return null;
    }
}
function parseScopes(raw, fallback) {
    const base = raw?.trim()
        ? raw.trim().split(/\s+/)
        : fallback;
    const deduped = new Set();
    for (const scope of base) {
        const s = scope.trim();
        if (!s)
            continue;
        deduped.add(s);
    }
    return [...deduped];
}
function normalizeAudiences(values) {
    const normalized = new Set();
    for (const value of values) {
        const uri = normalizeUrl(value);
        if (uri)
            normalized.add(uri);
    }
    return normalized;
}
export function validateOAuthLoginRequest(input) {
    const redirectUri = normalizeUrl(input.redirectUri);
    if (!redirectUri) {
        return { ok: false, error: 'Invalid redirect_uri' };
    }
    const registeredRedirects = new Set((input.client.redirect_uris ?? [])
        .map((uri) => normalizeUrl(uri))
        .filter((uri) => Boolean(uri)));
    if (!registeredRedirects.has(redirectUri)) {
        return { ok: false, error: 'Invalid redirect_uri' };
    }
    const requestedScopes = parseScopes(input.scope, ['mcp:tools']);
    const allowedScopes = parseScopes(input.client.scope ?? undefined, ['mcp:tools']);
    if (requestedScopes.some((scope) => !allowedScopes.includes(scope))) {
        return { ok: false, error: 'Invalid scope' };
    }
    let normalizedResource;
    if (input.resource) {
        normalizedResource = normalizeUrl(input.resource) ?? undefined;
        if (!normalizedResource) {
            return { ok: false, error: 'Invalid resource' };
        }
        const allowedAudiences = normalizeAudiences(input.allowedAudiences);
        if (allowedAudiences.size === 0) {
            const fallback = normalizeUrl(input.issuerUrl.href);
            if (fallback)
                allowedAudiences.add(fallback);
        }
        if (!allowedAudiences.has(normalizedResource)) {
            return { ok: false, error: 'Invalid resource' };
        }
    }
    return {
        ok: true,
        value: {
            redirectUri,
            scopes: requestedScopes,
            scope: requestedScopes.join(' '),
            resource: normalizedResource,
        },
    };
}
