import { requestBrowserJson } from '@/lib/browser-api';
import type { BaziOutput as CoreBaziOutput } from '@mingai/core/bazi';
import { calculateBaziOutputFromStoredFields } from '@/lib/divination/bazi-record';

type UserChartListResponse = {
  baziCharts?: Array<Record<string, unknown>>;
  ziweiCharts?: Array<Record<string, unknown>>;
  defaultChartIds?: {
    bazi?: string | null;
    ziwei?: string | null;
  };
};

export type SavedBaziChart = {
  id: string;
  name: string;
  output: CoreBaziOutput;
};

export function toSavedBaziChart(row: Record<string, unknown> | null | undefined): SavedBaziChart | null {
  if (!row || typeof row !== 'object') {
    return null;
  }

  const output = calculateBaziOutputFromStoredFields({
    gender: row.gender as string | null | undefined,
    birth_date: row.birth_date as string | null | undefined,
    birth_time: row.birth_time as string | null | undefined,
    birth_place: row.birth_place as string | null | undefined,
    longitude: row.longitude as number | string | null | undefined,
    calendar_type: row.calendar_type as string | null | undefined,
    is_leap_month: row.is_leap_month as boolean | null | undefined,
  });

  if (
    typeof row.id !== 'string'
    || typeof row.name !== 'string'
    || !output
  ) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    output,
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

export async function loadSavedBaziChart(id: string) {
  const chart = await loadSavedChart('bazi', id);
  return toSavedBaziChart(chart);
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
