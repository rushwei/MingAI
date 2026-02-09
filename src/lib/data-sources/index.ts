import type { DataSourceProvider, DataSourceQueryContext, DataSourceSummary, DataSourceType } from '@/lib/data-sources/types';
import { baziProvider } from '@/lib/data-sources/bazi';
import { ziweiProvider } from '@/lib/data-sources/ziwei';
import { tarotProvider } from '@/lib/data-sources/tarot';
import { liuyaoProvider } from '@/lib/data-sources/liuyao';
import { mbtiProvider } from '@/lib/data-sources/mbti';
import { hepanProvider } from '@/lib/data-sources/hepan';
import { faceProvider } from '@/lib/data-sources/face';
import { palmProvider } from '@/lib/data-sources/palm';
import { recordProvider } from '@/lib/data-sources/record';
import { dailyFortuneProvider, monthlyFortuneProvider } from '@/lib/data-sources/fortune';

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
    registerDataSource('bazi_chart', async () => baziProvider);
    registerDataSource('ziwei_chart', async () => ziweiProvider);
    registerDataSource('tarot_reading', async () => tarotProvider);
    registerDataSource('liuyao_divination', async () => liuyaoProvider);
    registerDataSource('mbti_reading', async () => mbtiProvider);
    registerDataSource('hepan_chart', async () => hepanProvider);
    registerDataSource('face_reading', async () => faceProvider);
    registerDataSource('palm_reading', async () => palmProvider);
    registerDataSource('ming_record', async () => recordProvider);
    registerDataSource('daily_fortune', async () => dailyFortuneProvider);
    registerDataSource('monthly_fortune', async () => monthlyFortuneProvider);
})();

void _init;
