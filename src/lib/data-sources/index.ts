import type { DataSourceProvider, DataSourceQueryContext, DataSourceSummary, DataSourceType } from '@/lib/data-sources/types';

const providers = new Map<DataSourceType, () => Promise<DataSourceProvider>>();

export function registerDataSource(
    type: DataSourceType,
    loader: () => Promise<DataSourceProvider>
): void {
    providers.set(type, loader);
}

export async function getProvider(type: DataSourceType): Promise<DataSourceProvider> {
    const loader = providers.get(type);
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
    const loaded = await Promise.all([...providers.values()].map(async (loader) => await loader()));

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

const _init = (() => {
    registerDataSource('bazi_chart', async () => {
        const { baziProvider } = await import('@/lib/data-sources/bazi');
        return baziProvider;
    });
    registerDataSource('ziwei_chart', async () => {
        const { ziweiProvider } = await import('@/lib/data-sources/ziwei');
        return ziweiProvider;
    });
    registerDataSource('tarot_reading', async () => {
        const { tarotProvider } = await import('@/lib/data-sources/tarot');
        return tarotProvider;
    });
    registerDataSource('liuyao_divination', async () => {
        const { liuyaoProvider } = await import('@/lib/data-sources/liuyao');
        return liuyaoProvider;
    });
    registerDataSource('mbti_reading', async () => {
        const { mbtiProvider } = await import('@/lib/data-sources/mbti');
        return mbtiProvider;
    });
    registerDataSource('hepan_chart', async () => {
        const { hepanProvider } = await import('@/lib/data-sources/hepan');
        return hepanProvider;
    });
    registerDataSource('face_reading', async () => {
        const { faceProvider } = await import('@/lib/data-sources/face');
        return faceProvider;
    });
    registerDataSource('palm_reading', async () => {
        const { palmProvider } = await import('@/lib/data-sources/palm');
        return palmProvider;
    });
    registerDataSource('ming_record', async () => {
        const { recordProvider } = await import('@/lib/data-sources/record');
        return recordProvider;
    });
    registerDataSource('daily_fortune', async () => {
        const { dailyFortuneProvider } = await import('@/lib/data-sources/fortune');
        return dailyFortuneProvider;
    });
    registerDataSource('monthly_fortune', async () => {
        const { monthlyFortuneProvider } = await import('@/lib/data-sources/fortune');
        return monthlyFortuneProvider;
    });
})();

void _init;
