import type { SelectedCharts } from '@/components/chat/BaziChartSelector';
import { filterMentionsByFeature } from '@/lib/data-sources/catalog';
import type { DataSourceType } from '@/lib/data-sources/types';
import type { ChatMessage, Mention } from '@/types';

type ChatMentionFeatureState = {
    knowledgeBaseEnabled: boolean;
    enabledDataSourceTypes: readonly DataSourceType[];
};

type ChatChartFeatureState = {
    baziEnabled: boolean;
    ziweiEnabled: boolean;
};

type ChatRequestChartIds = {
    baziId?: string;
    ziweiId?: string;
    baziAnalysisMode?: 'traditional' | 'mangpai';
};

export function sanitizeChatMentions(
    mentions: Mention[] | undefined,
    featureState: ChatMentionFeatureState,
): Mention[] {
    return filterMentionsByFeature(mentions ?? [], featureState);
}

export function sanitizeSelectedCharts(
    selectedCharts: SelectedCharts | undefined,
    featureState: ChatChartFeatureState,
): SelectedCharts {
    const next: SelectedCharts = {};

    if (featureState.baziEnabled && selectedCharts?.bazi) {
        next.bazi = selectedCharts.bazi;
    }
    if (featureState.ziweiEnabled && selectedCharts?.ziwei) {
        next.ziwei = selectedCharts.ziwei;
    }

    return next;
}

export function buildChatRequestChartIds(
    selectedCharts: SelectedCharts | undefined,
    featureState: ChatChartFeatureState,
): ChatRequestChartIds | undefined {
    const sanitizedCharts = sanitizeSelectedCharts(selectedCharts, featureState);

    if (!sanitizedCharts.bazi && !sanitizedCharts.ziwei) {
        return undefined;
    }

    const payload: ChatRequestChartIds = {};

    if (sanitizedCharts.bazi?.id) {
        payload.baziId = sanitizedCharts.bazi.id;
    }
    if (sanitizedCharts.ziwei?.id) {
        payload.ziweiId = sanitizedCharts.ziwei.id;
    }
    if (sanitizedCharts.bazi?.analysisMode) {
        payload.baziAnalysisMode = sanitizedCharts.bazi.analysisMode;
    }

    return payload;
}

export function buildChatMessageChartInfo(
    selectedCharts: SelectedCharts | undefined,
    featureState: ChatChartFeatureState,
): ChatMessage['chartInfo'] | undefined {
    const sanitizedCharts = sanitizeSelectedCharts(selectedCharts, featureState);

    if (!sanitizedCharts.bazi?.name && !sanitizedCharts.ziwei?.name) {
        return undefined;
    }

    const payload: NonNullable<ChatMessage['chartInfo']> = {};
    if (sanitizedCharts.bazi?.name) {
        payload.baziName = sanitizedCharts.bazi.name;
    }
    if (sanitizedCharts.ziwei?.name) {
        payload.ziweiName = sanitizedCharts.ziwei.name;
    }
    return payload;
}
