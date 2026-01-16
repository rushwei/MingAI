/**
 * Dify 增强 API 路由
 *
 * 处理文件上传和网络搜索请求，调用 Dify 工作流
 * POST /api/dify/enhance
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { callDifyWorkflow, isDifyAvailable } from '@/lib/dify';
import { checkDifyAccess } from '@/lib/dify-access';
import { getEffectiveMembershipType } from '@/lib/membership-server';
import type { DifyMode } from '@/types';

// 服务端 Supabase 客户端
const getSupabase = () => createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
    try {
        // 检查 Dify API 是否可用
        if (!isDifyAvailable()) {
            return NextResponse.json(
                { success: false, error: 'Dify 服务未配置' },
                { status: 503 }
            );
        }

        // 获取用户信息
        const supabase = getSupabase();
        let userId: string | null = null;

        const authHeader = request.headers.get('authorization');
        if (authHeader) {
            const token = authHeader.replace('Bearer ', '');
            const { data: { user } } = await supabase.auth.getUser(token);
            userId = user?.id || null;
        }

        if (!userId) {
            return NextResponse.json(
                { success: false, error: '请先登录' },
                { status: 401 }
            );
        }

        // 解析 multipart/form-data
        const formData = await request.formData();
        const mode = formData.get('mode') as DifyMode | null;
        const query = formData.get('query') as string | null;
        const file = formData.get('file') as File | null;

        // 验证 mode 参数
        if (!mode || !['file', 'web', 'all'].includes(mode)) {
            return NextResponse.json(
                { success: false, error: '无效的 mode 参数' },
                { status: 400 }
            );
        }

        // 获取用户会员等级
        const membershipType = await getEffectiveMembershipType(userId);

        // 权限校验
        const accessResult = checkDifyAccess(membershipType, mode);
        if (!accessResult.allowed) {
            return NextResponse.json(
                { success: false, error: accessResult.reason, code: 'MEMBERSHIP_REQUIRED' },
                { status: 403 }
            );
        }

        // 调用 Dify 工作流
        const result = await callDifyWorkflow({
            mode,
            query: query || undefined,
            file: file || undefined,
            userId,
        });

        if (!result.success) {
            return NextResponse.json(
                { success: false, error: result.error },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            data: result.data,
        });
    } catch (error) {
        console.error('[dify/enhance] Error:', error);
        return NextResponse.json(
            { success: false, error: '服务暂时不可用' },
            { status: 500 }
        );
    }
}
