/**
 * Tool contract — 单个工具的统一装配契约
 * 内部统一以 contract 语义表达“定义 + 执行器 + 渲染器 + schema”。
 */
function bindDetailLevelRenderer(renderer) {
    return (result, options) => renderer(result, options?.detailLevel === undefined ? undefined : { detailLevel: options.detailLevel });
}
export function defineToolContract(contract) {
    return contract;
}
export function defineCanonicalToolContract(contract) {
    return defineToolContract({
        ...contract,
        renderText: bindDetailLevelRenderer(contract.renderText),
        renderJSON: bindDetailLevelRenderer(contract.renderJSON),
    });
}
export function mergePlaceResolutionInfo(canonicalJSON, rawResult) {
    if (typeof canonicalJSON !== 'object' || canonicalJSON === null)
        return canonicalJSON;
    if (typeof rawResult !== 'object' || rawResult === null)
        return canonicalJSON;
    if (!('placeResolutionInfo' in rawResult))
        return canonicalJSON;
    return {
        ...canonicalJSON,
        placeResolutionInfo: rawResult.placeResolutionInfo,
    };
}
