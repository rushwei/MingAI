'use client';

import { useEffect } from 'react';
import {
    loadConversationAnalysisSnapshot,
    type ConversationAnalysisSnapshot,
} from '@/lib/chat/conversation-analysis';
import { resolveHistoryConversationId } from '@/lib/history/client';

export interface AnalysisSnapshotCallbacks {
    /** Called when a saved analysis text is found */
    onAnalysis: (analysis: string) => void;
    /** Called when saved reasoning text is found */
    onReasoning?: (reasoning: string) => void;
    /** Called when a saved model ID is found */
    onModelId?: (modelId: string) => void;
    /** Called with the reasoningEnabled flag */
    onReasoningEnabled?: (enabled: boolean) => void;
    /** Called when conversationId is resolved from history */
    onConversationIdResolved?: (conversationId: string) => void;
}

export interface UseAnalysisSnapshotOptions {
    /** Current conversationId (may be null initially) */
    conversationId: string | null | undefined;
    /** Divination/reading record ID used to look up conversation from history */
    recordId: string | null | undefined;
    /** Divination type for history lookup (e.g. 'tarot', 'liuyao', 'bazi') */
    divinationType: string;
    /** Session storage key for history lookup */
    sessionKey: string;
    /** Skip loading if analysis already exists */
    hasExistingAnalysis: boolean;
    /** Additional skip condition (e.g. result not loaded yet) */
    skip?: boolean;
    /** Callbacks for setting state from snapshot */
    callbacks: AnalysisSnapshotCallbacks;
}

/**
 * Shared hook that loads a conversation analysis snapshot from history.
 *
 * Replaces the duplicated `loadAnalysis` useEffect found across
 * tarot, liuyao, qimen, mbti, hepan, daliuren result pages.
 */
export function useAnalysisSnapshot({
    conversationId,
    recordId,
    divinationType,
    sessionKey,
    hasExistingAnalysis,
    skip = false,
    callbacks,
}: UseAnalysisSnapshotOptions): void {
    useEffect(() => {
        if (skip || hasExistingAnalysis) return;

        let cancelled = false;

        const loadAnalysis = async () => {
            let resolvedId = conversationId ?? null;

            if (!resolvedId && recordId) {
                resolvedId = await resolveHistoryConversationId(
                    divinationType,
                    recordId,
                    sessionKey,
                );
                if (cancelled) return;
                if (resolvedId) {
                    callbacks.onConversationIdResolved?.(resolvedId);
                }
            }

            if (!resolvedId) return;

            const snapshot: ConversationAnalysisSnapshot | null =
                await loadConversationAnalysisSnapshot(resolvedId);
            if (cancelled || !snapshot) return;

            if (snapshot.analysis) {
                callbacks.onAnalysis(snapshot.analysis);
            }
            if (snapshot.reasoning) {
                callbacks.onReasoning?.(snapshot.reasoning);
            }
            if (snapshot.modelId) {
                callbacks.onModelId?.(snapshot.modelId);
            }
            callbacks.onReasoningEnabled?.(snapshot.reasoningEnabled);
        };

        void loadAnalysis();
        return () => { cancelled = true; };
    }, [conversationId, recordId, divinationType, sessionKey, hasExistingAnalysis, skip, callbacks]);
}
