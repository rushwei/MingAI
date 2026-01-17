/**
 * 命理记录服务
 * 
 * 提供命理记录和小记的 CRUD 操作、搜索和导入导出功能
 */

import { supabase } from './supabase';

// =====================================================
// 类型定义
// =====================================================

export type RecordCategory = 'general' | 'prediction' | 'event' | 'reflection';

export type NoteMood = 'happy' | 'neutral' | 'sad' | 'anxious' | 'peaceful';

export interface MingRecord {
    id: string;
    user_id: string;
    title: string;
    content: string | null;
    category: RecordCategory;
    tags: string[];
    event_date: string | null;
    related_chart_type: string | null;
    related_chart_id: string | null;
    is_pinned: boolean;
    created_at: string;
    updated_at: string;
}

export interface MingNote {
    id: string;
    user_id: string;
    note_date: string;
    content: string;
    mood: NoteMood | null;
    created_at: string;
    updated_at: string;
}

export interface RecordInput {
    title: string;
    content?: string;
    category?: RecordCategory;
    tags?: string[];
    event_date?: string;
    related_chart_type?: string;
    related_chart_id?: string;
    is_pinned?: boolean;
}

export interface NoteInput {
    note_date?: string;
    content: string;
    mood?: NoteMood;
}

export interface RecordFilters {
    category?: RecordCategory;
    search?: string;
    startDate?: string;
    endDate?: string;
    tags?: string[];
    isPinned?: boolean;
}

export interface ExportData {
    version: string;
    exportedAt: string;
    records: MingRecord[];
    notes: MingNote[];
}

// =====================================================
// 记录分类配置
// =====================================================

export const RECORD_CATEGORIES: { value: RecordCategory; label: string; icon: string }[] = [
    { value: 'general', label: '通用', icon: '📝' },
    { value: 'prediction', label: '预测验证', icon: '🔮' },
    { value: 'event', label: '人生事件', icon: '📅' },
    { value: 'reflection', label: '心得反思', icon: '💭' },
];

export const NOTE_MOODS: { value: NoteMood; label: string; icon: string }[] = [
    { value: 'happy', label: '开心', icon: '😊' },
    { value: 'neutral', label: '平静', icon: '😐' },
    { value: 'sad', label: '难过', icon: '😢' },
    { value: 'anxious', label: '焦虑', icon: '😰' },
    { value: 'peaceful', label: '安宁', icon: '🧘' },
];

// =====================================================
// 记录 CRUD 操作
// =====================================================

/**
 * 获取记录列表
 */
export async function getRecords(
    userId: string,
    filters?: RecordFilters,
    page: number = 1,
    pageSize: number = 20
): Promise<{ records: MingRecord[]; total: number }> {
    let query = supabase
        .from('ming_records')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('is_pinned', { ascending: false })
        .order('created_at', { ascending: false });

    // 应用筛选条件
    if (filters?.category) {
        query = query.eq('category', filters.category);
    }
    if (filters?.isPinned !== undefined) {
        query = query.eq('is_pinned', filters.isPinned);
    }
    if (filters?.startDate) {
        query = query.gte('event_date', filters.startDate);
    }
    if (filters?.endDate) {
        query = query.lte('event_date', filters.endDate);
    }
    if (filters?.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
    }
    if (filters?.search) {
        query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
    }

    // 分页
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
        console.error('获取记录失败:', error);
        throw new Error('获取记录失败');
    }

    return {
        records: data as MingRecord[],
        total: count || 0,
    };
}

/**
 * 获取单条记录
 */
export async function getRecord(recordId: string): Promise<MingRecord | null> {
    const { data, error } = await supabase
        .from('ming_records')
        .select('*')
        .eq('id', recordId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        console.error('获取记录失败:', error);
        throw new Error('获取记录失败');
    }

    return data as MingRecord;
}

/**
 * 创建记录
 */
export async function createRecord(userId: string, input: RecordInput): Promise<MingRecord> {
    const { data, error } = await supabase
        .from('ming_records')
        .insert({
            user_id: userId,
            title: input.title,
            content: input.content,
            category: input.category || 'general',
            tags: input.tags || [],
            event_date: input.event_date,
            related_chart_type: input.related_chart_type,
            related_chart_id: input.related_chart_id,
            is_pinned: input.is_pinned || false,
        })
        .select()
        .single();

    if (error) {
        console.error('创建记录失败:', error);
        throw new Error('创建记录失败');
    }

    return data as MingRecord;
}

/**
 * 更新记录
 */
export async function updateRecord(recordId: string, input: Partial<RecordInput>): Promise<MingRecord> {
    const { data, error } = await supabase
        .from('ming_records')
        .update({
            ...input,
            updated_at: new Date().toISOString(),
        })
        .eq('id', recordId)
        .select()
        .single();

    if (error) {
        console.error('更新记录失败:', error);
        throw new Error('更新记录失败');
    }

    return data as MingRecord;
}

/**
 * 删除记录
 */
export async function deleteRecord(recordId: string): Promise<void> {
    const { error } = await supabase
        .from('ming_records')
        .delete()
        .eq('id', recordId);

    if (error) {
        console.error('删除记录失败:', error);
        throw new Error('删除记录失败');
    }
}

