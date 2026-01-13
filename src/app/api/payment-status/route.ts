import { NextRequest, NextResponse } from "next/server";
import { getPaymentsPaused, setPaymentsPaused } from "@/lib/app-settings";
import { getServiceClient } from "@/lib/supabase-server";

export async function GET() {
    const paused = await getPaymentsPaused();
    return NextResponse.json({ paused });
}

export async function POST(request: NextRequest) {
    try {
        const supabase = getServiceClient();
        const authHeader = request.headers.get("authorization");

        if (!authHeader) {
            return NextResponse.json(
                { error: "请先登录" },
                { status: 401 }
            );
        }

        const token = authHeader.replace("Bearer ", "");
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json(
                { error: "请先登录" },
                { status: 401 }
            );
        }

        const { data: profile, error: profileError } = await supabase
            .from("users")
            .select("is_admin")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) {
            console.error("[payment-status] Failed to check admin:", profileError);
        }

        if (!profile?.is_admin) {
            return NextResponse.json(
                { error: "无权限操作" },
                { status: 403 }
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
