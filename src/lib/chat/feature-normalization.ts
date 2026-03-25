import { DATA_SOURCE_TYPES } from '@/lib/data-sources/contracts';
import { filterMentionsByFeature } from '@/lib/data-sources/catalog';
import type { DataSourceType } from '@/lib/data-sources/types';
import type { AIMessageMetadata, InjectedSource, Mention } from '@/types';

type ChatMentionFeatureState = {
    knowledgeBaseEnabled: boolean;
    enabledDataSourceTypes: readonly DataSourceType[];
};

type VisibleSourcePanelState = {
    visibleSources: InjectedSource[];
    showKnowledgeBaseMiss: boolean;
};

function isEnabledDataSourceType(
    sourceType: string | undefined,
    enabledTypeSet: Set<DataSourceType>,
): sourceType is DataSourceType {
    return !!sourceType
        && DATA_SOURCE_TYPES.includes(sourceType as DataSourceType)
        && enabledTypeSet.has(sourceType as DataSourceType);
}

export function sanitizeChatMentions(
    mentions: Mention[] | undefined,
    featureState: ChatMentionFeatureState,
): Mention[] {
    return filterMentionsByFeature(mentions ?? [], featureState);
}

export function sanitizeChatSources(
    sources: InjectedSource[] | undefined,
    featureState: ChatMentionFeatureState,
): InjectedSource[] {
    const enabledTypeSet = new Set(featureState.enabledDataSourceTypes);

    return (sources ?? []).filter((source) => {
        if (source.type === 'knowledge_base') {
            return featureState.knowledgeBaseEnabled;
        }

        if (source.type !== 'mention' && source.type !== 'data_source') {
            return false;
        }

        return isEnabledDataSourceType(source.sourceType, enabledTypeSet);
    });
}

export function getVisibleSourcePanelState(
    metadata: Pick<AIMessageMetadata, 'sources' | 'kbSearchEnabled'> | undefined,
    featureState: ChatMentionFeatureState,
): VisibleSourcePanelState {
    const visibleSources = sanitizeChatSources(metadata?.sources, featureState);

    return {
        visibleSources,
        showKnowledgeBaseMiss: featureState.knowledgeBaseEnabled
            && Boolean(metadata?.kbSearchEnabled)
            && visibleSources.length === 0,
    };
}
