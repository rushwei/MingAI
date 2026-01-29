'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Plus,
    Search,
    Download,
    Upload,
    Pin,
    Archive,
    Trash2,
    Edit2,
    Calendar,
    Filter,
    FileText,
    BookOpen,
    BookOpenText,
    ChevronLeft,
    ChevronRight,
    X,
} from 'lucide-react';
import {
    MingRecord,
    MingNote,
    RecordCategory,
    RECORD_CATEGORIES,
    NOTE_MOODS,
    NoteMood
} from '@/lib/records';
import { supabase } from '@/lib/supabase';
import { LoginOverlay } from '@/components/auth/LoginOverlay';

// =====================================================
// 记录卡片组件
// =====================================================
function RecordCard({
    record,
    onEdit,
    onDelete,
    onTogglePin,
    onAddToKnowledgeBase
}: {
    record: MingRecord;
    onEdit: () => void;
    onDelete: () => void;
    onTogglePin: () => void;
    onAddToKnowledgeBase: () => void;
}) {
    const categoryInfo = RECORD_CATEGORIES.find(c => c.value === record.category);

    return (
        <div className={`group bg-background-secondary/40 backdrop-blur-sm rounded-xl p-5 border transition-all duration-300 ${record.is_pinned
            ? 'border-yellow-500/30 bg-yellow-500/5 shadow-[0_0_15px_-3px_rgba(234,179,8,0.1)]'
            : 'border-border/50 hover:border-emerald-500/30 hover:bg-background-secondary/60 hover:shadow-lg hover:shadow-emerald-500/5'
            }`}>
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                        {record.is_pinned && (
                            <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-yellow-600 dark:text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">
                                <Pin className="w-3 h-3" /> 置顶
                            </span>
                        )}
                        {record.is_archived && (
                            <span
                                className="flex items-center gap-1 text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20"
                                title={
                                    Array.isArray(record.archived_kb_ids) && record.archived_kb_ids.length
                                        ? `已归档到 ${record.archived_kb_ids.length} 个知识库`
                                        : '已归档到知识库'
                                }
                            >
                                <Archive className="w-3 h-3" /> 归档
                            </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full border flex items-center gap-1.5 ${record.is_pinned
                            ? 'text-yellow-600 dark:text-yellow-500 border-yellow-500/20 bg-yellow-500/5'
                            : 'text-foreground-secondary border-border/50 bg-background/50'
                            }`}>
                            {categoryInfo?.icon} {categoryInfo?.label}
                        </span>
                        {record.event_date && (
                            <span className="text-xs text-foreground-secondary/70 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {record.event_date}
                            </span>
                        )}
                    </div>

                    <h3 className="font-bold text-lg text-foreground mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
                        {record.title}
                    </h3>

                    {record.content && (
                        <p className="text-sm text-foreground-secondary/80 leading-relaxed line-clamp-2 mb-3">
                            {record.content}
                        </p>
                    )}

                    {record.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            {record.tags.slice(0, 3).map((tag, i) => (
                                <span key={i} className="text-xs px-2 py-0.5 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-500/10">
                                    #{tag}
                                </span>
                            ))}
                            {record.tags.length > 3 && (
                                <span className="text-xs text-foreground-secondary/50 self-center">+{record.tags.length - 3}</span>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={onTogglePin}
                        className={`p-2 rounded-lg transition-colors ${record.is_pinned
                            ? 'text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20'
                            : 'text-foreground-secondary hover:text-yellow-500 hover:bg-yellow-500/10'
                            }`}
                        title={record.is_pinned ? '取消置顶' : '置顶'}
                    >
                        <Pin className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onAddToKnowledgeBase}
                        className="p-2 text-foreground-secondary hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                        title="加入知识库"
                    >
                        <BookOpenText className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onEdit}
                        className="p-2 text-foreground-secondary hover:text-emerald-500 hover:bg-emerald-500/10 rounded-lg transition-colors"
                        title="编辑"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-2 text-foreground-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="删除"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}

// =====================================================
// 记录表单模态框
// =====================================================
function RecordFormModal({
    record,
    onClose,
    onSave
}: {
    record?: MingRecord | null;
    onClose: () => void;
    onSave: () => void;
}) {
    const [title, setTitle] = useState(record?.title || '');
    const [content, setContent] = useState(record?.content || '');
    const [category, setCategory] = useState<RecordCategory>(record?.category || 'general');
    const [eventDate, setEventDate] = useState(record?.event_date || new Date().toISOString().split('T')[0]);
    const [tagsInput, setTagsInput] = useState(record?.tags.join(', ') || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title.trim()) {
            setError('标题不能为空');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const tags = tagsInput.split(/[,，]/).map(t => t.trim()).filter(Boolean);
            const data = { title, content, category, event_date: eventDate || null, tags };

            if (record) {
                await fetch(`/api/records/${record.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
            } else {
                await fetch('/api/records', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data),
                });
            }

            onSave();
        } catch {
            setError('保存失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-background/95 backdrop-blur-xl rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="p-4 sm:p-6 border-b border-border/50 flex flex-col items-center justify-center bg-gradient-to-r from-emerald-500/5 to-teal-500/5">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 mb-3 shadow-inner">
                        {record ? <Edit2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    </div>
                    <h2 className="text-xl font-bold text-foreground">{record ? '编辑命理记录' : '新增命理感悟'}</h2>
                    <p className="text-sm text-foreground-secondary mt-1">记录当下的所思所想，积累智慧</p>
                </div>

                <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
                    {error && (
                        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground-secondary mb-1.5 ml-1">标题</label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-background-secondary/50 border border-border/50 hover:border-emerald-500/50 rounded-xl px-4 py-3 text-foreground placeholder:text-foreground-secondary/30 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                                placeholder="例如：今日八字排盘感悟..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-foreground-secondary mb-1.5 ml-1">分类</label>
                                <div className="relative">
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value as RecordCategory)}
                                        className="w-full bg-background-secondary/50 border border-border/50 hover:border-emerald-500/50 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all appearance-none cursor-pointer"
                                    >
                                        {RECORD_CATEGORIES.map(cat => (
                                            <option key={cat.value} value={cat.value}>
                                                {cat.label}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-foreground-secondary">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-foreground-secondary mb-1.5 ml-1">事件日期</label>
                                <input
                                    type="date"
                                    value={eventDate}
                                    onChange={(e) => setEventDate(e.target.value)}
                                    className="w-full bg-background-secondary/50 border border-border/50 hover:border-emerald-500/50 rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all font-sans"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground-secondary mb-1.5 ml-1">标签</label>
                            <input
                                type="text"
                                value={tagsInput}
                                onChange={(e) => setTagsInput(e.target.value)}
                                className="w-full bg-background-secondary/50 border border-border/50 hover:border-emerald-500/50 rounded-xl px-4 py-2.5 text-foreground placeholder:text-foreground-secondary/30 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                                placeholder="使用逗号分隔，例如：事业, 运势"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-foreground-secondary mb-1.5 ml-1">详情内容</label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={6}
                                className="w-full bg-background-secondary/50 border border-border/50 hover:border-emerald-500/50 rounded-xl px-4 py-3 text-foreground placeholder:text-foreground-secondary/30 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all resize-none leading-relaxed"
                                placeholder="记录详细的断语、排盘结果或心得体会..."
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-border hover:bg-background-secondary/80 text-foreground-secondary hover:text-foreground transition-all"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-xl hover:shadow-lg hover:shadow-emerald-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100"
                        >
                            {loading ? '保存中...' : '保存记录'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// =====================================================
// 小记组件
// =====================================================
// =====================================================
// 小记组件
// =====================================================
function DailyNotes({
    notes,
    onRefresh
}: {
    notes: MingNote[];
    onRefresh: () => void;
}) {
    const [content, setContent] = useState('');
    const [mood, setMood] = useState<NoteMood>('neutral');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;

        setLoading(true);
        try {
            await fetch('/api/notes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, mood }),
            });
            setContent('');
            onRefresh();
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('确定要删除这条小记吗？')) return;
        await fetch(`/api/notes?id=${id}`, { method: 'DELETE' });
        onRefresh();
    };

    return (
        <div className="bg-white/50 dark:bg-zinc-900/50 rounded-2xl p-6 border border-border/50 shadow-sm relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-emerald-500/10 transition-colors duration-700" />

            <div className="flex items-center gap-3 mb-6 relative z-10">
                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl text-emerald-600 dark:text-emerald-400">
                    <BookOpen className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-bold text-foreground">今日小记</h3>
                    <p className="text-xs text-foreground-secondary">记录当下的心情与感悟</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="mb-6 relative z-10">
                <div className="flex flex-col gap-3">
                    <div className="flex gap-2 mb-1 p-1 bg-background-secondary/50 rounded-xl w-fit">
                        {NOTE_MOODS.map(m => (
                            <button
                                key={m.value}
                                type="button"
                                onClick={() => setMood(m.value)}
                                className={`
                                    relative w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all
                                    ${mood === m.value
                                        ? 'bg-white dark:bg-zinc-800 shadow-sm scale-110 z-10 ring-1 ring-border/50'
                                        : 'hover:bg-white/50 dark:hover:bg-zinc-800/50 hover:scale-105 opacity-60 hover:opacity-100'
                                    }
                                `}
                                title={m.label}
                            >
                                <span className={`transition-transform duration-300 ${mood === m.value ? 'scale-110' : ''}`}>
                                    {m.icon}
                                </span>
                                {mood === m.value && (
                                    <span className="absolute -bottom-1 w-1 h-1 rounded-full bg-emerald-500" />
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="relative group/input">
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="写下此刻的想法..."
                            rows={2}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSubmit(e);
                                }
                            }}
                            className="w-full bg-background border border-border rounded-xl pl-4 pr-12 py-3 text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30 transition-all placeholder:text-foreground-secondary/40"
                        />
                        <button
                            type="submit"
                            disabled={loading || !content.trim()}
                            className="absolute right-3 bottom-3 p-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg shadow-md hover:shadow-lg disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center transform active:scale-95"
                            title="发送 (Enter)"
                        >
                            {loading ? (
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <ChevronRight className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                </div>
            </form>

            <div className="space-y-4 max-h-[18rem] overflow-y-auto pr-1">
                {notes.length === 0 ? (
                    <div className="text-center py-6 border-2 border-dashed border-border/50 rounded-xl bg-background-secondary/20">
                        <p className="text-foreground-secondary/60 text-sm">今天还没有记录，写点什么吧...</p>
                    </div>
                ) : (
                    <div className="relative pl-4 space-y-6 before:absolute before:left-[5px] before:top-2 before:bottom-0 before:w-px before:bg-gradient-to-b before:from-border before:to-transparent">
                        {notes.map((note, index) => {
                            const moodInfo = NOTE_MOODS.find(m => m.value === note.mood);
                            return (
                                <div key={note.id} className="relative group/item animate-fade-in-up" style={{ animationDelay: `${index * 50}ms` }}>
                                    <div className="absolute -left-[1.35rem] top-0 w-3 h-3 rounded-full bg-background border-2 border-emerald-500 z-10 shadow-[0_0_0_4px_rgba(var(--background-start-rgb),1)]" />

                                    <div className="bg-background hover:bg-background-secondary/40 border border-border/50 hover:border-emerald-500/20 rounded-xl p-3.5 transition-all duration-300 hover:shadow-sm">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1.5">
                                                    <span className="text-lg leading-none filter drop-shadow-sm transform group-hover/item:scale-110 transition-transform duration-300" title={moodInfo?.label}>
                                                        {moodInfo?.icon}
                                                    </span>
                                                    <span className="text-[10px] items-center px-1.5 py-0.5 rounded-full bg-background-secondary text-foreground-secondary border border-border/50 hidden group-hover/item:inline-flex">
                                                        {moodInfo?.label}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-foreground/90 leading-relaxed font-light break-words">
                                                    {note.content}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleDelete(note.id)}
                                                className="opacity-0 group-hover/item:opacity-100 p-1.5 text-foreground-secondary hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all scale-90 hover:scale-100"
                                                title="删除"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

// =====================================================
// 导入导出模态框
// =====================================================
function ImportExportModal({
    onClose,
    onImport
}: {
    onClose: () => void;
    onImport: () => void;
}) {
    const [importing, setImporting] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleExport = async () => {
        setExporting(true);
        setError('');
        try {
            window.open('/api/records/export', '_blank');
            setSuccess('导出成功！');
        } catch {
            setError('导出失败');
        } finally {
            setExporting(false);
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setImporting(true);
        setError('');
        setSuccess('');

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            const response = await fetch('/api/records/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            const result = await response.json();
            if (response.ok) {
                setSuccess(result.message);
                onImport();
            } else {
                setError(result.error || '导入失败');
            }
        } catch {
            setError('文件解析失败，请确保是有效的JSON文件');
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-xl w-full max-w-md border border-border">
                <div className="p-4 border-b border-border">
                    <h2 className="text-lg font-medium text-foreground">数据管理</h2>
                </div>
                <div className="p-4 space-y-4">
                    {error && (
                        <div className="text-red-400 text-sm bg-red-900/20 p-2 rounded">{error}</div>
                    )}
                    {success && (
                        <div className="text-green-400 text-sm bg-green-900/20 p-2 rounded">{success}</div>
                    )}

                    <div className="space-y-2">
                        <h3 className="font-medium text-foreground flex items-center gap-2">
                            <Download className="w-4 h-4" /> 导出数据
                        </h3>
                        <p className="text-sm text-foreground-secondary">将所有记录和小记导出为 JSON 文件</p>
                        <button
                            onClick={handleExport}
                            disabled={exporting}
                            className="w-full px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
                        >
                            {exporting ? '导出中...' : '导出数据'}
                        </button>
                    </div>

                    <div className="border-t border-border pt-4 space-y-2">
                        <h3 className="font-medium text-foreground flex items-center gap-2">
                            <Upload className="w-4 h-4" /> 导入数据
                        </h3>
                        <div className="bg-yellow-900/20 text-yellow-400 text-sm p-2 rounded">
                            ⚠️ 注意：导入将覆盖所有现有数据！
                        </div>
                        <label className="block w-full px-4 py-2 bg-background-secondary text-foreground rounded-lg hover:bg-background-tertiary transition-colors cursor-pointer text-center border border-border">
                            {importing ? '导入中...' : '选择 JSON 文件'}
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleImport}
                                disabled={importing}
                                className="hidden"
                            />
                        </label>
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 text-foreground-secondary hover:text-foreground transition-colors"
                    >
                        关闭
                    </button>
                </div>
            </div>
        </div>
    );
}

// =====================================================
// 主页面组件
// =====================================================
export default function RecordsPage() {
    const [loading, setLoading] = useState(true);
    const [records, setRecords] = useState<MingRecord[]>([]);
    const [notes, setNotes] = useState<MingNote[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState<RecordCategory | ''>('');
    const [showRecordForm, setShowRecordForm] = useState(false);
    const [editingRecord, setEditingRecord] = useState<MingRecord | null>(null);
    const [showImportExport, setShowImportExport] = useState(false);
    const [user, setUser] = useState<{ id: string } | null>(null);
    const [kbModalOpen, setKbModalOpen] = useState(false);
    const [kbLoading, setKbLoading] = useState(false);
    const [kbSaving, setKbSaving] = useState(false);
    const [kbError, setKbError] = useState<string | null>(null);
    const [kbSuccess, setKbSuccess] = useState<string | null>(null);
    const [kbList, setKbList] = useState<Array<{ id: string; name: string; description: string | null }>>([]);
    const [kbSelectedId, setKbSelectedId] = useState<string>('');
    const [kbNewName, setKbNewName] = useState('');
    const [kbTargetRecord, setKbTargetRecord] = useState<MingRecord | null>(null);

    const pageSize = 10;

    // 检查登录状态
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        checkAuth();
    }, []);

    const loadKnowledgeBases = useCallback(async () => {
        setKbLoading(true);
        setKbError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            const resp = await fetch('/api/knowledge-base', {
                headers: accessToken ? { authorization: `Bearer ${accessToken}` } : undefined
            });
            if (!resp.ok) {
                const data = await resp.json().catch(() => ({} as Record<string, unknown>));
                setKbError(typeof data.error === 'string' ? data.error : '获取知识库失败');
                setKbList([]);
                return;
            }
            const data = await resp.json() as { knowledgeBases?: Array<{ id: string; name: string; description: string | null }> };
            const list = data.knowledgeBases || [];
            setKbList(list);
            if (!kbSelectedId && list.length) {
                setKbSelectedId(list[0].id);
            }
        } catch {
            setKbError('获取知识库失败');
            setKbList([]);
        } finally {
            setKbLoading(false);
        }
    }, [kbSelectedId]);

    const openAddToKb = useCallback(async (record: MingRecord) => {
        setKbTargetRecord(record);
        setKbModalOpen(true);
        setKbSuccess(null);
        setKbError(null);
        if (!kbSelectedId) setKbSelectedId('');
        await loadKnowledgeBases();
    }, [kbSelectedId, loadKnowledgeBases]);

    const closeKbModal = useCallback(() => {
        setKbModalOpen(false);
        setKbTargetRecord(null);
        setKbError(null);
        setKbSuccess(null);
        setKbSaving(false);
        setKbNewName('');
    }, []);

    const createKnowledgeBase = useCallback(async () => {
        const name = kbNewName.trim();
        if (!name) {
            setKbError('请输入知识库名称');
            return;
        }
        setKbSaving(true);
        setKbError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            const resp = await fetch('/api/knowledge-base', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {})
                },
                body: JSON.stringify({ name })
            });
            if (!resp.ok) {
                const data = await resp.json().catch(() => ({} as Record<string, unknown>));
                setKbError(typeof data.error === 'string' ? data.error : '创建知识库失败');
                return;
            }
            const created = await resp.json() as { id: string };
            setKbNewName('');
            setKbSelectedId(created.id);
            await loadKnowledgeBases();
        } catch {
            setKbError('创建知识库失败');
        } finally {
            setKbSaving(false);
        }
    }, [kbNewName, loadKnowledgeBases]);

    const ingestRecordToKb = useCallback(async () => {
        if (!kbTargetRecord) return;
        if (!kbSelectedId) {
            setKbError('请选择知识库');
            return;
        }
        setKbSaving(true);
        setKbError(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            const resp = await fetch('/api/knowledge-base/ingest', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {})
                },
                body: JSON.stringify({
                    kbId: kbSelectedId,
                    sourceType: 'record',
                    sourceId: kbTargetRecord.id
                })
            });
            if (!resp.ok) {
                const data = await resp.json().catch(() => ({} as Record<string, unknown>));
                setKbError(typeof data.error === 'string' ? data.error : '加入知识库失败');
                return;
            }
            setKbSuccess('已加入知识库');
            closeKbModal();
        } catch {
            setKbError('加入知识库失败');
        } finally {
            setKbSaving(false);
        }
    }, [closeKbModal, kbSelectedId, kbTargetRecord]);

    // 加载记录
    const loadRecords = useCallback(async () => {
        if (!user) return; // 未登录时不加载
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                pageSize: String(pageSize),
            });
            if (search) params.set('search', search);
            if (category) params.set('category', category);

            const response = await fetch(`/api/records?${params}`);
            if (response.ok) {
                const data = await response.json();
                setRecords(data.records);
                setTotal(data.total);
            }
        } finally {
            setLoading(false);
        }
    }, [page, search, category, user]);

    // 加载今日小记
    const loadNotes = useCallback(async () => {
        if (!user) return; // 未登录时不加载
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`/api/notes?date=${today}`);
        if (response.ok) {
            const data = await response.json();
            setNotes(data.notes);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            loadRecords();
            loadNotes();
        }
    }, [user, loadRecords, loadNotes]);

    const handleDelete = async (id: string) => {
        if (!confirm('确定要删除这条记录吗？')) return;
        await fetch(`/api/records/${id}`, { method: 'DELETE' });
        loadRecords();
    };

    const handleTogglePin = async (id: string) => {
        await fetch(`/api/records/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ togglePin: true }),
        });
        loadRecords();
    };

    const totalPages = Math.ceil(total / pageSize);

    return (
        <LoginOverlay message="登录后使用命理记录功能">
            <div className="min-h-screen bg-background text-foreground md:pb-20">
                {/* 顶部 Hero 区域 - 移动端隐藏 */}
                <div className="hidden md:block relative overflow-hidden border-b border-border/50 pb-12 pt-20 mb-8">
                    <div className="absolute inset-0 bg-grid-pattern opacity-[0.03] pointer-events-none" />


                    <div className="max-w-4xl mx-auto px-4 relative z-10">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                            <div className="text-center md:text-left">
                                <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 mb-4 tracking-tight">
                                    命理记录
                                </h1>
                                <p className="text-lg text-foreground-secondary/80 max-w-lg">
                                    记录你的修行与感悟，追踪运势变化，积累命理智慧。
                                </p>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setShowImportExport(true)}
                                    className="p-3 bg-background border border-border rounded-xl text-foreground-secondary hover:text-foreground hover:border-foreground/20 hover:shadow-sm transition-all shadow-sm"
                                    title="数据管理"
                                >
                                    <Download className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={() => setShowRecordForm(true)}
                                    className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95"
                                >
                                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                                    <span className="font-medium">新建记录</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 移动端操作栏 */}
                <div className="md:hidden flex items-center justify-end gap-2 px-4 py-3">
                    <button
                        onClick={() => setShowImportExport(true)}
                        className="p-2 bg-background border border-border rounded-lg text-foreground-secondary"
                        title="数据管理"
                    >
                        <Download className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setShowRecordForm(true)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm rounded-lg shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        <span>新建</span>
                    </button>
                </div>

                <div className="max-w-4xl mx-auto px-4 space-y-8">
                    {/* 小记区域 */}
                    <div className="bg-background-secondary/30 border-border/50 rounded-2xl p-1 backdrop-blur-sm">
                        <DailyNotes notes={notes} onRefresh={loadNotes} />
                    </div>

                    {/* 搜索和筛选 */}
                    <div className="sticky top-4 z-30 bg-background/80 backdrop-blur-md rounded-2xl border border-border shadow-sm p-2 flex flex-col sm:flex-row gap-2">
                        <div className="flex-1 relative group">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary group-focus-within:text-emerald-500 transition-colors" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                placeholder="搜索关键词..."
                                className="w-full bg-transparent hover:bg-background-secondary/50 focus:bg-background border-none rounded-xl pl-10 pr-4 py-2.5 text-foreground placeholder:text-foreground-secondary/50 focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none"
                            />
                        </div>
                        <div className="w-px h-8 bg-border hidden sm:block self-center" />
                        <div className="relative min-w-[160px]">
                            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary pointer-events-none" />
                            <select
                                value={category}
                                onChange={(e) => { setCategory(e.target.value as RecordCategory | ''); setPage(1); }}
                                className="w-full bg-transparent hover:bg-background-secondary/50 focus:bg-background border-none rounded-xl pl-10 pr-8 py-2.5 text-foreground focus:ring-2 focus:ring-emerald-500/20 transition-all outline-none appearance-none cursor-pointer"
                            >
                                <option value="">全部分类</option>
                                {RECORD_CATEGORIES.map(cat => (
                                    <option key={cat.value} value={cat.value}>
                                        {cat.label}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-foreground-secondary">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    </div>

                    {/* 记录列表 */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <div className="relative w-12 h-12">
                                <div className="absolute inset-0 border-4 border-emerald-100 dark:border-emerald-900 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin"></div>
                            </div>
                            <p className="text-foreground-secondary animate-pulse">加载记录中...</p>
                        </div>
                    ) : records.length === 0 ? (
                        <div className="py-20 text-center">
                            <div className="w-24 h-24 bg-background-secondary/50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <FileText className="w-10 h-10 text-foreground-secondary/50" />
                            </div>
                            <h3 className="text-lg font-medium text-foreground mb-2">暂无记录</h3>
                            <p className="text-foreground-secondary mb-6 max-w-xs mx-auto">
                                还没有添加任何命理记录。开始记录你的第一次感悟吧！
                            </p>
                            <button
                                onClick={() => setShowRecordForm(true)}
                                className="px-6 py-2.5 bg-background border border-border hover:border-emerald-500/50 hover:text-emerald-500 rounded-xl transition-all shadow-sm hover:shadow-md"
                            >
                                立即添加
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="grid gap-4">
                                {records.map(record => (
                                    <RecordCard
                                        key={record.id}
                                        record={record}
                                        onEdit={() => { setEditingRecord(record); setShowRecordForm(true); }}
                                        onDelete={() => handleDelete(record.id)}
                                        onTogglePin={() => handleTogglePin(record.id)}
                                        onAddToKnowledgeBase={() => openAddToKb(record)}
                                    />
                                ))}
                            </div>

                            {/* 分页 */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-3 pt-8 pb-4">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="p-2 rounded-lg hover:bg-background-secondary disabled:opacity-50 disabled:hover:bg-transparent transition-colors text-foreground-secondary"
                                    >
                                        <ChevronLeft className="w-5 h-5" />
                                    </button>
                                    <span className="text-sm font-medium text-foreground px-4 py-1.5 bg-background-secondary rounded-lg">
                                        {page} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="p-2 rounded-lg hover:bg-background-secondary disabled:opacity-50 disabled:hover:bg-transparent transition-colors text-foreground-secondary"
                                    >
                                        <ChevronRight className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {/* 记录表单模态框 */}
                    {showRecordForm && (
                        <RecordFormModal
                            record={editingRecord}
                            onClose={() => { setShowRecordForm(false); setEditingRecord(null); }}
                            onSave={() => { setShowRecordForm(false); setEditingRecord(null); loadRecords(); }}
                        />
                    )}

                    {/* 导入导出模态框 */}
                    {showImportExport && (
                        <ImportExportModal
                            onClose={() => setShowImportExport(false)}
                            onImport={() => { loadRecords(); loadNotes(); }}
                        />
                    )}

                    {kbModalOpen && kbTargetRecord && (
                        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                            <div className="bg-background/95 backdrop-blur-xl rounded-2xl w-full max-w-lg border border-white/10 shadow-2xl animate-in zoom-in-95 duration-200">
                                <div className="p-4 sm:p-6 border-b border-border/50 flex items-center justify-between">
                                    <div className="min-w-0">
                                        <div className="text-base font-semibold truncate">加入知识库</div>
                                        <div className="text-xs text-foreground-secondary truncate">{kbTargetRecord.title}</div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={closeKbModal}
                                        className="p-2 rounded-lg hover:bg-background-secondary transition-colors"
                                        aria-label="关闭"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="p-4 sm:p-6 space-y-4">
                                    {kbLoading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <div className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {kbList.length === 0 ? (
                                                <div className="text-sm text-foreground-secondary">你还没有知识库，先创建一个。</div>
                                            ) : (
                                                <div className="space-y-2 max-h-56 overflow-auto pr-1">
                                                    {kbList.map(kb => (
                                                        <label
                                                            key={kb.id}
                                                            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${kbSelectedId === kb.id ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border hover:bg-background-secondary'}`}
                                                        >
                                                            <input
                                                                type="radio"
                                                                name="kb"
                                                                className="mt-1"
                                                                checked={kbSelectedId === kb.id}
                                                                onChange={() => setKbSelectedId(kb.id)}
                                                            />
                                                            <div className="min-w-0">
                                                                <div className="text-sm font-medium truncate">{kb.name}</div>
                                                                <div className="text-xs text-foreground-secondary truncate">{kb.description || '知识库'}</div>
                                                            </div>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <div className="border-t border-border/50 pt-4 space-y-2">
                                        <div className="text-sm font-medium">创建新知识库</div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                value={kbNewName}
                                                onChange={(e) => setKbNewName(e.target.value)}
                                                className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/30"
                                                placeholder="例如：我的命理笔记"
                                            />
                                            <button
                                                type="button"
                                                onClick={createKnowledgeBase}
                                                disabled={kbSaving || !kbNewName.trim()}
                                                className="px-3 py-2 text-sm rounded-xl bg-background border border-border hover:border-emerald-500/40 hover:text-emerald-500 disabled:opacity-50 transition-colors"
                                            >
                                                创建
                                            </button>
                                        </div>
                                    </div>

                                    {kbError && (
                                        <div className="text-sm text-red-500">{kbError}</div>
                                    )}
                                    {kbSuccess && (
                                        <div className="text-sm text-emerald-500">{kbSuccess}</div>
                                    )}
                                </div>

                                <div className="p-4 sm:p-6 border-t border-border/50 flex items-center justify-end gap-2">
                                    <button
                                        type="button"
                                        onClick={closeKbModal}
                                        className="px-4 py-2 text-sm rounded-xl bg-background border border-border hover:bg-background-secondary transition-colors"
                                    >
                                        取消
                                    </button>
                                    <button
                                        type="button"
                                        onClick={ingestRecordToKb}
                                        disabled={kbSaving || kbLoading || !kbSelectedId}
                                        className="px-4 py-2 text-sm rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
                                    >
                                        加入
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </LoginOverlay>
    );
}
