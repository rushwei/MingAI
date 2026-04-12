import { requestBrowserData } from '@/lib/browser-api';

export async function requestAdminJson<T>(
  url: string,
  init?: RequestInit,
  fallbackMessage = '请求失败',
): Promise<T> {
  return await requestBrowserData<T>(url, init, { fallbackMessage }) as T;
}
