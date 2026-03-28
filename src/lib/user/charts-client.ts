import { requestBrowserJson } from '@/lib/browser-api';
import type { BaziChart } from '@/types';

type UserChartListResponse = {
  baziCharts?: Array<Record<string, unknown>>;
  ziweiCharts?: Array<Record<string, unknown>>;
  defaultChartIds?: {
    bazi?: string | null;
    ziwei?: string | null;
  };
};

export function toFortuneBaziChart(row: Record<string, unknown> | null | undefined): BaziChart | null {
  if (!row || typeof row !== 'object') {
    return null;
  }

  const chartData = (row.chart_data && typeof row.chart_data === 'object')
    ? row.chart_data as Record<string, unknown>
    : null;

  if (
    typeof row.id !== 'string'
    || typeof row.name !== 'string'
    || typeof row.birth_date !== 'string'
    || !chartData
    || !chartData.fourPillars
    || !chartData.dayMaster
    || !chartData.fiveElements
  ) {
    return null;
  }

  return {
    id: row.id,
    userId: typeof row.user_id === 'string' ? row.user_id : undefined,
    name: row.name,
    gender: (row.gender as BaziChart['gender']) ?? 'male',
    birthDate: row.birth_date,
    birthTime: typeof row.birth_time === 'string' ? row.birth_time : '',
    birthPlace: typeof row.birth_place === 'string' ? row.birth_place : undefined,
    timezone: typeof chartData.timezone === 'number' ? chartData.timezone : 8,
    calendarType: row.calendar_type === 'lunar' ? 'lunar' : 'solar',
    isLeapMonth: row.is_leap_month === true,
    fourPillars: chartData.fourPillars as BaziChart['fourPillars'],
    dayMaster: chartData.dayMaster as BaziChart['dayMaster'],
    fiveElements: chartData.fiveElements as BaziChart['fiveElements'],
    kongWang: chartData.kongWang as BaziChart['kongWang'],
    taiYuan: chartData.taiYuan as BaziChart['taiYuan'],
    mingGong: chartData.mingGong as BaziChart['mingGong'],
    trueSolarTimeInfo: chartData.trueSolarTimeInfo as BaziChart['trueSolarTimeInfo'],
    relations: chartData.relations as BaziChart['relations'],
    tianGanWuHe: chartData.tianGanWuHe as BaziChart['tianGanWuHe'],
    tianGanChongKe: chartData.tianGanChongKe as BaziChart['tianGanChongKe'],
    diZhiBanHe: chartData.diZhiBanHe as BaziChart['diZhiBanHe'],
    diZhiSanHui: chartData.diZhiSanHui as BaziChart['diZhiSanHui'],
    isUnlocked: row.is_unlocked !== false,
    createdAt: typeof row.created_at === 'string' ? row.created_at : new Date().toISOString(),
  };
}

export async function loadUserChartBundle() {
  const result = await requestBrowserJson<UserChartListResponse>('/api/user/charts', {
    method: 'GET',
  });

  if (result.error) {
    console.error('[charts-client] failed to load chart bundle:', result.error.message);
    return null;
  }

  return result.data ?? null;
}

export async function loadSavedChart(type: 'bazi' | 'ziwei', id: string) {
  const result = await requestBrowserJson<{ chart?: Record<string, unknown> | null }>(`/api/${type}/charts?id=${id}`, {
    method: 'GET',
  });

  if (result.error) {
    console.error('[charts-client] failed to load chart:', result.error.message);
    return null;
  }

  return result.data?.chart ?? null;
}

export async function loadFortuneBaziChart(id: string) {
  const chart = await loadSavedChart('bazi', id);
  return toFortuneBaziChart(chart);
}

export async function createSavedChart(type: 'bazi' | 'ziwei', payload: Record<string, unknown>) {
  const result = await requestBrowserJson<{ id?: string | null }>(`/api/${type}/charts`, {
    method: 'POST',
    body: JSON.stringify({ payload }),
  });

  if (result.error) {
    console.error('[charts-client] failed to create chart:', result.error.message);
    return null;
  }

  return result.data?.id ?? null;
}
