import type { OAuthClientInformationFull } from '@modelcontextprotocol/sdk/shared/auth.js';
type LoginValidationInput = {
    client: OAuthClientInformationFull;
    redirectUri: string;
    scope?: string;
    resource?: string;
    issuerUrl: URL;
    allowedAudiences: string[];
};
type LoginValidationSuccess = {
    ok: true;
    value: {
        redirectUri: string;
        scope: string;
        scopes: string[];
        resource?: string;
    };
};
type LoginValidationFailure = {
    ok: false;
    error: 'Invalid redirect_uri' | 'Invalid scope' | 'Invalid resource';
};
export type LoginValidationResult = LoginValidationSuccess | LoginValidationFailure;
export declare function validateOAuthLoginRequest(input: LoginValidationInput): LoginValidationResult;
export {};
