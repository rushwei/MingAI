/**
 * 单个评论 API 路由
 * PUT: 更新评论
 * DELETE: 删除评论（软删除）
 */

import { NextRequest } from 'next/server';
import { getAuthContext, jsonError, jsonOk, requireUserContext, getSystemAdminClient } from '@/lib/api-utils';
import { withRetry } from '@/lib/retry';
import { hasNonEmptyStrings } from '@/lib/validation';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { user } = await getAuthContext(request);
        if (!user) {
            return jsonError('请先登录', 401);
        }

        const { id } = await params;
        const serviceClient = getSystemAdminClient();
        const { data, error } = await serviceClient
            .from('community_comments')
            .select('id, user_id')
            .eq('id', id)
            .eq('is_deleted', false)
            .maybeSingle();

        if (error) {
            console.error('获取评论失败:', error);
            return jsonError('获取评论失败', 500);
        }
        if (!data) {
            return jsonError('评论不存在', 404);
        }

        const isAuthor = data.user_id === user.id;
        return jsonOk({
            viewer: {
                isAuthenticated: true,
                isAuthor,
                canEdit: isAuthor,
                canDelete: isAuthor,
            },
        });
    } catch (error) {
        console.error('获取评论失败:', error);
        return jsonError('获取评论失败', 500);
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireUserContext(request);
        if ('error' in auth) {
            return jsonError(auth.error.message, auth.error.status);
        }
        const { user } = auth;

        const { id } = await params;
        const body = await request.json();

        if (!hasNonEmptyStrings(body, ['content'])) {
            return jsonError('内容不能为空', 400);
        }

        // 使用 serviceClient 绕过 RLS
        const serviceClient = getSystemAdminClient();

        // 先验证用户是否是评论作者
        const checkResult = await withRetry(async () => {
            const response = await serviceClient
                .from('community_comments')
                .select('user_id')
                .eq('id', id)
                .single();
            if (response.error) {
                throw response.error;
            }
            return response;
        });

        if (checkResult.error || checkResult.data?.user_id !== user.id) {
            return jsonError('无权限编辑此评论', 403);
        }

        const updateResult = await withRetry(async () => {
            const response = await serviceClient
                .from('community_comments')
                .update({
                    content: body.content,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id)
                .select()
                .single();
            if (response.error) {
                throw response.error;
            }
            return response;
        });

        if (updateResult.error) {
            console.error('更新评论失败:', updateResult.error);
            return jsonError('更新评论失败', 500);
        }

        const data = updateResult.data as Record<string, unknown> | null;
        const safeComment = { ...(data || {}) } as Record<string, unknown>;
        delete (safeComment as { user_id?: unknown }).user_id;
        return jsonOk(safeComment);
    } catch (error) {
        console.error('更新评论失败:', error);
        return jsonError('更新评论失败', 500);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const auth = await requireUserContext(request);
        if ('error' in auth) {
            return jsonError(auth.error.message, auth.error.status);
        }
        const { user } = auth;

        const { id } = await params;

        // 使用 serviceClient 绕过 RLS
        const serviceClient = getSystemAdminClient();

        // 先验证用户是否是评论作者
        const checkResult = await withRetry(async () => {
            const response = await serviceClient
                .from('community_comments')
                .select('user_id')
                .eq('id', id)
                .single();
            if (response.error) {
                throw response.error;
            }
            return response;
        });

        if (checkResult.error || checkResult.data?.user_id !== user.id) {
            return jsonError('无权限删除此评论', 403);
        }

        const deleteResult = await withRetry(async () => {
            const response = await serviceClient
                .from('community_comments')
                .update({ is_deleted: true, updated_at: new Date().toISOString() })
                .eq('id', id);
            if (response.error) {
                throw response.error;
            }
            return response;
        });

        if (deleteResult.error) {
            console.error('删除评论失败:', deleteResult.error);
            return jsonError('删除评论失败', 500);
        }

        return jsonOk({ success: true });
    } catch (error) {
        console.error('删除评论失败:', error);
        return jsonError('删除评论失败', 500);
    }
}
