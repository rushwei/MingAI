/**
 * Dify 增强 API 路由
 *
 * 处理文件上传和网络搜索请求，调用 Dify 工作流
 * POST /api/dify/enhance
 */

import { NextRequest, NextResponse } from 'next/server';
import { callDifyWorkflow, isDifyAvailable } from '@/lib/dify';
import { checkDifyAccess } from '@/lib/dify-access';
import { getEffectiveMembershipType } from '@/lib/membership-server';
import type { DifyMode } from '@/types';
import { requireUserContext } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
    try {
        // 检查 Dify API 是否可用
        if (!isDifyAvailable()) {
            return NextResponse.json(
                { success: false, error: 'Dify 服务未配置' },
                { status: 503 }
            );
        }

        const auth = await requireUserContext(request);
        if ('error' in auth) {
            return NextResponse.json(
                { success: false, error: auth.error.message },
                { status: auth.error.status }
            );
        }
        const userId = auth.user.id;

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
