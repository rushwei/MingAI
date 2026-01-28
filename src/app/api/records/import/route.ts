/**
 * 导入记录 API 路由
 * POST: 导入数据（覆盖模式）
 */

import { NextRequest } from 'next/server';
import { getAuthContext, jsonError, jsonOk } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
    try {
        const { supabase, user } = await getAuthContext(request);
        if (!user) return jsonError('请先登录', 401);

        const data = await request.json();

        // 验证数据格式
        if (!data.version || !Array.isArray(data.records) || !Array.isArray(data.notes)) {
            return jsonError('导入数据格式无效', 400);
        }

        // 备份现有数据，便于失败时回滚
        const [recordsBackupResult, notesBackupResult] = await Promise.all([
            supabase.from('ming_records').select('*').eq('user_id', user.id),
            supabase.from('ming_notes').select('*').eq('user_id', user.id),
        ]);

        if (recordsBackupResult.error || notesBackupResult.error) {
            console.error('导入数据备份失败:', recordsBackupResult.error || notesBackupResult.error);
            return jsonError('导入数据失败', 500);
        }

        const backupRecords = recordsBackupResult.data || [];
        const backupNotes = notesBackupResult.data || [];

        // 删除现有数据
        const [deleteRecordsResult, deleteNotesResult] = await Promise.all([
            supabase.from('ming_records').delete().eq('user_id', user.id),
            supabase.from('ming_notes').delete().eq('user_id', user.id),
        ]);

        if (deleteRecordsResult.error || deleteNotesResult.error) {
            console.error('清理旧数据失败:', deleteRecordsResult.error || deleteNotesResult.error);
            return jsonError('导入数据失败', 500);
        }

        // 导入记录
        let recordsImported = 0;
        let notesImported = 0;
        let importError: 'records' | 'notes' | null = null;

        try {
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
                    importError = 'records';
                    throw error;
                }
                recordsImported = recordsToInsert.length;
            }

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
                    importError = 'notes';
                    throw error;
                }
                notesImported = notesToInsert.length;
            }
        } catch {
            // 回滚：恢复原有数据
            try {
                await Promise.all([
                    supabase.from('ming_records').delete().eq('user_id', user.id),
                    supabase.from('ming_notes').delete().eq('user_id', user.id),
                ]);
                if (backupRecords.length > 0) {
                    await supabase.from('ming_records').insert(backupRecords);
                }
                if (backupNotes.length > 0) {
                    await supabase.from('ming_notes').insert(backupNotes);
                }
            } catch (restoreError) {
                console.error('导入回滚失败:', restoreError);
            }

            if (importError === 'notes') {
                return jsonError('导入小记失败', 500);
            }
            return jsonError('导入记录失败', 500);
        }

        return jsonOk({
            message: `成功导入 ${recordsImported} 条记录和 ${notesImported} 条小记`,
            recordsImported,
            notesImported,
        });
    } catch (error) {
        console.error('导入数据失败:', error);
        return jsonError('导入数据失败', 500);
    }
}
