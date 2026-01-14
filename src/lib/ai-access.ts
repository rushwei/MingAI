import type { AIModelConfig } from "@/types";
import type { MembershipType } from "@/lib/membership";

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
