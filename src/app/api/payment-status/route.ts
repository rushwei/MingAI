import { NextRequest } from "next/server";
import { getPaymentsPaused, setPaymentsPaused } from "@/lib/app-settings";
import { jsonError, jsonOk, requireAdminUser } from "@/lib/api-utils";
import { createMemoryCache } from '@/lib/cache/memory';

const CACHE_TTL_MS = 30_000;
const pausedCache = createMemoryCache<boolean>(CACHE_TTL_MS);

export async function GET(request: NextRequest) {
    const perfEnabled = new URL(request.url).searchParams.get('perf') === '1';
    const perfStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const cached = pausedCache.get('status');
    if (cached !== null) {
        if (perfEnabled) {
            const duration = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - perfStart);
            console.info(`[perf:payment-status:get] ${duration}ms`, { cached: true });
        }
        return jsonOk({ paused: cached });
    }
    const paused = await getPaymentsPaused();
    pausedCache.set('status', paused);
    if (perfEnabled) {
        const duration = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - perfStart);
        console.info(`[perf:payment-status:get] ${duration}ms`);
    }
    return jsonOk({ paused });
}

export async function POST(request: NextRequest) {
    try {
        const perfEnabled = new URL(request.url).searchParams.get('perf') === '1';
        const perfStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const auth = await requireAdminUser(request);
        if ("error" in auth) {
            return jsonError(auth.error.message, auth.error.status);
        }

        const { paused } = await request.json();
        if (typeof paused !== "boolean") {
            return jsonError("无效的参数", 400);
        }

        const success = await setPaymentsPaused(paused);
        if (!success) {
            return jsonError("更新失败", 500);
        }

        pausedCache.set('status', paused);
        if (perfEnabled) {
            const duration = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - perfStart);
            console.info(`[perf:payment-status:post] ${duration}ms`);
        }
        return jsonOk({ success: true, paused });
    } catch (error) {
        console.error("[payment-status] Error:", error);
        return jsonError("服务器错误", 500);
    }
}
