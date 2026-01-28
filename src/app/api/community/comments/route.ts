/**
 * 评论 API 路由
 * POST: 创建评论
 */

import { NextRequest } from 'next/server';
import { jsonError, jsonOk, requireUserContext, getServiceRoleClient } from '@/lib/api-utils';
import { withRetry } from '@/lib/retry';
import { hasNonEmptyStrings } from '@/lib/validation';

export async function POST(request: NextRequest) {
    try {
        const auth = await requireUserContext(request);
        if ('error' in auth) {
            return jsonError(auth.error.message, auth.error.status);
        }
        const { user } = auth;

        const body = await request.json();

        if (!hasNonEmptyStrings(body, ['post_id', 'content'])) {
            return jsonError('帖子ID和内容不能为空', 400);
        }

        // 使用 serviceClient 和重试逻辑
        const serviceClient = getServiceRoleClient();

        // 获取或创建匿名映射
        let anonymousName = '匿名用户';

        // 先查找现有映射
        const existingResult = await withRetry(async () => {
            const response = await serviceClient
                .from('community_anonymous_mapping')
                .select('anonymous_name')
                .eq('post_id', body.post_id)
                .eq('user_id', user.id)
                .maybeSingle();
            if (response.error) {
                throw response.error;
            }
            return response;
        });

        if (existingResult.data) {
            anonymousName = existingResult.data.anonymous_name;
        } else {
            const { data: settings } = await serviceClient
                .from('user_settings')
                .select('community_anonymous_name')
                .eq('user_id', user.id)
                .maybeSingle();
            const preferredName = typeof settings?.community_anonymous_name === 'string'
                ? settings.community_anonymous_name.trim()
                : '';
            // 获取当前帖子的最大序号
            const maxOrderResult = await withRetry(async () => {
                const response = await serviceClient
                    .from('community_anonymous_mapping')
                    .select('display_order')
                    .eq('post_id', body.post_id)
                    .order('display_order', { ascending: false })
                    .limit(1)
                    .maybeSingle();
                if (response.error) {
                    throw response.error;
                }
                return response;
            });

            const nextOrder = (maxOrderResult.data?.display_order || 0) + 1;
            anonymousName = preferredName || `匿名用户${String.fromCharCode(64 + nextOrder)}`;

            // 创建映射
            await withRetry(async () => {
                const response = await serviceClient
                    .from('community_anonymous_mapping')
                    .insert({
                        post_id: body.post_id,
                        user_id: user.id,
                        anonymous_name: anonymousName,
                        display_order: nextOrder,
                    });
                if (response.error) {
                    throw response.error;
                }
                return response;
            });
        }

        // 创建评论
        const commentResult = await withRetry(async () => {
            const response = await serviceClient
                .from('community_comments')
                .insert({
                    post_id: body.post_id,
                    user_id: user.id,
                    parent_id: body.parent_id || null,
                    content: body.content,
                })
                .select()
                .single();
            if (response.error) {
                throw response.error;
            }
            return response;
        });

        if (commentResult.error) {
            console.error('创建评论失败:', commentResult.error);
            return jsonError('创建评论失败', 500);
        }

        const data = commentResult.data as Record<string, unknown> | null;
        const safeComment = { ...(data || {}) } as Record<string, unknown>;
        delete (safeComment as { user_id?: unknown }).user_id;
        return jsonOk({
            ...safeComment,
            anonymous_name: anonymousName,
        });
    } catch (error) {
        console.error('创建评论失败:', error);
        return jsonError('创建评论失败', 500);
    }
}
