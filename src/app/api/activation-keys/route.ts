/**
 * 激活Key API
 * 
 * 提供激活Key的管理和激活功能
 * - GET: 获取所有Key (管理员)
 * - POST: 创建Key或激活Key
 * - DELETE: 删除Key (管理员)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServiceClient } from "@/lib/supabase-server";
import {
    createActivationKeys,
    getAllActivationKeys,
    deleteActivationKey,
    activateKey,
    type CreateKeyParams,
} from "@/lib/activation-keys";

// 从请求头获取用户ID
async function getUserFromRequest(request: NextRequest): Promise<{ userId: string; isAdmin: boolean } | null> {
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
        return null;
    }

    const token = authHeader.slice(7);
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            global: { headers: { Authorization: `Bearer ${token}` } },
        }
    );

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        return null;
    }

    // 检查是否为管理员
    const serviceClient = getServiceClient();
    const { data: userData } = await serviceClient
        .from("users")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

    return {
        userId: user.id,
        isAdmin: !!userData?.is_admin,
    };
}

/**
 * GET /api/activation-keys
 * 获取所有激活Key (管理员专用)
 */
export async function GET(request: NextRequest) {
    try {
        const auth = await getUserFromRequest(request);
        if (!auth) {
            return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
        }
        if (!auth.isAdmin) {
            return NextResponse.json({ success: false, error: "无权限" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const isUsedParam = searchParams.get("isUsed");
        const keyType = searchParams.get("keyType") as 'membership' | 'credits' | null;

        const filters: { isUsed?: boolean; keyType?: 'membership' | 'credits' } = {};
        if (isUsedParam !== null) {
            filters.isUsed = isUsedParam === "true";
        }
        if (keyType) {
            filters.keyType = keyType;
        }

        const keys = await getAllActivationKeys(filters);
        return NextResponse.json({ success: true, data: keys });
    } catch (error) {
        console.error("[api/activation-keys] GET error:", error);
        return NextResponse.json({ success: false, error: "服务器错误" }, { status: 500 });
    }
}

/**
 * POST /api/activation-keys
 * 创建Key (管理员) 或 激活Key (普通用户)
 */
export async function POST(request: NextRequest) {
    try {
        const auth = await getUserFromRequest(request);
        if (!auth) {
            return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
        }

        const body = await request.json();

        // 判断是创建还是激活
        if (body.action === "create") {
            // 创建Key - 需要管理员权限
            if (!auth.isAdmin) {
                return NextResponse.json({ success: false, error: "无权限" }, { status: 403 });
            }

            const params: CreateKeyParams = {
                keyType: body.keyType,
                membershipType: body.membershipType,
                creditsAmount: body.creditsAmount,
                count: body.count || 1,
            };

            const result = await createActivationKeys(auth.userId, params);
            return NextResponse.json(result);
        } else if (body.action === "activate") {
            // 激活Key - 普通用户可用
            const keyCode = body.keyCode?.trim();
            if (!keyCode) {
                return NextResponse.json({ success: false, error: "请输入激活码" }, { status: 400 });
            }

            const result = await activateKey(auth.userId, keyCode);
            return NextResponse.json(result);
        } else {
            return NextResponse.json({ success: false, error: "无效的操作" }, { status: 400 });
        }
    } catch (error) {
        console.error("[api/activation-keys] POST error:", error);
        return NextResponse.json({ success: false, error: "服务器错误" }, { status: 500 });
    }
}

/**
 * DELETE /api/activation-keys
 * 删除激活Key (管理员专用)
 */
export async function DELETE(request: NextRequest) {
    try {
        const auth = await getUserFromRequest(request);
        if (!auth) {
            return NextResponse.json({ success: false, error: "未登录" }, { status: 401 });
        }
        if (!auth.isAdmin) {
            return NextResponse.json({ success: false, error: "无权限" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const keyId = searchParams.get("id");

        if (!keyId) {
            return NextResponse.json({ success: false, error: "缺少Key ID" }, { status: 400 });
        }

        const success = await deleteActivationKey(keyId);
        return NextResponse.json({ success });
    } catch (error) {
        console.error("[api/activation-keys] DELETE error:", error);
        return NextResponse.json({ success: false, error: "服务器错误" }, { status: 500 });
    }
}
