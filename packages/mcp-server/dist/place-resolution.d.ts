import type { ToolResponseFormat } from '@mingai/core/transport';
type RuntimeToolPayload = {
    tools: Array<{
        name: string;
        description?: string;
        inputSchema?: {
            properties?: Record<string, unknown>;
            [key: string]: unknown;
        };
        outputSchema?: {
            properties?: Record<string, unknown>;
            [key: string]: unknown;
        };
        [key: string]: unknown;
    }>;
};
export type RuntimePlaceResolutionFallbackReason = 'no_birth_place' | 'geocoder_disabled' | 'geocode_failed' | 'precision_too_low' | 'invalid_location';
export type RuntimePlaceResolutionInfo = {
    requestedPlace?: string;
    resolved: boolean;
    provider?: 'amap';
    level?: string;
    formattedAddress?: string;
    adcode?: string;
    usedLongitude?: number;
    source: 'manual_longitude' | 'birth_place' | 'fallback';
    fallbackReason?: RuntimePlaceResolutionFallbackReason;
    trueSolarTimeApplied: boolean;
};
type RuntimeToolArgsResult = {
    toolArgs: Record<string, unknown>;
    placeResolutionInfo?: RuntimePlaceResolutionInfo;
};
export declare function preprocessToolArgsForRuntimePlace(toolName: string, args: unknown): Promise<RuntimeToolArgsResult>;
export declare function decorateToolListPayloadForRuntime(payload: RuntimeToolPayload): RuntimeToolPayload;
export declare function attachPlaceResolutionInfoToResult(result: unknown, placeResolutionInfo?: RuntimePlaceResolutionInfo): unknown;
export declare function attachPlaceResolutionNoteToPayload(payload: Record<string, unknown>, placeResolutionInfo: RuntimePlaceResolutionInfo | undefined, responseFormat: ToolResponseFormat): Record<string, unknown>;
export {};
