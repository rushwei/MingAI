/**
 * 小记 API 路由
 * GET: 获取小记列表
 * POST: 创建小记
 * DELETE: 删除小记
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthContext } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
    try {
        const { supabase, user } = await getAuthContext(request);
        if (!user) {
            return NextResponse.json({ error: '请先登录' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date');

        let query = supabase
            .from('ming_notes')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (date) {
            query = query.eq('note_date', date);
        }

        const { data, error } = await query;

        if (error) {
            console.error('获取小记失败:', error);
            return NextResponse.json({ error: '获取小记失败' }, { status: 500 });
        }

        return NextResponse.json({ notes: data });
    } catch (error) {
        console.error('获取小记失败:', error);
        return NextResponse.json({ error: '获取小记失败' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { supabase, user } = await getAuthContext(request);
        if (!user) {
            return NextResponse.json({ error: '请先登录' }, { status: 401 });
        }

        const body = await request.json();

        if (!body.content) {
            return NextResponse.json({ error: '内容不能为空' }, { status: 400 });
        }

        const { data, error } = await supabase
            .from('ming_notes')
            .insert({
                user_id: user.id,
                note_date: body.note_date || new Date().toISOString().split('T')[0],
                content: body.content,
                mood: body.mood || null,
            })
            .select()
            .single();

        if (error) {
            console.error('创建小记失败:', error);
            return NextResponse.json({ error: '创建小记失败' }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('创建小记失败:', error);
        return NextResponse.json({ error: '创建小记失败' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest) {
    try {
        const { supabase, user } = await getAuthContext(request);
        if (!user) {
            return NextResponse.json({ error: '请先登录' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: '缺少 id 参数' }, { status: 400 });
        }

        const { error } = await supabase
            .from('ming_notes')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

        if (error) {
            console.error('删除小记失败:', error);
            return NextResponse.json({ error: '删除小记失败' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('删除小记失败:', error);
        return NextResponse.json({ error: '删除小记失败' }, { status: 500 });
    }
}
