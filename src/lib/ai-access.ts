import type { AIModelConfig } from "@/types";
import type { MembershipType } from "@/lib/membership";
import { getModelConfig } from "@/lib/ai-config";

type ModelTier = "free" | "plus" | "pro" | "none";

function getModelTier(model: AIModelConfig): ModelTier {
    if (model.vendor === "deepai") {
        return "pro";
    }

    if (model.vendor === "deepseek") {
        if (model.id === "deepseek-v3") return "free";
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

    // Vision models require Plus
    if (model.vendor === "qwen-vl" || model.vendor === "gemini-vl") {
        return "plus";
    }

    return "none";
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
    if (membership === "free") return false;

    if (model.vendor === "deepai") {
        return membership === "pro";
    }

    if (model.vendor === "deepseek") {
        return model.id === "deepseek-pro";
    }

    if (model.vendor === "gemini") {
        return model.id.startsWith("gemini-pro-");
    }

    if (model.vendor === "glm") {
        return true;
    }

    if (model.vendor === "qwen") {
        return membership === "plus" || membership === "pro";
    }

    // Vision models allow reasoning for Plus+
    if (model.vendor === "qwen-vl" || model.vendor === "gemini-vl") {
        return membership === "plus" || membership === "pro";
    }

    return false;
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

    if (model.vendor === "deepai") {
        return { allowed, blockedReason: "Pro", reasoningAllowed };
    }

    return { allowed, blockedReason: "Plus", reasoningAllowed };
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
