'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, RefreshCw, Save, Megaphone, ChevronRight, X, Star, LayoutGrid, Tag } from 'lucide-react';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import { supabase } from '@/lib/auth';
import { useToast } from '@/components/ui/Toast';
import {
    resolveAnnouncementEditorStateAfterLoad,
    type AnnouncementEditorState,
} from '@/lib/announcement-admin-view';
import type {
    Announcement,
    AnnouncementAudienceScope,
    AnnouncementPriority,
    AnnouncementStatus,
} from '@/lib/announcement';

type AnnouncementFormState = {
    id: string | null;
    title: string;
    content: string;
    ctaLabel: string;
    ctaHref: string;
    status: AnnouncementStatus;
    priority: AnnouncementPriority;
    displayOrder: number;
    startsAt: string;
    endsAt: string;
    popupEnabled: boolean;
    audienceScope: AnnouncementAudienceScope;
    version: number;
    publishedAt: string | null;
    updatedAt: string | null;
};

const STATUS_OPTIONS: Array<{ value: AnnouncementStatus; label: string }> = [
    { value: 'draft', label: '草稿' },
    { value: 'published', label: '已发布' },
    { value: 'archived', label: '已归档' },
];

const PRIORITY_OPTIONS: Array<{ value: AnnouncementPriority; label: string }> = [
    { value: 'normal', label: '普通公告' },
    { value: 'critical', label: '重要紧急' },
];

const AUDIENCE_OPTIONS: Array<{ value: AnnouncementAudienceScope; label: string }> = [
    { value: 'all_visitors', label: '全站访客' },
    { value: 'signed_in_only', label: '仅登录用户' },
];

