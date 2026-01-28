/**
 * 投票 API 路由
 * GET: 获取用户投票状态
 * POST: 投票（切换）- 添加错误处理
 */

import { NextRequest } from 'next/server';
import { TargetType, VoteType } from '@/lib/community';
import { getAuthContext, jsonError, jsonOk, requireUserContext, getServiceRoleClient } from '@/lib/api-utils';
import { withRetry } from '@/lib/retry';
import { missingFields, missingSearchParams } from '@/lib/validation';

export async function GET(request: NextRequest) {
    try {
        const { user } = await getAuthContext(request);
        if (!user) {
            return jsonOk({ vote: null });
        }

        const { searchParams } = new URL(request.url);
        const targetType = searchParams.get('targetType') as TargetType;
        const targetId = searchParams.get('targetId');

        if (missingSearchParams(searchParams, ['targetType', 'targetId']).length > 0) {
            return jsonError('缺少参数', 400);
        }
        // 使用 serviceClient 和重试逻辑获取投票状态
        const serviceClient = getServiceRoleClient();
        const voteResult = await withRetry(async () => {
            const response = await serviceClient
                .from('community_votes')
                .select('vote_type')
                .eq('user_id', user.id)
                .eq('target_type', targetType)
                .eq('target_id', targetId)
                .maybeSingle();
            if (response.error) {
                throw response.error;
            }
            return response;
        });

        return jsonOk({ vote: voteResult.data?.vote_type || null });
    } catch (error) {
        console.error('获取投票状态失败:', error);
        return jsonError('获取投票状态失败', 500);
    }
}

export async function POST(request: NextRequest) {
    try {
        const auth = await requireUserContext(request);
        if ('error' in auth) {
            return jsonError(auth.error.message, auth.error.status);
        }
        const { user } = auth;

        const body = await request.json();
        const { targetType, targetId, voteType } = body as {
            targetType: TargetType;
            targetId: string;
            voteType: VoteType;
        };

        if (missingFields(body, ['targetType', 'targetId', 'voteType']).length > 0) {
            return jsonError('缺少参数', 400);
        }

        // 验证 targetType 和 voteType 的有效性
        if (!['post', 'comment'].includes(targetType)) {
            return jsonError('无效的目标类型', 400);
        }
        if (!['up', 'down'].includes(voteType)) {
            return jsonError('无效的投票类型', 400);
        }
        // 使用 serviceClient 和重试逻辑
        const serviceClient = getServiceRoleClient();

        // 获取现有投票
        const existingResult = await withRetry(async () => {
            const response = await serviceClient
                .from('community_votes')
                .select('*')
                .eq('user_id', user.id)
                .eq('target_type', targetType)
                .eq('target_id', targetId)
                .maybeSingle();
            if (response.error) {
                throw response.error;
            }
            return response;
        });
        const existing = existingResult.data;

        let newVote: VoteType | null = null;

        if (existing) {
            if (existing.vote_type === voteType) {
                // 取消投票
                const deleteResult = await withRetry(async () => {
                    const response = await serviceClient
                        .from('community_votes')
                        .delete()
                        .eq('id', existing.id);
                    if (response.error) {
                        throw response.error;
                    }
                    return response;
                });

                if (deleteResult.error) {
                    console.error('取消投票失败:', deleteResult.error);
                    return jsonError('取消投票失败', 500);
                }
                newVote = null;
            } else {
                // 切换投票类型
                const updateResult = await withRetry(async () => {
                    const response = await serviceClient
                        .from('community_votes')
                        .update({ vote_type: voteType })
                        .eq('id', existing.id);
                    if (response.error) {
                        throw response.error;
                    }
                    return response;
                });

                if (updateResult.error) {
                    console.error('切换投票失败:', updateResult.error);
                    return jsonError('切换投票失败', 500);
                }
                newVote = voteType;
            }
        } else {
            // 新增投票
            const insertResult = await withRetry(async () => {
                const response = await serviceClient
                    .from('community_votes')
                    .upsert({
                        user_id: user.id,
                        target_type: targetType,
                        target_id: targetId,
                        vote_type: voteType,
                    }, { onConflict: 'user_id,target_type,target_id' });
                if (response.error) {
                    throw response.error;
                }
                return response;
            });

            if (insertResult.error) {
                console.error('投票失败:', insertResult.error);
                return jsonError('投票失败', 500);
            }
            newVote = voteType;
        }

        return jsonOk({ vote: newVote });
    } catch (error) {
        console.error('投票失败:', error);
        return jsonError('投票失败', 500);
    }
}
