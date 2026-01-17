/**
 * 导入记录 API 路由
 * POST: 导入数据（覆盖模式）
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

export async function POST(request: NextRequest) {
    try {
        const supabase = await createSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: '请先登录' }, { status: 401 });
        }

        const data = await request.json();

        // 验证数据格式
        if (!data.version || !Array.isArray(data.records) || !Array.isArray(data.notes)) {
            return NextResponse.json({ error: '导入数据格式无效' }, { status: 400 });
        }

        // 删除现有数据
        await Promise.all([
            supabase.from('ming_records').delete().eq('user_id', user.id),
            supabase.from('ming_notes').delete().eq('user_id', user.id),
        ]);

        // 导入记录
        let recordsImported = 0;
        if (data.records.length > 0) {
            const recordsToInsert = data.records.map((record: Record<string, unknown>) => ({
                user_id: user.id,
                title: record.title,
                content: record.content,
                category: record.category,
                tags: record.tags,
                event_date: record.event_date,
                related_chart_type: record.related_chart_type,
                related_chart_id: record.related_chart_id,
                is_pinned: record.is_pinned,
                created_at: record.created_at,
                updated_at: record.updated_at,
            }));

            const { error } = await supabase.from('ming_records').insert(recordsToInsert);
            if (error) {
                console.error('导入记录失败:', error);
                return NextResponse.json({ error: '导入记录失败' }, { status: 500 });
            }
            recordsImported = recordsToInsert.length;
        }

        // 导入小记
        let notesImported = 0;
        if (data.notes.length > 0) {
            const notesToInsert = data.notes.map((note: Record<string, unknown>) => ({
                user_id: user.id,
                note_date: note.note_date,
                content: note.content,
                mood: note.mood,
                created_at: note.created_at,
                updated_at: note.updated_at,
            }));

            const { error } = await supabase.from('ming_notes').insert(notesToInsert);
            if (error) {
                console.error('导入小记失败:', error);
                return NextResponse.json({ error: '导入小记失败' }, { status: 500 });
            }
            notesImported = notesToInsert.length;
        }

        return NextResponse.json({
            message: `成功导入 ${recordsImported} 条记录和 ${notesImported} 条小记`,
            recordsImported,
            notesImported,
        });
    } catch (error) {
        console.error('导入数据失败:', error);
        return NextResponse.json({ error: '导入数据失败' }, { status: 500 });
    }
}
