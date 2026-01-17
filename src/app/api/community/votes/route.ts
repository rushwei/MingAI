/**
 * 投票 API 路由
 * GET: 获取用户投票状态
 * POST: 投票（切换）- 添加错误处理
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { TargetType, VoteType } from '@/lib/community';

async function createSupabaseClient() {
    const cookieStore = await cookies();
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
            },
        }
    );
}

export async function GET(request: NextRequest) {
    try {
        const supabase = await createSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ vote: null });
        }

        const { searchParams } = new URL(request.url);
        const targetType = searchParams.get('targetType') as TargetType;
        const targetId = searchParams.get('targetId');

        if (!targetType || !targetId) {
            return NextResponse.json({ error: '缺少参数' }, { status: 400 });
        }

        const { data } = await supabase
            .from('community_votes')
            .select('vote_type')
            .eq('user_id', user.id)
            .eq('target_type', targetType)
            .eq('target_id', targetId)
            .single();

        return NextResponse.json({ vote: data?.vote_type || null });
    } catch (error) {
        console.error('获取投票状态失败:', error);
        return NextResponse.json({ error: '获取投票状态失败' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const supabase = await createSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: '请先登录' }, { status: 401 });
        }

        const body = await request.json();
        const { targetType, targetId, voteType } = body as {
            targetType: TargetType;
            targetId: string;
            voteType: VoteType;
        };

        if (!targetType || !targetId || !voteType) {
            return NextResponse.json({ error: '缺少参数' }, { status: 400 });
        }

        // 验证 targetType 和 voteType 的有效性
        if (!['post', 'comment'].includes(targetType)) {
            return NextResponse.json({ error: '无效的目标类型' }, { status: 400 });
        }
        if (!['up', 'down'].includes(voteType)) {
            return NextResponse.json({ error: '无效的投票类型' }, { status: 400 });
        }

        // 获取现有投票
        const { data: existing } = await supabase
            .from('community_votes')
            .select('*')
            .eq('user_id', user.id)
            .eq('target_type', targetType)
            .eq('target_id', targetId)
            .single();

        let newVote: VoteType | null = null;

        if (existing) {
            if (existing.vote_type === voteType) {
                // 取消投票
                const { error: deleteError } = await supabase
                    .from('community_votes')
                    .delete()
                    .eq('id', existing.id);

                if (deleteError) {
                    console.error('取消投票失败:', deleteError);
                    return NextResponse.json({ error: '取消投票失败' }, { status: 500 });
                }
                newVote = null;
            } else {
                // 切换投票类型
                const { error: updateError } = await supabase
                    .from('community_votes')
                    .update({ vote_type: voteType })
                    .eq('id', existing.id);

                if (updateError) {
                    console.error('切换投票失败:', updateError);
                    return NextResponse.json({ error: '切换投票失败' }, { status: 500 });
                }
                newVote = voteType;
            }
        } else {
            // 新增投票
            const { error: insertError } = await supabase.from('community_votes').insert({
                user_id: user.id,
                target_type: targetType,
                target_id: targetId,
                vote_type: voteType,
            });

            if (insertError) {
                console.error('投票失败:', insertError);
                return NextResponse.json({ error: '投票失败' }, { status: 500 });
            }
            newVote = voteType;
        }

        return NextResponse.json({ vote: newVote });
    } catch (error) {
        console.error('投票失败:', error);
        return NextResponse.json({ error: '投票失败' }, { status: 500 });
    }
}
