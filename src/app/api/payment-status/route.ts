import { NextRequest, NextResponse } from "next/server";
import { getPaymentsPaused, setPaymentsPaused } from "@/lib/app-settings";
import { getAuthContext, requireAdminUser } from "@/lib/api-utils";
import { createMemoryCache } from "@/lib/cache";

const CACHE_TTL_MS = 30_000;
const pausedCache = createMemoryCache<boolean>(CACHE_TTL_MS);

export async function GET(request: NextRequest) {
    const perfEnabled = new URL(request.url).searchParams.get('perf') === '1';
    const perfStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
    await getAuthContext(request);
    const cached = pausedCache.get('status');
    if (cached !== null) {
        if (perfEnabled) {
            const duration = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - perfStart);
            console.info(`[perf:payment-status:get] ${duration}ms`, { cached: true });
        }
        return NextResponse.json({ paused: cached });
    }
    const paused = await getPaymentsPaused();
    pausedCache.set('status', paused);
    if (perfEnabled) {
        const duration = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - perfStart);
        console.info(`[perf:payment-status:get] ${duration}ms`);
    }
    return NextResponse.json({ paused });
}

export async function POST(request: NextRequest) {
    try {
        const perfEnabled = new URL(request.url).searchParams.get('perf') === '1';
        const perfStart = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const auth = await requireAdminUser(request);
        if ("error" in auth) {
            return NextResponse.json(
                { error: auth.error.message },
                { status: auth.error.status }
            );
        }

        const { paused } = await request.json();
        if (typeof paused !== "boolean") {
            return NextResponse.json(
                { error: "无效的参数" },
                { status: 400 }
            );
        }

        const success = await setPaymentsPaused(paused);
        if (!success) {
            return NextResponse.json(
                { error: "更新失败" },
                { status: 500 }
            );
        }

        pausedCache.set('status', paused);
        if (perfEnabled) {
            const duration = Math.round((typeof performance !== 'undefined' ? performance.now() : Date.now()) - perfStart);
            console.info(`[perf:payment-status:post] ${duration}ms`);
        }
        return NextResponse.json({ success: true, paused });
    } catch (error) {
        console.error("[payment-status] Error:", error);
        return NextResponse.json(
            { error: "服务器错误" },
            { status: 500 }
        );
    }
}
