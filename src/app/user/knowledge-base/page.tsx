'use client';

import { useCallback, useEffect, useState } from 'react';
import {
    BookOpenText, Loader2, Plus, Trash2,
    ChevronDown, ChevronUp, Unlink2, Save, Upload,
    FileText, Database, Sparkles, AlertCircle
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getMembershipInfo, type MembershipType } from '@/lib/membership';
import { useToast } from '@/components/ui/Toast';

type KnowledgeBase = {
    id: string;
    name: string;
    description: string | null;
    weight: 'low' | 'normal' | 'high';
    created_at?: string;
    updated_at?: string;
};

type ArchivedSource = {
    id: string;
    kb_id: string;
    source_type: string;
    source_id: string;
    created_at?: string;
    preview?: string | null;
};

const weightLabel: Record<KnowledgeBase['weight'], string> = {
    low: '低优先级',
    normal: '默认',
    high: '高优先级',
};

const sourceTypeLabel: Record<string, string> = {
    conversation: '对话',
    record: '命理记录',
    chat_message: '对话回复',
    bazi_chart: '八字命盘',
    ziwei_chart: '紫微命盘',
    tarot_reading: '塔罗占卜',
    liuyao_divination: '六爻占卜',
    hepan_chart: '合盘分析',
    face_reading: '面相分析',
    palm_reading: '手相分析',
    mbti_reading: 'MBTI 分析',
    ming_record: '命理记录',
    daily_fortune: '今日运势',
    monthly_fortune: '本月运势',
};

async function getAccessToken() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
}

