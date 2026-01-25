import { NextRequest, NextResponse } from "next/server";
import { getPaymentsPaused, setPaymentsPaused } from "@/lib/app-settings";
import { getAuthContext, requireAdminUser } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
    await getAuthContext(request);
    const paused = await getPaymentsPaused();
    return NextResponse.json({ paused });
}

export async function POST(request: NextRequest) {
    try {
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

        return NextResponse.json({ success: true, paused });
    } catch (error) {
        console.error("[payment-status] Error:", error);
        return NextResponse.json(
            { error: "服务器错误" },
            { status: 500 }
        );
    }
}
