'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Plus,
    Search,
    Download,
    Upload,
    Pin,
    Trash2,
    Edit2,
    Calendar,
    Tag,
    Filter,
    FileText,
    BookOpen,
    Tags
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

// =====================================================
// 记录卡片组件
// =====================================================
function RecordCard({
    record,
    onEdit,
    onDelete,
    onTogglePin
}: {
    record: MingRecord;
    onEdit: () => void;
    onDelete: () => void;
    onTogglePin: () => void;
}) {
    const categoryInfo = RECORD_CATEGORIES.find(c => c.value === record.category);

    return (
        <div className={`bg-background-secondary rounded-lg p-4 border ${record.is_pinned ? 'border-yellow-500/50' : 'border-border'} hover:border-accent/30 transition-colors`}>
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        {record.is_pinned && <Pin className="w-3 h-3 text-yellow-500" />}
                        <span className="text-xs text-foreground-secondary">{categoryInfo?.icon} {categoryInfo?.label}</span>
                    </div>
                    <h3 className="font-medium text-foreground truncate">{record.title}</h3>
                    {record.content && (
                        <p className="text-sm text-foreground-secondary mt-1 line-clamp-2">{record.content}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-foreground-secondary">
                        {record.event_date && (
                            <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {record.event_date}
                            </span>
                        )}
                        {record.tags.length > 0 && (
                            <span className="flex items-center gap-1">
                                <Tag className="w-3 h-3" />
                                {record.tags.slice(0, 2).join(', ')}
                                {record.tags.length > 2 && '...'}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={onTogglePin}
                        className="p-1.5 text-foreground-secondary hover:text-yellow-500 transition-colors"
                        title={record.is_pinned ? '取消置顶' : '置顶'}
                    >
                        <Pin className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onEdit}
                        className="p-1.5 text-foreground-secondary hover:text-accent transition-colors"
                        title="编辑"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-1.5 text-foreground-secondary hover:text-red-400 transition-colors"
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
    const [eventDate, setEventDate] = useState(record?.event_date || '');
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
            const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto border border-border">
                <div className="p-4 border-b border-border">
                    <h2 className="text-lg font-medium text-foreground">{record ? '编辑记录' : '添加记录'}</h2>
                </div>
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {error && (
                        <div className="text-red-400 text-sm bg-red-900/20 p-2 rounded">{error}</div>
                    )}

                    <div>
                        <label className="block text-sm text-foreground-secondary mb-1">标题 *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full bg-background-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-accent"
                            placeholder="记录标题"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-foreground-secondary mb-1">分类</label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value as RecordCategory)}
                            className="w-full bg-background-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-accent"
                        >
                            {RECORD_CATEGORIES.map(cat => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.icon} {cat.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm text-foreground-secondary mb-1">事件日期</label>
                        <input
                            type="date"
                            value={eventDate}
                            onChange={(e) => setEventDate(e.target.value)}
                            className="w-full bg-background-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-accent"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-foreground-secondary mb-1">标签（逗号分隔）</label>
                        <input
                            type="text"
                            value={tagsInput}
                            onChange={(e) => setTagsInput(e.target.value)}
                            className="w-full bg-background-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-accent"
                            placeholder="例如: 事业, 财运"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-foreground-secondary mb-1">内容</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={4}
                            className="w-full bg-background-secondary border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:border-accent resize-none"
                            placeholder="详细记录..."
                        />
                    </div>

                    <div className="flex gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-foreground-secondary hover:text-foreground transition-colors"
                        >
                            取消
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50"
                        >
                            {loading ? '保存中...' : '保存'}
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
        <div className="bg-background-secondary rounded-lg p-4 border border-border">
            <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-5 h-5 text-purple-400" />
                <h3 className="font-medium text-foreground">今日小记</h3>
            </div>

            <form onSubmit={handleSubmit} className="mb-4">
                <div className="flex gap-2 mb-2">
                    {NOTE_MOODS.map(m => (
                        <button
                            key={m.value}
                            type="button"
                            onClick={() => setMood(m.value)}
                            className={`text-lg p-1 rounded transition-colors ${mood === m.value ? 'bg-background' : 'hover:bg-background'}`}
                            title={m.label}
                        >
                            {m.icon}
                        </button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="记录此刻的想法..."
                        className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-foreground text-sm focus:outline-none focus:border-accent"
                    />
                    <button
                        type="submit"
                        disabled={loading || !content.trim()}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 text-sm"
                    >
                        添加
                    </button>
                </div>
            </form>

            <div className="space-y-2 max-h-60 overflow-y-auto">
                {notes.length === 0 ? (
                    <p className="text-foreground-secondary text-sm text-center py-4">今天还没有小记</p>
                ) : (
                    notes.map(note => {
                        const moodInfo = NOTE_MOODS.find(m => m.value === note.mood);
                        return (
                            <div key={note.id} className="flex items-start gap-2 p-2 bg-background rounded-lg">
                                <span className="text-lg">{moodInfo?.icon || '📝'}</span>
                                <p className="flex-1 text-sm text-foreground-secondary">{note.content}</p>
                                <button
                                    onClick={() => handleDelete(note.id)}
                                    className="text-foreground-secondary hover:text-red-400 transition-colors p-1"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        );
                    })
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
    const router = useRouter();
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

    const pageSize = 10;

    // 检查登录状态
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/');
                return;
            }
            setUser(user);
        };
        checkAuth();
    }, [router]);

    // 加载记录
    const loadRecords = useCallback(async () => {
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
    }, [page, search, category]);

    // 加载今日小记
    const loadNotes = useCallback(async () => {
        const today = new Date().toISOString().split('T')[0];
        const response = await fetch(`/api/notes?date=${today}`);
        if (response.ok) {
            const data = await response.json();
            setNotes(data.notes);
        }
    }, []);

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

    if (!user) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background text-foreground">
            <div className="max-w-4xl mx-auto p-4 md:p-6">
                {/* 标题 */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Tags className="w-8 h-8 text-accent" />
                        <div>
                            <h1 className="text-2xl font-bold">命理记录</h1>
                            <p className="text-sm text-foreground-secondary">记录你的命理旅程</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowImportExport(true)}
                            className="p-2 text-foreground-secondary hover:text-foreground transition-colors"
                            title="数据管理"
                        >
                            <Download className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setShowRecordForm(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            添加记录
                        </button>
                    </div>
                </div>

                {/* 小记区域 */}
                <div className="mb-6">
                    <DailyNotes notes={notes} onRefresh={loadNotes} />
                </div>

                {/* 搜索和筛选 */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            placeholder="搜索记录..."
                            className="w-full bg-background-secondary border border-border rounded-lg pl-10 pr-4 py-2 text-foreground focus:outline-none focus:border-accent"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" />
                        <select
                            value={category}
                            onChange={(e) => { setCategory(e.target.value as RecordCategory | ''); setPage(1); }}
                            className="bg-background-secondary border border-border rounded-lg pl-10 pr-8 py-2 text-foreground focus:outline-none focus:border-accent appearance-none"
                        >
                            <option value="">全部分类</option>
                            {RECORD_CATEGORIES.map(cat => (
                                <option key={cat.value} value={cat.value}>
                                    {cat.icon} {cat.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* 记录列表 */}
                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
                    </div>
                ) : records.length === 0 ? (
                    <div className="text-center py-12 text-foreground-secondary">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>暂无记录</p>
                        <button
                            onClick={() => setShowRecordForm(true)}
                            className="mt-4 text-accent hover:text-accent/80"
                        >
                            添加第一条记录
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="space-y-3">
                            {records.map(record => (
                                <RecordCard
                                    key={record.id}
                                    record={record}
                                    onEdit={() => { setEditingRecord(record); setShowRecordForm(true); }}
                                    onDelete={() => handleDelete(record.id)}
                                    onTogglePin={() => handleTogglePin(record.id)}
                                />
                            ))}
                        </div>

                        {/* 分页 */}
                        {totalPages > 1 && (
                            <div className="flex justify-center gap-2 mt-6">
                                <button
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="px-3 py-1 bg-background-secondary border border-border rounded disabled:opacity-50"
                                >
                                    上一页
                                </button>
                                <span className="px-3 py-1 text-foreground-secondary">
                                    {page} / {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                    disabled={page === totalPages}
                                    className="px-3 py-1 bg-background-secondary border border-border rounded disabled:opacity-50"
                                >
                                    下一页
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
            </div>
        </div>
    );
}
