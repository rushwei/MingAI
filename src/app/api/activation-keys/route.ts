/**
 * 激活Key API
 * 
 * 提供激活Key的管理和激活功能
 * - GET: 获取所有Key (管理员)
 * - POST: 创建Key或激活Key
 * - DELETE: 删除Key (管理员)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdminUser, requireBearerUser } from "@/lib/api-utils";
import {
    createActivationKeys,
    getAllActivationKeys,
    deleteActivationKey,
    activateKey,
    type CreateKeyParams,
} from "@/lib/activation-keys";

/**
 * GET /api/activation-keys
 * 获取所有激活Key (管理员专用)
 */
export async function GET(request: NextRequest) {
    try {
        const auth = await requireAdminUser(request);
        if ("error" in auth) {
            const message = auth.error.status === 401 ? "未登录" : "无权限";
            return NextResponse.json({ success: false, error: message }, { status: auth.error.status });
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
        const body = await request.json();

        // 判断是创建还是激活
        if (body.action === "create") {
            const auth = await requireAdminUser(request);
            if ("error" in auth) {
                const message = auth.error.status === 401 ? "未登录" : "无权限";
                return NextResponse.json({ success: false, error: message }, { status: auth.error.status });
            }

            const params: CreateKeyParams = {
                keyType: body.keyType,
                membershipType: body.membershipType,
                creditsAmount: body.creditsAmount,
                count: body.count || 1,
            };

            const result = await createActivationKeys(auth.user.id, params);
            return NextResponse.json(result);
        } else if (body.action === "activate") {
            const auth = await requireBearerUser(request);
            if ("error" in auth) {
                return NextResponse.json({ success: false, error: "未登录" }, { status: auth.error.status });
            }
            // 激活Key - 普通用户可用
            const keyCode = body.keyCode?.trim();
            if (!keyCode) {
                return NextResponse.json({ success: false, error: "请输入激活码" }, { status: 400 });
            }

            const result = await activateKey(auth.user.id, keyCode);
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
        const auth = await requireAdminUser(request);
        if ("error" in auth) {
            const message = auth.error.status === 401 ? "未登录" : "无权限";
            return NextResponse.json({ success: false, error: message }, { status: auth.error.status });
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
