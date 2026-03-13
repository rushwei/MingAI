import { normalizeYongShenTargets, type LiuQin } from './liuyao';

export type ResultYongShenState = {
    appliedTargets: LiuQin[];
    pendingTargets: LiuQin[];
};

export function resolveResultYongShenTargets(
    resultTargets?: readonly unknown[],
    pendingTargets?: readonly unknown[],
    questionSessionTargets?: readonly unknown[],
): LiuQin[] {
    const normalizedResultTargets = normalizeYongShenTargets(resultTargets);
    if (normalizedResultTargets.length > 0) {
        return normalizedResultTargets;
    }

    const normalizedPendingTargets = normalizeYongShenTargets(pendingTargets);
    if (normalizedPendingTargets.length > 0) {
        return normalizedPendingTargets;
    }

    return normalizeYongShenTargets(questionSessionTargets);
}

export function resolveResultYongShenState(
    resultTargets?: readonly unknown[],
    pendingTargets?: readonly unknown[],
    questionSessionTargets?: readonly unknown[],
): ResultYongShenState {
    const normResult = normalizeYongShenTargets(resultTargets);
    const normPending = normalizeYongShenTargets(pendingTargets);
    const normSession = normalizeYongShenTargets(questionSessionTargets);

    // appliedTargets: result > questionSession (pending is draft-only, not auto-applied)
    const appliedTargets = normResult.length > 0 ? normResult : normSession;

    return {
        appliedTargets,
        pendingTargets: normPending,
    };
}
