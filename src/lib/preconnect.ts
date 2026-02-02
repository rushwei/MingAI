/**
 * 预连接优化
 *
 * 提前建立到 AI API 的连接，减少首字符延迟
 */

let preconnected = false;

/**
 * 预连接到常用 API 端点
 */
export function setupPreconnect(): void {
    if (preconnected || typeof document === 'undefined') {
        return;
    }

    // 预连接到本地 API
    const apiLink = document.createElement('link');
    apiLink.rel = 'preconnect';
    apiLink.href = window.location.origin;
    document.head.appendChild(apiLink);

    preconnected = true;
}

/**
 * 预热 API 连接（在用户开始输入时调用）
 */
export async function warmupConnection(): Promise<void> {
    try {
        // 发送轻量级请求预热连接
        await fetch('/api/health', {
            method: 'HEAD',
            cache: 'no-store',
        });
    } catch {
        // 忽略错误
    }
}