/**
 * 切换记录置顶状态
 */
export async function toggleRecordPin(recordId: string): Promise<MingRecord> {
    const record = await getRecord(recordId);
    if (!record) {
        throw new Error('记录不存在');
    }

    return updateRecord(recordId, { is_pinned: !record.is_pinned });
}

// =====================================================
// 小记 CRUD 操作
// =====================================================

/**
 * 获取小记列表
 */
export async function getNotes(
    userId: string,
    startDate?: string,
    endDate?: string,
    page: number = 1,
    pageSize: number = 20
): Promise<{ notes: MingNote[]; total: number }> {
    let query = supabase
        .from('ming_notes')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('note_date', { ascending: false })
        .order('created_at', { ascending: false });

    if (startDate) {
        query = query.gte('note_date', startDate);
    }
    if (endDate) {
        query = query.lte('note_date', endDate);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
        console.error('获取小记失败:', error);
        throw new Error('获取小记失败');
    }

    return {
        notes: data as MingNote[],
        total: count || 0,
    };
}

/**
 * 获取某日的小记
 */
export async function getNotesByDate(userId: string, date: string): Promise<MingNote[]> {
    const { data, error } = await supabase
        .from('ming_notes')
        .select('*')
        .eq('user_id', userId)
        .eq('note_date', date)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('获取小记失败:', error);
        throw new Error('获取小记失败');
    }

    return data as MingNote[];
}

/**
 * 创建小记
 */
export async function createNote(userId: string, input: NoteInput): Promise<MingNote> {
    const { data, error } = await supabase
        .from('ming_notes')
        .insert({
            user_id: userId,
            note_date: input.note_date || new Date().toISOString().split('T')[0],
            content: input.content,
            mood: input.mood,
        })
        .select()
        .single();

    if (error) {
        console.error('创建小记失败:', error);
        throw new Error('创建小记失败');
    }

    return data as MingNote;
}

/**
 * 更新小记
 */
export async function updateNote(noteId: string, input: Partial<NoteInput>): Promise<MingNote> {
    const { data, error } = await supabase
        .from('ming_notes')
        .update({
            ...input,
            updated_at: new Date().toISOString(),
        })
        .eq('id', noteId)
        .select()
        .single();

    if (error) {
        console.error('更新小记失败:', error);
        throw new Error('更新小记失败');
    }

    return data as MingNote;
}

/**
 * 删除小记
 */
export async function deleteNote(noteId: string): Promise<void> {
    const { error } = await supabase
        .from('ming_notes')
        .delete()
        .eq('id', noteId);

    if (error) {
        console.error('删除小记失败:', error);
        throw new Error('删除小记失败');
    }
}

// =====================================================
// 导入导出功能
// =====================================================

/**
 * 导出所有数据
 */
export async function exportData(userId: string): Promise<ExportData> {
    const [recordsResult, notesResult] = await Promise.all([
        supabase.from('ming_records').select('*').eq('user_id', userId),
        supabase.from('ming_notes').select('*').eq('user_id', userId),
    ]);

    if (recordsResult.error || notesResult.error) {
        throw new Error('导出数据失败');
    }

    return {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        records: recordsResult.data as MingRecord[],
        notes: notesResult.data as MingNote[],
    };
}

/**
 * 导入数据（覆盖模式）
 */
export async function importData(userId: string, data: ExportData): Promise<{ recordsImported: number; notesImported: number }> {
    // 验证数据格式
    if (!data.version || !Array.isArray(data.records) || !Array.isArray(data.notes)) {
        throw new Error('导入数据格式无效');
    }

    // 删除现有数据
    await Promise.all([
        supabase.from('ming_records').delete().eq('user_id', userId),
        supabase.from('ming_notes').delete().eq('user_id', userId),
    ]);

    // 导入记录
    let recordsImported = 0;
    if (data.records.length > 0) {
        const recordsToInsert = data.records.map(record => ({
            user_id: userId,
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
        if (error) throw new Error('导入记录失败');
        recordsImported = recordsToInsert.length;
    }

    // 导入小记
    let notesImported = 0;
    if (data.notes.length > 0) {
        const notesToInsert = data.notes.map(note => ({
            user_id: userId,
            note_date: note.note_date,
            content: note.content,
            mood: note.mood,
            created_at: note.created_at,
            updated_at: note.updated_at,
        }));

        const { error } = await supabase.from('ming_notes').insert(notesToInsert);
        if (error) throw new Error('导入小记失败');
        notesImported = notesToInsert.length;
    }

    return { recordsImported, notesImported };
}

/**
 * 备份数据（下载JSON文件）
 */
export function downloadExportData(data: ExportData, filename?: string): void {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename || `mingai-records-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * 读取导入文件
 */
export function readImportFile(file: File): Promise<ExportData> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);
                resolve(data);
            } catch {
                reject(new Error('文件解析失败，请确保文件是有效的JSON格式'));
            }
        };
        reader.onerror = () => reject(new Error('文件读取失败'));
        reader.readAsText(file);
    });
}
