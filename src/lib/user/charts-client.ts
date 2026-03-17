import { requestBrowserJson } from '@/lib/browser-api';

type UserChartListResponse = {
  baziCharts?: Array<Record<string, unknown>>;
  ziweiCharts?: Array<Record<string, unknown>>;
  defaultChartIds?: {
    bazi?: string | null;
    ziwei?: string | null;
  };
};

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
