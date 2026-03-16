import { requestBrowserJson } from '@/lib/browser-api';

export type UserChartType = 'bazi' | 'ziwei';

export type UserChartRecord = {
    id: string;
    name: string;
    gender: 'male' | 'female' | null;
    birth_date: string;
    birth_time: string | null;
    birth_place: string | null;
    created_at: string;
};

type UserChartsResponse = {
    baziCharts: UserChartRecord[];
    ziweiCharts: UserChartRecord[];
    defaultChartIds: {
        bazi: string | null;
        ziwei: string | null;
    };
};

export type SelectableChart = {
    id: string;
    name: string;
    gender: 'male' | 'female' | null;
    birth_date: string;
    birth_time: string | null;
    type: UserChartType;
};

async function requestUserCharts<T>(url = '/api/user/charts', init?: RequestInit): Promise<T> {
    const result = await requestBrowserJson<T>(url, init);
    if (result.error) {
        throw new Error(result.error.message || '请求失败');
    }
    return result.data as T;
}

export async function getUserCharts() {
    return requestUserCharts<UserChartsResponse>();
}

export async function listSelectableCharts(): Promise<SelectableChart[]> {
    const data = await requestUserCharts<{
        charts?: SelectableChart[];
        baziCharts?: UserChartRecord[];
        ziweiCharts?: UserChartRecord[];
    }>();

    if (Array.isArray(data.charts)) {
        return data.charts;
    }

    return [
        ...((data.baziCharts || []).map(chart => ({ ...chart, type: 'bazi' as const }))),
        ...((data.ziweiCharts || []).map(chart => ({ ...chart, type: 'ziwei' as const }))),
    ];
}

export async function setDefaultUserChart(type: UserChartType, id: string) {
    return requestUserCharts<{ defaultChartIds: UserChartsResponse['defaultChartIds'] }>('/api/user/charts', {
        method: 'PATCH',
        body: JSON.stringify({ type, id }),
    });
}

export async function deleteUserChart(type: UserChartType, id: string) {
    const params = new URLSearchParams({ type, id });
    return requestUserCharts<{ success: boolean }>(`/api/user/charts?${params.toString()}`, {
        method: 'DELETE',
        body: undefined,
    });
}
