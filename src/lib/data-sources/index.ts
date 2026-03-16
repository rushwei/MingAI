import { DATA_SOURCE_LOADERS, DATA_SOURCE_TYPES } from '@/lib/data-sources/manifest';
import type { DataSourceProvider, DataSourceQueryContext, DataSourceSummary, DataSourceType } from '@/lib/data-sources/types';

export async function getProvider(type: DataSourceType): Promise<DataSourceProvider> {
    const loader = DATA_SOURCE_LOADERS[type];
    if (!loader) throw new Error(`Unknown data source type: ${type}`);
    return await loader();
}

export async function getUserDataSources(userId: string, ctx?: DataSourceQueryContext): Promise<DataSourceSummary[]> {
    const { items } = await getUserDataSourcesWithErrors(userId, ctx);
    return items;
}

export type UserDataSourcesResult = {
    items: DataSourceSummary[];
    errors: Array<{ type: DataSourceType; message: string }>;
};

export async function getUserDataSourcesWithErrors(userId: string, ctx?: DataSourceQueryContext): Promise<UserDataSourcesResult> {
    const errors: Array<{ type: DataSourceType; message: string }> = [];
    const loaded = await Promise.all(DATA_SOURCE_TYPES.map(async (type) => await getProvider(type)));

    const lists = await Promise.all(loaded.map(async (provider) => {
        try {
            return await provider.list(userId, ctx);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'unknown error';
            errors.push({ type: provider.type, message });
            return [];
        }
    }));

    const results = lists.flat();
    results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return { items: results, errors };
}

export async function resolveDataSources(
    refs: Array<{ type: DataSourceType; id: string }>,
    userId: string,
    ctx?: DataSourceQueryContext
): Promise<Array<{ type: DataSourceType; id: string; content: string }>> {
    return Promise.all(refs.map(async ({ type, id }) => {
        const provider = await getProvider(type);
        const data = await provider.get(id, userId, ctx);
        return { type, id, content: data ? provider.formatForAI(data) : '' };
    }));
}
