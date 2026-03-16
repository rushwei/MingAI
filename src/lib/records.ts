/**
 * 命理记录服务
 *
 * 浏览器侧统一通过 records/notes API 访问数据。
 */

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
    is_archived?: boolean;
    archived_kb_ids?: string[] | null;
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

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
    const response = await fetch(input, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(init?.headers || {}),
        },
        ...init,
    });

    const payload = await response.json().catch(() => null) as T | { error?: string } | null;
    if (!response.ok) {
        throw new Error((payload as { error?: string } | null)?.error || '请求失败');
    }

    return payload as T;
}

// =====================================================
// 类型守卫
// =====================================================

/**
 * 验证是否为有效的 MingRecord 对象
 */
function isValidMingRecord(data: unknown): data is MingRecord {
    if (!data || typeof data !== 'object') return false;
    const obj = data as Record<string, unknown>;
    return (
        typeof obj.id === 'string' &&
        typeof obj.user_id === 'string' &&
        typeof obj.title === 'string' &&
        typeof obj.created_at === 'string'
    );
}

/**
 * 验证是否为有效的 MingNote 对象
 */
function isValidMingNote(data: unknown): data is MingNote {
    if (!data || typeof data !== 'object') return false;
    const obj = data as Record<string, unknown>;
    return (
        typeof obj.id === 'string' &&
        typeof obj.user_id === 'string' &&
        typeof obj.content === 'string' &&
        typeof obj.created_at === 'string'
    );
}

/**
 * 安全地将数据转换为 MingRecord
 */
function toMingRecord(data: unknown): MingRecord | null {
    return isValidMingRecord(data) ? data : null;
}

/**
 * 安全地将数据转换为 MingNote
 */
function toMingNote(data: unknown): MingNote | null {
    return isValidMingNote(data) ? data : null;
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
    void userId;

    const query = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
    });
    if (filters?.category) query.set('category', filters.category);
    if (filters?.search) query.set('search', filters.search);
    if (filters?.startDate) query.set('startDate', filters.startDate);
    if (filters?.endDate) query.set('endDate', filters.endDate);
    if (filters?.isPinned !== undefined) query.set('isPinned', String(filters.isPinned));
    for (const tag of filters?.tags || []) {
        query.append('tag', tag);
    }

    const payload = await requestJson<{ records?: unknown[]; total?: number }>(`/api/records?${query.toString()}`);
    const validRecords = (payload.records ?? []).filter(isValidMingRecord);
    return {
        records: validRecords,
        total: payload.total || 0,
    };
}

/**
 * 获取单条记录
 */
export async function getRecord(recordId: string): Promise<MingRecord | null> {
    try {
        const payload = await requestJson<unknown>(`/api/records/${recordId}`);
        const record = toMingRecord(payload);
        if (!record) throw new Error('Invalid record data');
        return record;
    } catch (error) {
        if (error instanceof Error && /不存在|404/u.test(error.message)) {
            return null;
        }
        throw error;
    }
}

/**
 * 创建记录
 */
export async function createRecord(userId: string, input: RecordInput): Promise<MingRecord> {
    void userId;

    const payload = await requestJson<unknown>('/api/records', {
        method: 'POST',
        body: JSON.stringify(input),
    });
    const record = toMingRecord(payload);
    if (!record) throw new Error('Invalid record data');
    return record;
}

/**
 * 更新记录
 */
export async function updateRecord(recordId: string, input: Partial<RecordInput>): Promise<MingRecord> {
    const payload = await requestJson<unknown>(`/api/records/${recordId}`, {
        method: 'PUT',
        body: JSON.stringify(input),
    });
    const record = toMingRecord(payload);
    if (!record) throw new Error('Invalid record data');
    return record;
}

/**
 * 删除记录
 */
export async function deleteRecord(recordId: string): Promise<void> {
    await requestJson(`/api/records/${recordId}`, {
        method: 'DELETE',
    });
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
    void userId;

    const query = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
    });
    if (startDate) query.set('startDate', startDate);
    if (endDate) query.set('endDate', endDate);

    const payload = await requestJson<{ notes?: unknown[]; total?: number }>(`/api/notes?${query.toString()}`);
    const validNotes = (payload.notes ?? []).filter(isValidMingNote);
    return {
        notes: validNotes,
        total: payload.total || 0,
    };
}

/**
 * 获取某日的小记
 */
export async function getNotesByDate(userId: string, date: string): Promise<MingNote[]> {
    void userId;

    const payload = await requestJson<{ notes?: unknown[] }>(`/api/notes?date=${encodeURIComponent(date)}`);
    return (payload.notes ?? []).filter(isValidMingNote);
}

/**
 * 创建小记
 */
export async function createNote(userId: string, input: NoteInput): Promise<MingNote> {
    void userId;

    const payload = await requestJson<unknown>('/api/notes', {
        method: 'POST',
        body: JSON.stringify(input),
    });
    const note = toMingNote(payload);
    if (!note) throw new Error('Invalid note data');
    return note;
}

/**
 * 更新小记
 */
export async function updateNote(noteId: string, input: Partial<NoteInput>): Promise<MingNote> {
    const payload = await requestJson<unknown>(`/api/notes/${noteId}`, {
        method: 'PUT',
        body: JSON.stringify(input),
    });
    const note = toMingNote(payload);
    if (!note) throw new Error('Invalid note data');
    return note;
}

/**
 * 删除小记
 */
export async function deleteNote(noteId: string): Promise<void> {
    await requestJson(`/api/notes/${noteId}`, {
        method: 'DELETE',
    });
}

// =====================================================
// 导入导出功能
// =====================================================

/**
 * 导出所有数据
 */
export async function exportData(userId: string): Promise<ExportData> {
    void userId;

    const response = await fetch('/api/records/export', {
        credentials: 'include',
    });
    if (!response.ok) {
        throw new Error('导出数据失败');
    }

    const payload = await response.json() as ExportData;
    return {
        ...payload,
        records: (payload.records ?? []).filter(isValidMingRecord),
        notes: (payload.notes ?? []).filter(isValidMingNote),
    };
}

/**
 * 导入数据（覆盖模式）
 */
export async function importData(userId: string, data: ExportData): Promise<{ recordsImported: number; notesImported: number }> {
    void userId;

    const payload = await requestJson<{ recordsImported: number; notesImported: number }>('/api/records/import', {
        method: 'POST',
        body: JSON.stringify(data),
    });

    return payload;
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
