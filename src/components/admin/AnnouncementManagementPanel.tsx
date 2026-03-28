'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Megaphone, PencilLine, Plus, RefreshCw, Save, Trash2, GripVertical } from 'lucide-react';
import { MarkdownContent } from '@/components/ui/MarkdownContent';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import { supabase } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import type { Announcement } from '@/lib/announcement';

type EditorMode = 'create' | 'edit';

type AnnouncementFormState = {
    id: string | null;
    content: string;
    publishedAt: string | null;
};

function emptyFormState(): AnnouncementFormState {
    return {
        id: null,
        content: '',
        publishedAt: null,
    };
}

function announcementToFormState(announcement: Announcement): AnnouncementFormState {
    return {
        id: announcement.id,
        content: announcement.content,
        publishedAt: announcement.publishedAt,
    };
}

function formatPublishedAt(value: string | null) {
    if (!value) return '未发布';
    return new Date(value).toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function getPreviewText(content: string) {
    const normalized = content.replace(/\s+/g, ' ').trim();
    if (!normalized) return '暂无内容';
    return normalized.length > 72 ? `${normalized.slice(0, 72)}...` : normalized;
}

export function AnnouncementManagementPanel() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [mode, setMode] = useState<EditorMode>('create');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [form, setForm] = useState<AnnouncementFormState>(emptyFormState());
    const [error, setError] = useState<string | null>(null);
    const { showToast } = useToast();
    const selectedIdRef = useRef<string | null>(selectedId);

    useEffect(() => {
        selectedIdRef.current = selectedId;
    }, [selectedId]);

    const getToken = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token || null;
    }, []);

    const loadAnnouncements = useCallback(async (preferredSelectedId?: string | null) => {
        setLoading(true);
        setError(null);

        try {
            const token = await getToken();
            if (!token) {
                throw new Error('未登录');
            }

            const response = await fetch('/api/admin/announcements', {
                headers: { Authorization: `Bearer ${token}` },
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(typeof payload.error === 'string' ? payload.error : '获取公告列表失败');
            }

            const nextAnnouncements = (payload.announcements || []) as Announcement[];
            setAnnouncements(nextAnnouncements);

            const nextSelectedId = preferredSelectedId ?? selectedIdRef.current;
            if (!nextSelectedId) {
                return;
            }

            const selected = nextAnnouncements.find((item) => item.id === nextSelectedId);
            if (!selected) {
                setMode('create');
                setSelectedId(null);
                setForm(emptyFormState());
                return;
            }

            setMode('edit');
            setSelectedId(selected.id);
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : '获取公告列表失败');
        } finally {
            setLoading(false);
        }
    }, [getToken]);

    useEffect(() => {
        void loadAnnouncements();
    }, [loadAnnouncements]);

    const selectedAnnouncement = useMemo(
        () => announcements.find((item) => item.id === selectedId) || null,
        [announcements, selectedId],
    );

    const startCreateAnnouncement = () => {
        setMode('create');
        setSelectedId(null);
        setForm(emptyFormState());
    };

    const selectAnnouncement = (announcement: Announcement) => {
        setMode('edit');
        setSelectedId(announcement.id);
        setForm(announcementToFormState(announcement));
    };

    const saveAnnouncement = async () => {
        if (!form.content.trim()) {
            showToast('error', '公告内容不能为空');
            return;
        }

        setSaving(true);
        try {
            const token = await getToken();
            if (!token) {
                throw new Error('未登录');
            }

            const response = await fetch(
                form.id ? `/api/admin/announcements/${form.id}` : '/api/admin/announcements',
                {
                    method: form.id ? 'PATCH' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        content: form.content,
                    }),
                },
            );
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(typeof payload.error === 'string' ? payload.error : '保存公告失败');
            }

            const saved = payload.announcement as Announcement;
            setMode('edit');
            setSelectedId(saved.id);
            setForm(announcementToFormState(saved));
            showToast('success', form.id ? '公告已更新' : '公告已发布');
            await loadAnnouncements(saved.id);
        } catch (saveError) {
            showToast('error', saveError instanceof Error ? saveError.message : '保存公告失败');
        } finally {
            setSaving(false);
        }
    };

    const deleteAnnouncement = async (announcement: Announcement) => {
        setDeletingId(announcement.id);
        try {
            const token = await getToken();
            if (!token) {
                throw new Error('未登录');
            }

            const response = await fetch(`/api/admin/announcements/${announcement.id}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(typeof payload.error === 'string' ? payload.error : '删除公告失败');
            }

            if (selectedId === announcement.id) {
                startCreateAnnouncement();
            }
            showToast('success', '公告已删除');
            await loadAnnouncements(selectedId === announcement.id ? null : selectedId);
        } catch (deleteError) {
            showToast('error', deleteError instanceof Error ? deleteError.message : '删除公告失败');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row h-full border border-gray-200 rounded-xl bg-white shadow-sm overflow-hidden">
            {/* 左侧公告列表 */}
            <aside className="w-full lg:w-[320px] flex-shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-gray-200 bg-[#fbfaf7]">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-[#fbfaf7]">
                    <div className="flex items-center gap-2">
                        <Megaphone className="w-4 h-4 text-[#37352f]/60" />
                        <h2 className="text-sm font-semibold text-[#37352f]">公告历史</h2>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => void loadAnnouncements()}
                            className="p-1.5 rounded-md text-[#37352f]/45 hover:text-[#37352f] hover:bg-[#efedea] active:bg-[#e3e1db] transition-colors duration-150"
                            aria-label="刷新公告列表"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                            onClick={startCreateAnnouncement}
                            className="p-1.5 rounded-md text-[#37352f]/45 hover:text-[#37352f] hover:bg-[#efedea] active:bg-[#e3e1db] transition-colors duration-150"
                            aria-label="新公告"
                        >
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                    {loading ? (
                        <div className="flex min-h-[220px] items-center justify-center">
                            <SoundWaveLoader variant="inline" />
                        </div>
                    ) : error ? (
                        <div className="px-4 py-8 text-center">
                            <p className="text-sm text-[#37352f]/45">{error}</p>
                        </div>
                    ) : announcements.length === 0 ? (
                        <div className="px-4 py-8 text-center">
                            <p className="text-sm text-[#37352f]/45">还没有任何公告</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {announcements.map((announcement) => {
                                const isSelected = announcement.id === selectedId;
                                return (
                                    <div
                                        key={announcement.id}
                                        className={`group relative flex items-start gap-1 rounded-md px-2 py-2 transition-colors duration-150 ${
                                            isSelected
                                                ? 'bg-[#efedea]'
                                                : 'bg-transparent hover:bg-[#efedea]'
                                        }`}
                                    >
                                        {/* Drag Handle Illusion */}
                                        <div className="pt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer text-[#37352f]/30">
                                            <GripVertical className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <button
                                                onClick={() => selectAnnouncement(announcement)}
                                                className="w-full text-left block"
                                            >
                                                <div className="text-[11px] font-medium text-[#37352f]/40 font-mono tracking-tight">
                                                    {formatPublishedAt(announcement.publishedAt)}
                                                </div>
                                                <div className="mt-1 text-sm leading-relaxed text-[#37352f]/80 line-clamp-2">
                                                    {getPreviewText(announcement.content)}
                                                </div>
                                            </button>
                                            
                                            {/* 操作按钮 - 仅hover时或选中时显示 */}
                                            <div className="mt-2 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
                                                <button
                                                    onClick={() => selectAnnouncement(announcement)}
                                                    className="p-1 rounded text-[#37352f]/45 hover:text-[#2eaadc] hover:bg-[#e3e1db] transition-colors"
                                                    title="编辑"
                                                >
                                                    <PencilLine className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => void deleteAnnouncement(announcement)}
                                                    disabled={deletingId === announcement.id}
                                                    className="p-1 rounded text-[#37352f]/45 hover:text-[#eb5757] hover:bg-[#e3e1db] transition-colors disabled:opacity-50"
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
            </aside>

            {/* 右侧编辑区 */}
            <main className="flex-1 flex flex-col bg-white min-w-0">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-semibold text-[#37352f]">
                            {mode === 'create' ? '新建公告' : '编辑公告'}
                        </h2>
                    </div>
                    <button
                        onClick={() => void saveAnnouncement()}
                        disabled={saving}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#2383e2] text-white text-sm font-medium hover:bg-[#1d74c9] active:bg-[#1a64b0] transition-colors duration-150 disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? '保存中...' : mode === 'create' ? '发布公告' : '保存修改'}
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    <div className="flex items-center gap-4 text-sm border-b border-gray-100 pb-4">
                        <span className="text-[#37352f]/45 w-20 flex-shrink-0">发布状态</span>
                        <span className="text-[#37352f] flex-1">
                            {selectedAnnouncement 
                                ? `已发布于 ${formatPublishedAt(selectedAnnouncement.publishedAt)}`
                                : '未发布（保存即时生效）'
                            }
                        </span>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] gap-6 pb-6">
                        <section className="flex flex-col space-y-3 min-w-0">
                            <div className="space-y-1">
                                <label className="block text-sm text-[#37352f]/45">公告内容</label>
                                <p className="text-xs text-[#37352f]/35">
                                    支持 Markdown，建议用标题、列表、加粗、链接等基础语法。
                                </p>
                            </div>
                            <textarea
                                value={form.content}
                                onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                                className="w-full min-h-[220px] max-h-[320px] rounded-md border border-gray-200 bg-transparent px-4 py-3 text-sm leading-relaxed text-[#37352f] outline-none focus:border-gray-300 focus:ring-2 focus:ring-blue-500/20 transition-all duration-150 resize-y"
                                placeholder="输入公告内容，支持多段文本..."
                            />
                        </section>

                        <section className="min-w-0 flex flex-col">
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <div>
                                    <h3 className="text-sm font-medium text-[#37352f]">Markdown 预览</h3>
                                    <p className="text-xs text-[#37352f]/35 mt-1">
                                        发布前预览实际展示效果。
                                    </p>
                                </div>
                                <div className="text-[11px] font-medium text-[#37352f]/35 whitespace-nowrap">
                                    实时更新
                                </div>
                            </div>

                            <div className="min-h-[220px] max-h-[420px] overflow-y-auto rounded-md border border-gray-200 bg-[#fbfaf7] px-4 py-4 custom-scrollbar">
                                {form.content.trim() ? (
                                    <MarkdownContent
                                        content={form.content}
                                        className="text-sm leading-relaxed text-[#37352f]/85"
                                    />
                                ) : (
                                    <div className="h-full min-h-[180px] flex items-center justify-center text-sm text-[#37352f]/35">
                                        输入公告内容后，这里会显示 Markdown 预览
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}
