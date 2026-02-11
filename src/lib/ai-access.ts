import type { AIModelConfig } from "@/types";
import type { MembershipType } from "@/lib/membership";
import { getModelConfig } from "@/lib/ai-config";
import { getModelConfigAsync } from "@/lib/server/ai-config";

type ModelTier = "free" | "plus" | "pro" | "none";

/**
 * 获取模型所需等级（优先使用数据库配置）
 */
function getModelTier(model: AIModelConfig): ModelTier {
    // 优先使用数据库配置的 requiredTier
    if (model.requiredTier) {
        return model.requiredTier;
    }

    // 回退到硬编码逻辑（兼容环境变量配置）
    if (model.vendor === "deepai") {
        return "pro";
    }

    if (model.vendor === "deepseek") {
        if (model.id === "deepseek-v3.2") return "free";
        if (model.id === "deepseek-pro") return "plus";
        return "none";
    }

    if (model.vendor === "gemini") {
        return "plus";
    }

    if (model.vendor === "glm") {
        if (model.id === "glm-4.6") return "free";
        return "plus";
    }

    if (model.vendor === "qwen") {
        return "plus";
    }

    if (model.vendor === "moonshot") {
        return "free";
    }

    // Vision models require Plus
    if (model.vendor === "qwen-vl" || model.vendor === "gemini-vl") {
        return "plus";
    }

    return "none";
}

/**
 * 获取推理模式所需等级（优先使用数据库配置）
 */
function getReasoningTier(model: AIModelConfig): ModelTier {
    // 优先使用数据库配置的 reasoningRequiredTier
    if (model.reasoningRequiredTier) {
        return model.reasoningRequiredTier;
    }

    // 回退到硬编码逻辑
    if (model.vendor === "deepai") {
        return "pro";
    }

    // 默认 plus 可用
    return "plus";
}

export function isModelAllowedForMembership(
    model: AIModelConfig,
    membership: MembershipType
): boolean {
    const tier = getModelTier(model);
    if (tier === "none") return false;

    if (membership === "pro") return true;
    if (membership === "plus") return tier === "free" || tier === "plus";
    return tier === "free";
}

export function isReasoningAllowedForMembership(
    model: AIModelConfig,
    membership: MembershipType
): boolean {
    if (!model.supportsReasoning) return false;

    // 使用数据库配置的 reasoningRequiredTier
    const reasoningTier = getReasoningTier(model);

    if (membership === "pro") return true;
    if (membership === "plus") return reasoningTier === "free" || reasoningTier === "plus";
    return reasoningTier === "free";
}

export function getModelAccessForMembership(
    model: AIModelConfig,
    membership: MembershipType
): { allowed: boolean; blockedReason: string | null; reasoningAllowed: boolean } {
    const allowed = isModelAllowedForMembership(model, membership);
    const reasoningAllowed = isReasoningAllowedForMembership(model, membership);
    if (allowed) {
        return { allowed, blockedReason: null, reasoningAllowed };
    }

    // 使用数据库配置的 requiredTier 来确定阻止原因
    const tier = getModelTier(model);
    if (tier === "pro") {
        return { allowed, blockedReason: "Pro", reasoningAllowed };
    }

    return { allowed, blockedReason: "Plus", reasoningAllowed };
}

/**
 * 异步版本 - 用于 API 路由
 * 直接使用传入的模型配置（已包含数据库 tier 信息）
 */
export async function getModelAccessForMembershipAsync(
    model: AIModelConfig,
    membership: MembershipType
): Promise<{ allowed: boolean; blockedReason: string | null; reasoningAllowed: boolean }> {
    return getModelAccessForMembership(model, membership);
}

type ResolveModelAccessOptions = {
    requireVision?: boolean;
    membershipDeniedMessage?: string;
    invalidModelMessage?: string;
    invalidVisionMessage?: string;
};

export function resolveModelAccess(
    modelId: string | undefined,
    defaultModelId: string,
    membership: MembershipType,
    reasoning?: boolean,
    options?: ResolveModelAccessOptions
):
    | { modelId: string; modelConfig: AIModelConfig; reasoningEnabled: boolean }
    | { error: string; status: number } {
    const requestedModelId = modelId?.trim() ? modelId.trim() : defaultModelId;
    const modelConfig = getModelConfig(requestedModelId);
    if (!modelConfig) {
        return { error: options?.invalidModelMessage ?? "模型不可用", status: 400 };
    }

    if (options?.requireVision && !modelConfig.supportsVision) {
        return { error: options?.invalidVisionMessage ?? "请选择支持图像分析的模型", status: 400 };
    }

    if (!isModelAllowedForMembership(modelConfig, membership)) {
        return { error: options?.membershipDeniedMessage ?? "当前会员等级无法使用该模型", status: 403 };
    }

    const reasoningAllowed = isReasoningAllowedForMembership(modelConfig, membership);
    return {
        modelId: requestedModelId,
        modelConfig,
        reasoningEnabled: reasoningAllowed ? !!reasoning : false,
    };
}

/**
 * 异步版本 - 用于 API 路由
 * 确保从数据库加载模型配置
 */
export async function resolveModelAccessAsync(
    modelId: string | undefined,
    defaultModelId: string,
    membership: MembershipType,
    reasoning?: boolean,
    options?: ResolveModelAccessOptions
): Promise<
    | { modelId: string; modelConfig: AIModelConfig; reasoningEnabled: boolean }
    | { error: string; status: number }
> {
    const requestedModelId = modelId?.trim() ? modelId.trim() : defaultModelId;
    const modelConfig = await getModelConfigAsync(requestedModelId);
    if (!modelConfig) {
        return { error: options?.invalidModelMessage ?? "模型不可用", status: 400 };
    }

    if (options?.requireVision && !modelConfig.supportsVision) {
        return { error: options?.invalidVisionMessage ?? "请选择支持图像分析的模型", status: 400 };
    }

    if (!isModelAllowedForMembership(modelConfig, membership)) {
        return { error: options?.membershipDeniedMessage ?? "当前会员等级无法使用该模型", status: 403 };
    }

    const reasoningAllowed = isReasoningAllowedForMembership(modelConfig, membership);
    return {
        modelId: requestedModelId,
        modelConfig,
        reasoningEnabled: reasoningAllowed ? !!reasoning : false,
    };
}
