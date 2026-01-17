/**
 * 导出记录 API 路由
 * GET: 导出所有数据
 */

import { NextResponse } from 'next/server';
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

export async function GET() {
    try {
        const supabase = await createSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: '请先登录' }, { status: 401 });
        }

        // 获取所有记录和小记
        const [recordsResult, notesResult] = await Promise.all([
            supabase.from('ming_records').select('*').eq('user_id', user.id),
            supabase.from('ming_notes').select('*').eq('user_id', user.id),
        ]);

        if (recordsResult.error || notesResult.error) {
            console.error('导出数据失败:', recordsResult.error || notesResult.error);
            return NextResponse.json({ error: '导出数据失败' }, { status: 500 });
        }

        const exportData = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            records: recordsResult.data,
            notes: notesResult.data,
        };

        const json = JSON.stringify(exportData, null, 2);
        const filename = `mingai-records-${new Date().toISOString().split('T')[0]}.json`;

        return new NextResponse(json, {
            headers: {
                'Content-Type': 'application/json',
                'Content-Disposition': `attachment; filename="${filename}"`,
            },
        });
    } catch (error) {
        console.error('导出数据失败:', error);
        return NextResponse.json({ error: '导出数据失败' }, { status: 500 });
    }
}
