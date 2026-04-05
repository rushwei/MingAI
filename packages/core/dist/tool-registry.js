/**
 * 工具注册表
 *
 * 基于 tool contract 模式：每个术数的装配信息由 tool-catalog.ts 集中管理，
 * 本文件只负责将 contract 转换为 ToolRegistryEntry。
 */
import { toolCatalog } from './tool-catalog.js';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toolContractToRegistryEntry(contract) {
    const definition = contract.canonicalOutputSchema
        ? { ...contract.definition, outputSchema: contract.canonicalOutputSchema }
        : contract.definition;
    return {
        definition,
        execute: contract.execute,
        markdownFormatter: contract.renderText,
        jsonFormatter: contract.renderJSON,
        debugMarkdownFormatter: contract.debugRenderText,
        debugJsonFormatter: contract.debugRenderJSON,
        mergeRuntimeExtras: contract.mergeRuntimeExtras,
    };
}
export const toolRegistry = toolCatalog.map(toolContractToRegistryEntry);
export const toolRegistryMap = new Map(toolRegistry.map((entry) => [entry.definition.name, entry]));
export function getToolRegistryEntry(name) {
    return toolRegistryMap.get(name);
}