function toDatetimeLocalValue(value: string | null) {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (part: number) => String(part).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function emptyFormState(): AnnouncementFormState {
    return {
        id: null,
        title: '',
        content: '',
        ctaLabel: '',
        ctaHref: '',
        status: 'draft',
        priority: 'normal',
        displayOrder: 0,
        startsAt: '',
        endsAt: '',
        popupEnabled: true,
        audienceScope: 'all_visitors',
        version: 1,
        publishedAt: null,
        updatedAt: null,
    };
}

function announcementToFormState(announcement: Announcement): AnnouncementFormState {
    return {
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        ctaLabel: announcement.ctaLabel || '',
        ctaHref: announcement.ctaHref || '',
        status: announcement.status,
        priority: announcement.priority,
        displayOrder: announcement.displayOrder,
        startsAt: toDatetimeLocalValue(announcement.startsAt),
        endsAt: toDatetimeLocalValue(announcement.endsAt),
        popupEnabled: announcement.popupEnabled,
        audienceScope: announcement.audienceScope,
        version: announcement.version,
        publishedAt: announcement.publishedAt,
        updatedAt: announcement.updatedAt,
    };
}

function statusTone(status: AnnouncementStatus) {
    if (status === 'published') return 'bg-blue-50 text-[#2eaadc] border-blue-100';
    if (status === 'archived') return 'bg-gray-100 text-foreground/40 border-gray-200';
    return 'bg-[#dfab01]/5 text-[#dfab01] border-[#dfab01]/10';
}

function formatTime(value: string | null) {
    if (!value) return '未发布';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '时间无效';
    return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

export function AnnouncementManagementPanel() {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editorState, setEditorState] = useState<AnnouncementEditorState>({
        mode: 'create',
        selectedId: null,
    });
    const [form, setForm] = useState<AnnouncementFormState>(emptyFormState());
    const [error, setError] = useState<string | null>(null);
    const { showToast } = useToast();
    const editorStateRef = useRef(editorState);

    useEffect(() => {
        editorStateRef.current = editorState;
    }, [editorState]);

    const getToken = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token || null;
    }, []);

    const loadAnnouncements = useCallback(async (preferredState?: AnnouncementEditorState) => {
        setLoading(true);
        setError(null);

        try {
            const token = await getToken();
            if (!token) {
                setError('未登录');
                return;
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
            const nextEditorState = resolveAnnouncementEditorStateAfterLoad(
                editorStateRef.current,
                nextAnnouncements,
                preferredState,
            );
            setEditorState(nextEditorState);
            if (nextEditorState.mode === 'create') {
                setForm(emptyFormState());
            } else if (nextEditorState.selectedId) {
                const selected = nextAnnouncements.find((item) => item.id === nextEditorState.selectedId);
                if (selected) {
                    setForm(announcementToFormState(selected));
                }
            }
        } catch (e) {
            setError(e instanceof Error ? e.message : '获取公告列表失败');
        } finally {
            setLoading(false);
        }
    }, [getToken]);

    useEffect(() => {
        void loadAnnouncements();
    }, [loadAnnouncements]);

    const selectedAnnouncement = useMemo(
        () => announcements.find((item) => item.id === editorState.selectedId) || null,
        [announcements, editorState.selectedId],
    );

    const startCreateAnnouncement = () => {
        setEditorState({
            mode: 'create',
            selectedId: null,
        });
        setForm(emptyFormState());
    };

    const selectAnnouncement = (announcement: Announcement) => {
        setEditorState({
            mode: 'edit',
            selectedId: announcement.id,
        });
        setForm(announcementToFormState(announcement));
    };

    const saveAnnouncement = async () => {
        setSaving(true);
        try {
            const token = await getToken();
            if (!token) {
                throw new Error('未登录');
            }

            const payload = {
                title: form.title,
                content: form.content,
                ctaLabel: form.ctaLabel.trim() || null,
                ctaHref: form.ctaHref.trim() || null,
                status: form.status,
                priority: form.priority,
                displayOrder: form.displayOrder,
                startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : null,
                endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
                popupEnabled: form.popupEnabled,
                audienceScope: form.audienceScope,
            };

            const response = await fetch(
                form.id ? `/api/admin/announcements/${form.id}` : '/api/admin/announcements',
                {
                    method: form.id ? 'PATCH' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(payload),
                },
            );
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(typeof data.error === 'string' ? data.error : '保存公告失败');
            }

            const saved = data.announcement as Announcement;
            const preferredState: AnnouncementEditorState = {
                mode: 'edit',
                selectedId: saved.id,
            };
            setEditorState(preferredState);
            setForm(announcementToFormState(saved));
            showToast('success', form.id ? '公告已更新' : '公告已创建');
            await loadAnnouncements(preferredState);
        } catch (e) {
            showToast('error', e instanceof Error ? e.message : '保存公告失败');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <SoundWaveLoader variant="block" text="加载公告中" />;
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-background text-center">
                <p className="text-red-500 mb-6 text-sm font-medium">{error}</p>
                <button
                    onClick={() => { void loadAnnouncements(); }}
                    className="px-4 py-2 rounded-md bg-[#2383e2] text-white text-sm font-bold hover:bg-[#2383e2]/90 transition-all"
                >
                    重试
                </button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-8">
            {/* 左侧列表 */}
            <div className="space-y-6">
                <div className="bg-background border border-gray-200 rounded-md p-4">
                    <div className="flex items-center justify-between gap-3 mb-1">
                        <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/60">公告列表</h2>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => { void loadAnnouncements(); }}
                                className="p-1.5 rounded-md hover:bg-[#efedea] text-foreground/40 transition-colors"
                                title="刷新"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={startCreateAnnouncement}
                                className="flex items-center gap-1 px-2.5 py-1 bg-[#2383e2] text-white text-xs font-bold rounded-md hover:bg-[#2383e2]/90 transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                新建
                            </button>
                        </div>
                    </div>
                    <p className="text-[11px] text-foreground/30">管理站点轮播公告与紧急通知</p>
                </div>

                <div className="space-y-2 max-h-[72vh] overflow-y-auto pr-1 no-scrollbar">
                    {announcements.length === 0 ? (
                        <div className="rounded-md border border-dashed border-gray-200 p-8 text-[11px] text-foreground/30 text-center uppercase tracking-widest">
                            No announcements
                        </div>
                    ) : announcements.map((announcement) => (
                        <button
                            key={announcement.id}
                            onClick={() => selectAnnouncement(announcement)}
                            className={`w-full text-left rounded-md border p-4 transition-all duration-150 ${
                                editorState.selectedId === announcement.id && editorState.mode === 'edit'
                                    ? 'border-[#2eaadc] bg-blue-50/20 shadow-sm'
                                    : 'border-gray-200 bg-background hover:bg-[#efedea] hover:border-gray-300'
                            }`}
                        >
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-tighter ${statusTone(announcement.status)}`}>
                                        {STATUS_OPTIONS.find((item) => item.value === announcement.status)?.label}
                                    </span>
                                    {announcement.priority === 'critical' && (
                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-[#eb5757] border border-red-100 font-bold uppercase tracking-tighter">
                                            Critical
                                        </span>
                                    )}
                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-background border border-gray-100 text-foreground/30 font-mono">
                                        v{announcement.version}
                                    </span>
                                </div>
                                <div className="space-y-1">
                                    <div className="text-sm font-bold text-foreground/80 truncate">{announcement.title}</div>
                                    <div className="text-xs text-foreground/40 line-clamp-2 leading-relaxed">
                                        {announcement.content}
                                    </div>
                                </div>
                                <div className="text-[10px] font-mono text-foreground/20 uppercase">
                                    {formatTime(announcement.publishedAt || announcement.createdAt)}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* 右侧编辑区 */}
            <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_380px] gap-8">
                <div className="bg-background border border-gray-200 rounded-md overflow-hidden flex flex-col">
                    <div className="px-6 py-4 border-b border-gray-100 bg-[#f7f6f3]/50 flex items-center justify-between">
                        <div className="space-y-0.5">
                            <h2 className="text-sm font-bold uppercase tracking-widest text-foreground/60">
                                {selectedAnnouncement ? 'Edit Announcement' : 'Create New'}
                            </h2>
                            <p className="text-[11px] text-foreground/30 italic">
                                {selectedAnnouncement ? '编辑后版本号将自动递增' : '填写下方表单发布新公告'}
                            </p>
                        </div>
                        <button
                            onClick={saveAnnouncement}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-1.5 bg-[#2383e2] text-white text-xs font-bold rounded-md hover:bg-[#2383e2]/90 transition-colors disabled:opacity-50"
                        >
                            {saving ? <SoundWaveLoader variant="inline" /> : <Save className="w-3.5 h-3.5" />}
                            保存并发布
                        </button>
                    </div>

                    <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
                        <div className="grid md:grid-cols-[1fr_120px] gap-6">
                            <Field label="公告标题" icon={TypeIcon}>
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
                                    className="w-full px-3 py-1.5 rounded-md border border-gray-200 bg-background text-sm text-foreground focus:border-[#2eaadc] outline-none transition-colors"
                                    placeholder="例如：系统维护公告"
                                />
                            </Field>
                            <Field label="顺序" icon={LayoutGrid}>
                                <input
                                    type="number"
                                    value={form.displayOrder}
                                    onChange={(e) => setForm((current) => ({ ...current, displayOrder: Number(e.target.value) || 0 }))}
                                    className="w-full px-3 py-1.5 rounded-md border border-gray-200 bg-background text-sm text-foreground focus:border-[#2eaadc] outline-none transition-colors"
                                />
                            </Field>
                        </div>

                        <Field label="内容正文" icon={Megaphone}>
                            <textarea
                                value={form.content}
                                onChange={(e) => setForm((current) => ({ ...current, content: e.target.value }))}
                                className="w-full min-h-[200px] px-3 py-3 rounded-md border border-gray-200 bg-background text-sm leading-7 text-foreground focus:border-[#2eaadc] outline-none transition-colors resize-none placeholder:text-foreground/10"
                                placeholder="公告正文内容，支持换行..."
                            />
                        </Field>

                        <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-gray-50">
                            <Field label="按钮文案" icon={Tag}>
                                <input
                                    type="text"
                                    value={form.ctaLabel}
                                    onChange={(e) => setForm((current) => ({ ...current, ctaLabel: e.target.value }))}
                                    className="w-full px-3 py-1.5 rounded-md border border-gray-200 bg-background text-sm text-foreground focus:border-[#2eaadc] outline-none transition-colors"
                                    placeholder="例如：查看详情"
                                />
                            </Field>
                            <Field label="按钮链接" icon={ChevronRight}>
                                <input
                                    type="text"
                                    value={form.ctaHref}
                                    onChange={(e) => setForm((current) => ({ ...current, ctaHref: e.target.value }))}
                                    className="w-full px-3 py-1.5 rounded-md border border-gray-200 bg-background text-sm text-foreground focus:border-[#2eaadc] outline-none transition-colors font-mono"
                                    placeholder="/path 或 https://..."
                                />
                            </Field>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4 pt-4 border-t border-gray-50">
                            <Field label="状态" icon={RefreshCw}>
                                <select
                                    value={form.status}
                                    onChange={(e) => setForm((current) => ({ ...current, status: e.target.value as AnnouncementStatus }))}
                                    className="w-full px-2 py-1.5 rounded-md border border-gray-200 bg-background text-sm text-foreground outline-none cursor-pointer hover:bg-[#efedea] transition-colors"
                                >
                                    {STATUS_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="优先级" icon={Star}>
                                <select
                                    value={form.priority}
                                    onChange={(e) => setForm((current) => ({ ...current, priority: e.target.value as AnnouncementPriority }))}
                                    className="w-full px-2 py-1.5 rounded-md border border-gray-200 bg-background text-sm text-foreground outline-none cursor-pointer hover:bg-[#efedea] transition-colors"
                                >
                                    {PRIORITY_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="范围" icon={LayoutGrid}>
                                <select
                                    value={form.audienceScope}
                                    onChange={(e) => setForm((current) => ({ ...current, audienceScope: e.target.value as AnnouncementAudienceScope }))}
                                    className="w-full px-2 py-1.5 rounded-md border border-gray-200 bg-background text-sm text-foreground outline-none cursor-pointer hover:bg-[#efedea] transition-colors"
                                >
                                    {AUDIENCE_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                    ))}
                                </select>
                            </Field>
                        </div>

                        <div className="grid md:grid-cols-2 gap-6 pt-4 border-t border-gray-50">
                            <Field label="生效时间" icon={Plus}>
                                <input
                                    type="datetime-local"
                                    value={form.startsAt}
                                    onChange={(e) => setForm((current) => ({ ...current, startsAt: e.target.value }))}
                                    className="w-full px-3 py-1.5 rounded-md border border-gray-200 bg-background text-xs text-foreground outline-none"
                                />
                            </Field>
                            <Field label="失效时间" icon={X}>
                                <input
                                    type="datetime-local"
                                    value={form.endsAt}
                                    onChange={(e) => setForm((current) => ({ ...current, endsAt: e.target.value }))}
                                    className="w-full px-3 py-1.5 rounded-md border border-gray-200 bg-background text-xs text-foreground outline-none"
                                />
                            </Field>
                        </div>

                        <label className="flex items-center justify-between p-4 rounded-md border border-gray-100 bg-[#f7f6f3]/50 cursor-pointer hover:bg-[#efedea]/50 transition-colors">
                            <div className="space-y-0.5">
                                <div className="text-xs font-bold text-foreground/70 uppercase">Enable Popup</div>
                                <div className="text-[11px] text-foreground/30">开启后将进入全站弹窗轮播列表</div>
                            </div>
                            <input
                                type="checkbox"
                                checked={form.popupEnabled}
                                onChange={(e) => setForm((current) => ({ ...current, popupEnabled: e.target.checked }))}
                                className="w-4 h-4 rounded border-gray-300 text-[#2eaadc] focus:ring-[#2eaadc]/30"
                            />
                        </label>
                    </div>
                </div>

                {/* 预览区 */}
                <div className="space-y-6">
                    <div className="bg-background border border-gray-200 rounded-md overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 bg-[#f7f6f3]/50">
                            <h3 className="text-sm font-bold uppercase tracking-widest text-foreground/60">Live Preview</h3>
                            <p className="text-[11px] text-foreground/30 mt-1">
                                这是用户在进入网站时看到的真实样式。
                            </p>
                        </div>
                        <div className="p-10 bg-[#efedea]/20 flex items-center justify-center">
                            <div className="w-full max-w-sm bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden pointer-events-none">
                                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-[#f7f6f3]/50">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded bg-blue-50 text-[#2eaadc]">
                                            <Megaphone className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="text-[10px] font-bold text-foreground/30 uppercase tracking-widest">Announcement</span>
                                    </div>
                                    <X className="w-3.5 h-3.5 text-foreground/20" />
                                </div>
                                <div className="p-6 space-y-3">
                                    <h4 className="text-base font-bold text-foreground leading-tight">
                                        {form.title || '这里展示公告标题'}
                                    </h4>
                                    <p className="text-xs text-foreground/50 leading-relaxed line-clamp-4 whitespace-pre-wrap">
                                        {form.content || '这里展示公告内容，支持较长正文，用于维护通知、活动公告或重要更新提醒。'}
                                    </p>
                                </div>
                                <div className="px-6 py-3 border-t border-gray-100 bg-[#f7f6f3]/30 flex items-center justify-between">
                                    <div className="text-[10px] font-mono text-foreground/20 uppercase">v{form.version}</div>
                                    <button className="px-3 py-1 bg-[#2383e2] text-white text-[10px] font-bold rounded transition-colors">
                                        {form.ctaLabel || '了解详情'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-background border border-gray-200 rounded-md p-4 space-y-3">
                        <div className="flex justify-between items-center text-[11px]">
                            <span className="font-bold text-foreground/30 uppercase tracking-widest">Database ID</span>
                            <span className="font-mono text-foreground/60">{selectedAnnouncement ? selectedAnnouncement.id : 'NEW_RECORD'}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                            <span className="font-bold text-foreground/30 uppercase tracking-widest">Published At</span>
                            <span className="text-foreground/60">{formatTime(form.publishedAt)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                            <span className="font-bold text-foreground/30 uppercase tracking-widest">Version Control</span>
                            <span className="px-1.5 py-0.5 rounded bg-gray-100 font-mono text-foreground/60">REV_{form.version}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Field({ label, icon: Icon, children }: { label: string; icon?: any; children: React.ReactNode }) {
    return (
        <label className="block space-y-2">
            <div className="flex items-center gap-2 px-1 text-[11px] font-bold text-foreground/30 uppercase tracking-widest">
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {label}
            </div>
            {children}
        </label>
    );
}

function TypeIcon({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <polyline points="4 7 4 4 20 4 20 7" />
            <line x1="9" y1="20" x2="15" y2="20" />
            <line x1="12" y1="4" x2="12" y2="20" />
        </svg>
    );
}
