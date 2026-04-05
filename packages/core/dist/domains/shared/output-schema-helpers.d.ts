import type { ToolDefinition } from '../../tool-schema.js';
export type OutputSchema = NonNullable<ToolDefinition['outputSchema']>;
export declare const str: (description?: string) => {
    description?: string | undefined;
    type: string;
};
export declare const num: (description?: string) => {
    description?: string | undefined;
    type: string;
};
export declare const bool: (description?: string) => {
    description?: string | undefined;
    type: string;
};
export declare const arr: (items: Record<string, unknown>, description?: string) => {
    description?: string | undefined;
    type: string;
    items: Record<string, unknown>;
};
export declare const obj: (properties: Record<string, unknown>, description?: string) => OutputSchema;
export declare const trueSolarTimeSchema: {
    type: "object";
    properties: Record<string, unknown>;
};
export declare const hiddenStemSchema: {
    type: "object";
    properties: Record<string, unknown>;
};
export declare const branchRelationSchema: {
    type: "object";
    properties: Record<string, unknown>;
};
export declare const liunianItemSchema: {
    type: "object";
    properties: Record<string, unknown>;
};
export declare const dayunItemSchema: {
    type: "object";
    properties: Record<string, unknown>;
};
//# sourceMappingURL=output-schema-helpers.d.ts.map