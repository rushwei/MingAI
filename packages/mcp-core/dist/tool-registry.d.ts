import { type ToolDefinition } from './tool-schema.js';
export type ToolFormatterKey = 'bazi' | 'baziPillarsResolve' | 'ziwei' | 'ziweiHoroscope' | 'ziweiFlyingStar' | 'liuyao' | 'tarot' | 'almanac' | 'baziDayun' | 'qimen';
type ToolHandler = (args: unknown) => unknown | Promise<unknown>;
export interface ToolRegistryEntry {
    definition: ToolDefinition;
    handler: ToolHandler;
    formatterKey?: ToolFormatterKey;
}
export declare const toolRegistry: ToolRegistryEntry[];
export declare const toolRegistryMap: Map<string, ToolRegistryEntry>;
export declare function getToolRegistryEntry(name: string): ToolRegistryEntry | undefined;
export {};
//# sourceMappingURL=tool-registry.d.ts.map