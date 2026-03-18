/**
 * 命理记账页面
 *
 * 'use client' 标记说明：
 * - 使用 React hooks (useState, useEffect, useCallback)
 * - 有搜索、筛选、导入导出等交互功能
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, Download } from 'lucide-react';
import { MingRecord, MingNote, RecordCategory } from '@/lib/records';
import { supabase } from '@/lib/auth';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { RecordFilters } from '@/components/records/RecordFilters';
import { RecordsList } from '@/components/records/RecordsList';
import {
    RecordFormModal,
    DailyNotes,
    ImportExportModal,
    KnowledgeBaseModal,
} from '@/components/records/RecordDetail';

const PAGE_SIZE = 10;

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

    // 知识库相关状态
    const [kbModalOpen, setKbModalOpen] = useState(false);
    const [kbLoading, setKbLoading] = useState(false);
    const [kbSaving, setKbSaving] = useState(false);
    const [kbError, setKbError] = useState<string | null>(null);
    const [kbSuccess, setKbSuccess] = useState<string | null>(null);
    const [kbList, setKbList] = useState<Array<{ id: string; name: string; description: string | null }>>([]);
    const [kbSelectedId, setKbSelectedId] = useState<string>('');
    const [kbNewName, setKbNewName] = useState('');
    const [kbTargetRecord, setKbTargetRecord] = useState<MingRecord | null>(null);
    const [deleteRecordId, setDeleteRecordId] = useState<string | null>(null);
    const { showToast } = useToast();

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
        if (!user) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(page),
                pageSize: String(PAGE_SIZE),
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
        if (!user) return;
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
        const response = await fetch(`/api/records/${id}`, { method: 'DELETE' });
        if (!response.ok) {
            showToast('error', '删除记录失败');
            return;
        }
        setDeleteRecordId(null);
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

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div className="min-h-screen bg-background text-foreground">
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
                    <RecordFilters
                        search={search}
                        onSearchChange={(v) => { setSearch(v); setPage(1); }}
                        category={category}
                        onCategoryChange={(v) => { setCategory(v); setPage(1); }}
                    />

                    {/* 记录列表 */}
                    <RecordsList
                        loading={loading}
                        records={records}
                        page={page}
                        totalPages={totalPages}
                        onPageChange={setPage}
                        onEdit={(record) => { setEditingRecord(record); setShowRecordForm(true); }}
                        onDelete={(id) => setDeleteRecordId(id)}
                        onTogglePin={handleTogglePin}
                        onAddToKnowledgeBase={openAddToKb}
                        onCreateNew={() => setShowRecordForm(true)}
                    />

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

                    {/* 知识库归档模态框 */}
                    {kbModalOpen && kbTargetRecord && (
                        <KnowledgeBaseModal
                            targetRecord={kbTargetRecord}
                            kbLoading={kbLoading}
                            kbSaving={kbSaving}
                            kbError={kbError}
                            kbSuccess={kbSuccess}
                            kbList={kbList}
                            kbSelectedId={kbSelectedId}
                            kbNewName={kbNewName}
                            onSelectKb={setKbSelectedId}
                            onNewNameChange={setKbNewName}
                            onCreateKb={createKnowledgeBase}
                            onIngest={ingestRecordToKb}
                            onClose={closeKbModal}
                        />
                    )}
                    <ConfirmDialog
                        isOpen={!!deleteRecordId}
                        onClose={() => setDeleteRecordId(null)}
                        onConfirm={() => deleteRecordId ? handleDelete(deleteRecordId) : undefined}
                        title="确认删除"
                        description="确定要删除这条记录吗？此操作无法撤销。"
                        confirmText="确认删除"
                        variant="danger"
                    />
                </div>
            </div>
    );
}