export default function KnowledgeBaseManagePage() {
    const { showToast } = useToast();
    const [userId, setUserId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [kbs, setKbs] = useState<KnowledgeBase[]>([]);
    const [expandedKbId, setExpandedKbId] = useState<string | null>(null);
    const [archivesLoading, setArchivesLoading] = useState(false);
    const [archives, setArchives] = useState<Record<string, ArchivedSource[]>>({});
    const [creating, setCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [savingKbId, setSavingKbId] = useState<string | null>(null);
    const [deletingKbId, setDeletingKbId] = useState<string | null>(null);
    const [removingArchiveId, setRemovingArchiveId] = useState<string | null>(null);
    const [uploadKbId, setUploadKbId] = useState<string | null>(null);
    const [uploadFile, setUploadFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
    const [promptKbIds, setPromptKbIds] = useState<string[]>([]);
    const [promptSavingId, setPromptSavingId] = useState<string | null>(null);
    const [membershipType, setMembershipType] = useState<MembershipType>('free');

    const loadKnowledgeBases = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const accessToken = await getAccessToken();
            const resp = await fetch('/api/knowledge-base', {
                headers: accessToken ? { authorization: `Bearer ${accessToken}` } : undefined
            });
            const data = await resp.json().catch(() => ({} as Record<string, unknown>));
            if (!resp.ok) {
                setError(typeof data.error === 'string' ? data.error : '获取知识库失败');
                setKbs([]);
                return;
            }
            const kbList = (data as { knowledgeBases?: unknown }).knowledgeBases;
            setKbs(Array.isArray(kbList) ? (kbList as KnowledgeBase[]) : []);
        } catch {
            setError('获取知识库失败');
            setKbs([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadPromptKbIds = useCallback(async (id: string) => {
        const { data, error } = await supabase
            .from('user_settings')
            .select('prompt_kb_ids')
            .eq('user_id', id)
            .maybeSingle();
        if (error) {
            setPromptKbIds([]);
            return;
        }
        const rawIds = Array.isArray((data as { prompt_kb_ids?: unknown })?.prompt_kb_ids)
            ? (data as { prompt_kb_ids: unknown[] }).prompt_kb_ids
            : [];
        setPromptKbIds(rawIds.filter((value): value is string => typeof value === 'string' && value.length > 0));
    }, []);

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) {
                setUserId(null);
                setLoading(false);
                setError('请先登录');
                return;
            }
            setUserId(session.user.id);
            const membership = await getMembershipInfo(session.user.id);
            setMembershipType(membership?.type || 'free');
            await loadKnowledgeBases();
            await loadPromptKbIds(session.user.id);
        };
        void init();
    }, [loadKnowledgeBases, loadPromptKbIds]);

    useEffect(() => {
        if (!uploadKbId && kbs.length > 0) {
            setUploadKbId(kbs[0].id);
        }
    }, [kbs, uploadKbId]);

    const loadArchives = useCallback(async (kbId: string) => {
        setArchivesLoading(true);
        setError(null);
        try {
            const accessToken = await getAccessToken();
            const resp = await fetch(`/api/knowledge-base/archive?kbId=${encodeURIComponent(kbId)}`, {
                headers: accessToken ? { authorization: `Bearer ${accessToken}` } : undefined
            });
            const data = await resp.json().catch(() => ({} as Record<string, unknown>));
            if (!resp.ok) {
                setError(typeof data.error === 'string' ? data.error : '获取归档失败');
                setArchives(prev => ({ ...prev, [kbId]: [] }));
                return;
            }
            const items = (data as { archivedSources?: unknown }).archivedSources;
            setArchives(prev => ({ ...prev, [kbId]: Array.isArray(items) ? (items as ArchivedSource[]) : [] }));
        } catch {
            setError('获取归档失败');
            setArchives(prev => ({ ...prev, [kbId]: [] }));
        } finally {
            setArchivesLoading(false);
        }
    }, []);

    const toggleExpand = useCallback(async (kbId: string) => {
        if (expandedKbId === kbId) {
            setExpandedKbId(null);
            return;
        }
        setExpandedKbId(kbId);
        await loadArchives(kbId);
    }, [expandedKbId, loadArchives]);

    const createKb = useCallback(async () => {
        const name = newName.trim();
        if (!name) {
            setError('请输入知识库名称');
            return;
        }
        setCreating(true);
        setError(null);
        try {
            const accessToken = await getAccessToken();
            const resp = await fetch('/api/knowledge-base', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {})
                },
                body: JSON.stringify({
                    name,
                    description: newDescription.trim() ? newDescription.trim() : null
                })
            });
            const data = await resp.json().catch(() => ({} as Record<string, unknown>));
            if (!resp.ok) {
                setError(typeof data.error === 'string' ? data.error : '创建知识库失败');
                return;
            }
            setNewName('');
            setNewDescription('');
            await loadKnowledgeBases();
            showToast('success', '知识库创建成功');
        } catch {
            setError('创建知识库失败');
        } finally {
            setCreating(false);
        }
    }, [loadKnowledgeBases, newDescription, newName, showToast]);

    const togglePromptKb = useCallback(async (kbId: string) => {
        if (!userId) return;
        if (membershipType === 'free') {
            showToast('info', '仅限 Plus 以上会员使用');
            return;
        }
        const next = promptKbIds.includes(kbId)
            ? promptKbIds.filter(id => id !== kbId)
            : [...promptKbIds, kbId];
        setPromptKbIds(next);
        setPromptSavingId(kbId);
        const { error: saveError } = await supabase
            .from('user_settings')
            .upsert({ user_id: userId, prompt_kb_ids: next }, { onConflict: 'user_id' });
        setPromptSavingId(null);
        if (saveError) {
            setError('保存知识库失败');
            showToast('error', '保存知识库失败');
            return;
        }
        window.dispatchEvent(new CustomEvent('mingai:knowledge-base:prompt-updated'));
    }, [membershipType, promptKbIds, showToast, userId]);

    const updateKb = useCallback(async (kb: KnowledgeBase) => {
        setSavingKbId(kb.id);
        setError(null);
        try {
            const accessToken = await getAccessToken();
            const resp = await fetch(`/api/knowledge-base/${kb.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {})
                },
                body: JSON.stringify({
                    name: kb.name,
                    description: kb.description,
                    weight: kb.weight
                })
            });
            const data = await resp.json().catch(() => ({} as Record<string, unknown>));
            if (!resp.ok) {
                setError(typeof data.error === 'string' ? data.error : '更新知识库失败');
                return;
            }
            await loadKnowledgeBases();
            showToast('success', '知识库已更新');
        } catch {
            setError('更新知识库失败');
        } finally {
            setSavingKbId(null);
        }
    }, [loadKnowledgeBases, showToast]);

    const deleteKb = useCallback(async (kbId: string) => {
        if (!window.confirm('确定要删除该知识库吗？')) return;
        setDeletingKbId(kbId);
        setError(null);
        try {
            const accessToken = await getAccessToken();
            const resp = await fetch(`/api/knowledge-base/${kbId}`, {
                method: 'DELETE',
                headers: accessToken ? { authorization: `Bearer ${accessToken}` } : undefined
            });
            const data = await resp.json().catch(() => ({} as Record<string, unknown>));
            if (!resp.ok) {
                const message = typeof data.error === 'string' ? data.error : '删除知识库失败';
                setError(message);
                showToast('error', message);
                return;
            }
            if (expandedKbId === kbId) setExpandedKbId(null);
            await loadKnowledgeBases();
            showToast('success', '知识库已删除');
        } catch {
            setError('删除知识库失败');
            showToast('error', '删除知识库失败');
        } finally {
            setDeletingKbId(null);
        }
    }, [expandedKbId, loadKnowledgeBases, showToast]);

    const removeArchive = useCallback(async (archiveId: string) => {
        setRemovingArchiveId(archiveId);
        setError(null);
        try {
            const accessToken = await getAccessToken();
            const resp = await fetch(`/api/knowledge-base/archive/${archiveId}`, {
                method: 'DELETE',
                headers: accessToken ? { authorization: `Bearer ${accessToken}` } : undefined
            });
            const data = await resp.json().catch(() => ({} as Record<string, unknown>));
            if (!resp.ok) {
                const message = typeof data.error === 'string' ? data.error : '取消归档失败';
                setError(message);
                showToast('error', message);
                return;
            }
            if (expandedKbId) {
                await loadArchives(expandedKbId);
            }
            showToast('success', '已取消归档');
        } catch {
            setError('取消归档失败');
            showToast('error', '取消归档失败');
        } finally {
            setRemovingArchiveId(null);
        }
    }, [expandedKbId, loadArchives, showToast]);

    const uploadKnowledgeFile = useCallback(async () => {
        if (!uploadKbId) {
            setUploadError('请选择知识库');
            return;
        }
        if (!uploadFile) {
            setUploadError('请选择文件');
            return;
        }
        setUploading(true);
        setUploadError(null);
        setUploadSuccess(null);
        try {
            const accessToken = await getAccessToken();
            const formData = new FormData();
            formData.append('kbId', uploadKbId);
            formData.append('file', uploadFile);
            const resp = await fetch('/api/knowledge-base/upload', {
                method: 'POST',
                headers: accessToken ? { authorization: `Bearer ${accessToken}` } : undefined,
                body: formData
            });
            const data = await resp.json().catch(() => ({} as Record<string, unknown>));
            if (!resp.ok) {
                setUploadError(typeof data.error === 'string' ? data.error : '上传失败');
                return;
            }
            setUploadFile(null);
            // Reset file input value
            const fileInput = document.getElementById('kb-file-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';

            setUploadSuccess('文件上传成功');
            // Automatically expand the KB to show new content
            if (uploadKbId !== expandedKbId) {
                setExpandedKbId(uploadKbId);
            }
            await loadArchives(uploadKbId);
            showToast('success', '文件上传成功');
        } catch {
            setUploadError('上传失败');
        } finally {
            setUploading(false);
        }
    }, [expandedKbId, loadArchives, showToast, uploadFile, uploadKbId]);

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 md:py-6">
                {/* 桌面端 Header */}
                <div className="hidden md:flex md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2 text-foreground">
                            <BookOpenText className="w-5 h-5 text-emerald-500" />
                            知识库
                        </h1>
                        <p className="text-xs text-foreground-secondary mt-0.5">
                            构建你的个人命理数据库，让 AI 更精准地为你服务
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    {/* 创建新知识库 */}
                    <div className="bg-background rounded-2xl p-5 border border-border shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <Plus className="w-4 h-4 text-emerald-500" />
                            <h2 className="text-sm font-semibold text-foreground">新建知识库</h2>
                        </div>
                        <div className="space-y-3">
                            <input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 transition-all placeholder:text-foreground-tertiary"
                                placeholder="给知识库起个名字..."
                            />
                            <textarea
                                value={newDescription}
                                onChange={(e) => setNewDescription(e.target.value)}
                                className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500/50 resize-none transition-all placeholder:text-foreground-tertiary"
                                rows={2}
                                placeholder="描述一下这个知识库的用途（可选）"
                            />
                            <button
                                type="button"
                                onClick={createKb}
                                disabled={creating || !newName.trim()}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 transition-all shadow-md shadow-emerald-500/20 font-medium text-sm"
                            >
                                {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                创建知识库
                            </button>
                            {error && <div className="text-[10px] text-red-500 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{error}</div>}
                        </div>
                    </div>

                    {/* 上传文件 */}
                    <div className="bg-background rounded-2xl p-5 border border-border shadow-sm lg:col-span-2">
                        <div className="flex items-center gap-3 mb-4">
                            <Upload className="w-4 h-4 text-blue-500" />
                            <h2 className="text-sm font-semibold text-foreground">导入外部资料</h2>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-5">
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-medium text-foreground mb-1.5 block">选择目标知识库</label>
                                    <select
                                        value={uploadKbId ?? ''}
                                        onChange={(e) => setUploadKbId(e.target.value)}
                                        className="w-full appearance-none bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
                                        disabled={kbs.length === 0}
                                    >
                                        {kbs.length === 0 ? (
                                            <option value="">暂无知识库</option>
                                        ) : (
                                            kbs.map(kb => (
                                                <option key={kb.id} value={kb.id}>{kb.name}</option>
                                            ))
                                        )}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs font-medium text-foreground mb-1.5 block">选择文件</label>
                                    <input
                                        id="kb-file-upload"
                                        type="file"
                                        onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                                        className="w-full text-xs text-foreground-secondary
                                        file:mr-3 file:py-2 file:px-3
                                        file:rounded-lg file:border-0
                                        file:text-xs file:font-medium
                                        file:bg-blue-500/10 file:text-blue-500
                                        hover:file:bg-blue-500/20
                                        transition-all"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col justify-end space-y-3">
                                <div className="flex-1 bg-background/50 rounded-xl border border-dashed border-border p-3 flex flex-col items-center justify-center text-center">
                                    <div className="w-8 h-8 rounded-full bg-background-secondary flex items-center justify-center mb-1.5">
                                        <FileText className="w-4 h-4 text-foreground-secondary" />
                                    </div>
                                    <p className="text-[10px] text-foreground-secondary">
                                        支持 .txt, .md, .pdf 等常见文本格式<br />
                                        单文件最大支持 10MB
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={uploadKnowledgeFile}
                                    disabled={uploading || !uploadKbId || !uploadFile}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 transition-all shadow-md shadow-blue-500/20 font-medium text-sm"
                                >
                                    {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                                    开始上传
                                </button>
                                {uploadError && <div className="text-[10px] text-red-500 text-center">{uploadError}</div>}
                                {uploadSuccess && <div className="text-[10px] text-emerald-500 text-center">{uploadSuccess}</div>}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <h2 className="text-sm font-semibold text-foreground px-1 flex items-center gap-2">
                        <Database className="w-4 h-4 text-accent" />
                        我的知识库列表
                    </h2>

                    {loading ? (
                        <div className="grid grid-cols-1 gap-3">
                            {/* 骨架屏 - 模拟知识库卡片 */}
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-background rounded-2xl border border-border p-4 sm:p-5">
                                    <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                                        <div className="flex-1 space-y-3 min-w-0">
                                            <div className="flex items-start gap-3">
                                                <div className="w-5 h-5 rounded bg-foreground/10 animate-pulse" />
                                                <div className="flex-1 space-y-2">
                                                    <div className="h-5 w-32 rounded bg-foreground/10 animate-pulse" />
                                                    <div className="h-4 w-48 rounded bg-foreground/5 animate-pulse" />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <div className="h-7 w-20 rounded-lg bg-foreground/5 animate-pulse" />
                                            <div className="h-7 w-24 rounded-lg bg-foreground/5 animate-pulse" />
                                            <div className="h-7 w-7 rounded-lg bg-foreground/5 animate-pulse" />
                                            <div className="h-7 w-7 rounded-lg bg-foreground/5 animate-pulse" />
                                            <div className="h-7 w-7 rounded-lg bg-foreground/5 animate-pulse" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : kbs.length === 0 ? (
                        <div className="bg-background rounded-2xl p-10 text-center border border-border border-dashed">
                            <div className="w-14 h-14 rounded-full bg-background flex items-center justify-center mx-auto mb-3">
                                <BookOpenText className="w-6 h-6 text-foreground-tertiary" />
                            </div>
                            <h3 className="text-sm font-medium text-foreground mb-1">暂无知识库</h3>
                            <p className="text-foreground-secondary text-xs max-w-xs mx-auto">
                                创建一个知识库，开始整理你的命理资料，让 AI 更好地理解你的需求
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {kbs.map(kb => (
                                <div
                                    key={kb.id}
                                    className={`bg-background rounded-2xl border transition-all duration-300 overflow-hidden ${expandedKbId === kb.id
                                            ? 'border-emerald-500/30 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/10'
                                            : 'border-border hover:border-emerald-500/20'
                                        }`}
                                >
                                    <div className="p-4 sm:p-5">
                                        <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                                            {/* KB Info & Edit */}
                                            <div className="flex-1 space-y-3 min-w-0">
                                                <div className="flex items-start gap-3">
                                                    <BookOpenText className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                                    <div className="flex-1 space-y-2 min-w-0">
                                                        <input
                                                            value={kb.name}
                                                            onChange={(e) => setKbs(prev => prev.map(x => x.id === kb.id ? { ...x, name: e.target.value } : x))}
                                                            className="w-full bg-transparent text-base font-semibold text-foreground focus:outline-none focus:bg-background/50 rounded-lg px-2 -ml-2 transition-colors placeholder:text-foreground-tertiary"
                                                            placeholder="知识库名称"
                                                        />
                                                        <textarea
                                                            value={kb.description ?? ''}
                                                            onChange={(e) => setKbs(prev => prev.map(x => x.id === kb.id ? { ...x, description: e.target.value || null } : x))}
                                                            className="w-full bg-transparent text-xs text-foreground-secondary focus:outline-none focus:bg-background/50 rounded-lg px-2 -ml-2 py-1 transition-colors resize-none placeholder:text-foreground-tertiary/50"
                                                            rows={1}
                                                            placeholder="添加描述..."
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Controls Toolbar */}
                                            <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                                                <div className="flex items-center gap-1.5 px-1 rounded-lg bg-background border border-border">
                                                    <select
                                                        value={kb.weight}
                                                        onChange={(e) => setKbs(prev => prev.map(x => x.id === kb.id ? { ...x, weight: e.target.value as KnowledgeBase['weight'] } : x))}
                                                        className="bg-transparent text-xs font-medium pl-1 pr-2 py-1 rounded focus:outline-none hover:bg-background-secondary transition-colors cursor-pointer"
                                                    >
                                                        <option value="low">{weightLabel.low}</option>
                                                        <option value="normal">{weightLabel.normal}</option>
                                                        <option value="high">{weightLabel.high}</option>
                                                    </select>
                                                </div>

                                                <button
                                                    onClick={() => togglePromptKb(kb.id)}
                                                    disabled={membershipType === 'free'}
                                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${promptKbIds.includes(kb.id)
                                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                                            : 'bg-background border-border text-foreground-secondary hover:text-foreground'
                                                        } ${membershipType === 'free' ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                    title={membershipType === 'free' ? '仅限 Plus 以上会员使用' : '启用知识库搜索'}
                                                >
                                                    <Sparkles className="w-3 h-3" />
                                                    {promptKbIds.includes(kb.id) ? '已启用搜索' : '启用搜索'}
                                                    {promptSavingId === kb.id && <Loader2 className="w-2.5 h-2.5 animate-spin" />}
                                                </button>

                                                <div className="w-px h-6 bg-border mx-1 hidden sm:block" />

                                                <button
                                                    type="button"
                                                    onClick={() => updateKb(kb)}
                                                    disabled={savingKbId === kb.id}
                                                    className="p-1.5 rounded-lg bg-background border border-border text-foreground-secondary hover:text-emerald-500 hover:border-emerald-500/30 disabled:opacity-50 transition-all"
                                                    title="保存更改"
                                                >
                                                    {savingKbId === kb.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => toggleExpand(kb.id)}
                                                    className={`p-1.5 rounded-lg border transition-all ${expandedKbId === kb.id
                                                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                                                            : 'bg-background border-border text-foreground-secondary hover:bg-background-secondary'
                                                        }`}
                                                    title={expandedKbId === kb.id ? "收起归档" : "查看归档"}
                                                >
                                                    {expandedKbId === kb.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={() => deleteKb(kb.id)}
                                                    disabled={deletingKbId === kb.id}
                                                    className="p-1.5 rounded-lg bg-background border border-border text-foreground-secondary hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/5 disabled:opacity-50 transition-all"
                                                    title="删除知识库"
                                                >
                                                    {deletingKbId === kb.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Expanded Archive View */}
                                    {expandedKbId === kb.id && (
                                        <div className="border-t border-border bg-background/30 p-4 sm:p-5 animation-slide-down">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="text-xs font-medium text-foreground flex items-center gap-1.5">
                                                    <Database className="w-3.5 h-3.5 text-emerald-500" />
                                                    已归档数据源
                                                    <span className="text-[10px] font-normal text-foreground-secondary bg-background px-1.5 py-0.5 rounded-full border border-border">
                                                        {(archives[kb.id] || []).length}
                                                    </span>
                                                </div>
                                            </div>

                                            {archivesLoading ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {/* 骨架屏 - 模拟归档数据项 */}
                                                    {[1, 2, 3, 4].map(i => (
                                                        <div key={i} className="p-2.5 rounded-xl bg-background border border-border">
                                                            <div className="flex items-center gap-1.5 mb-1.5">
                                                                <div className="h-4 w-16 rounded bg-foreground/10 animate-pulse" />
                                                                <div className="h-3 w-20 rounded bg-foreground/5 animate-pulse" />
                                                            </div>
                                                            <div className="h-4 w-full rounded bg-foreground/5 animate-pulse" />
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (archives[kb.id] || []).length === 0 ? (
                                                <div className="text-center py-6 rounded-xl border border-dashed border-border/50">
                                                    <p className="text-xs text-foreground-secondary">暂无归档数据</p>
                                                    <p className="text-[10px] text-foreground-tertiary mt-0.5">
                                                        在对话或其他功能页面点击「加入知识库」即可添加
                                                    </p>
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {(archives[kb.id] || []).map(a => (
                                                        <div key={a.id} className="group flex items-start justify-between gap-2 p-2.5 rounded-xl bg-background border border-border hover:border-emerald-500/20 transition-all">
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-background-secondary text-foreground-secondary border border-border">
                                                                        {sourceTypeLabel[a.source_type] || a.source_type}
                                                                    </span>
                                                                    <span className="text-[10px] text-foreground-tertiary font-mono">
                                                                        {a.created_at ? new Date(a.created_at).toLocaleDateString() : ''}
                                                                    </span>
                                                                </div>
                                                                <div className="text-xs text-foreground-secondary truncate" title={a.preview || a.source_id}>
                                                                    {a.preview ? a.preview : a.source_id}
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => removeArchive(a.id)}
                                                                disabled={removingArchiveId === a.id}
                                                                className="p-1.5 rounded-lg text-foreground-tertiary hover:text-red-500 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                                title="移除归档"
                                                            >
                                                                {removingArchiveId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink2 className="w-3.5 h-3.5" />}
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {!!userId && (
                    <div className="mt-8 p-3 rounded-xl bg-background-secondary/50 border border-border/50 text-center">
                        <p className="text-[10px] text-foreground-secondary">
                            💡 提示：在对话、命理记录、塔罗/六爻/合盘/面相/手相/MBTI 结果页面，点击「加入知识库」按钮即可将内容快速归档到指定知识库。
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
