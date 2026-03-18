import { createChartGetHandler, createChartPostHandler } from '@/lib/api/chart-crud';

const config = { tableName: 'bazi_charts' } as const;

export const GET = createChartGetHandler(config);
export const POST = createChartPostHandler(config);
