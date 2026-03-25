'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Plus, RefreshCw, Save, Megaphone, ChevronRight } from 'lucide-react';
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
    { value: 'critical', label: '红色高优先级' },
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
    if (status === 'published') return 'bg-red-500/10 text-red-600';
    if (status === 'archived') return 'bg-slate-500/10 text-slate-500';
    return 'bg-amber-500/10 text-amber-600';
}

function priorityTone(priority: AnnouncementPriority) {
    return priority === 'critical'
        ? 'bg-red-500 text-white'
        : 'bg-background-secondary text-foreground-secondary';
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
            <div className="text-center py-12">
                <p className="text-red-500 mb-4">{error}</p>
                <button
                    onClick={() => {
                        void loadAnnouncements();
                    }}
                    className="px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent/90"
                >
                    重试
                </button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)] gap-6">
            <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <h2 className="text-base font-semibold">公告列表</h2>
                            <p className="text-xs text-foreground-secondary mt-1">
                                按发布时间倒序，点击可编辑历史公告。
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => {
                                    void loadAnnouncements();
                                }}
                                className="p-2 rounded-lg bg-background-secondary hover:bg-background-secondary/80 transition-colors"
                                title="刷新"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                                onClick={startCreateAnnouncement}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500 text-white hover:bg-red-500/90 transition-colors text-sm"
                            >
                                <Plus className="w-4 h-4" />
                                新建
                            </button>
                        </div>
                    </div>
                </div>

                <div className="space-y-3 max-h-[72vh] overflow-y-auto pr-1">
                    {announcements.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-foreground-secondary text-center">
                            还没有公告，先创建第一条。
                        </div>
                    ) : announcements.map((announcement) => (
                        <button
                            key={announcement.id}
                            onClick={() => selectAnnouncement(announcement)}
                            className={`w-full text-left rounded-2xl border p-4 transition-all ${
                                editorState.selectedId === announcement.id && editorState.mode === 'edit'
                                    ? 'border-red-500 bg-red-500/5 shadow-[0_0_0_1px_rgba(239,68,68,0.25)]'
                                    : 'border-border bg-background hover:border-red-500/30 hover:bg-background-secondary/30'
                            }`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-2">
                                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${statusTone(announcement.status)}`}>
                                            {STATUS_OPTIONS.find((item) => item.value === announcement.status)?.label}
                                        </span>
                                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${priorityTone(announcement.priority)}`}>
                                            {announcement.priority === 'critical' ? '红色' : '普通'}
                                        </span>
                                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-background-secondary text-foreground-secondary">
                                            v{announcement.version}
                                        </span>
                                    </div>
                                    <div className="font-medium truncate">{announcement.title}</div>
                                    <div className="text-xs text-foreground-secondary mt-1 line-clamp-2">
                                        {announcement.content}
                                    </div>
                                    <div className="text-[11px] text-foreground-tertiary mt-2">
                                        {formatTime(announcement.publishedAt || announcement.createdAt)}
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-foreground-tertiary shrink-0 mt-1" />
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_380px] gap-6">
                <div className="rounded-2xl border border-border bg-background overflow-hidden">
                    <div className="px-5 py-4 border-b border-border bg-background-secondary/40 flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-semibold">
                                {selectedAnnouncement ? '编辑公告' : '创建公告'}
                            </h2>
                            <p className="text-xs text-foreground-secondary mt-1">
                                已发布公告可直接编辑，保存后会自动递增版本号。
                            </p>
                        </div>
                        <button
                            onClick={saveAnnouncement}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500 text-white hover:bg-red-500/90 transition-colors disabled:opacity-60"
                        >
                            {saving ? <SoundWaveLoader variant="inline" /> : <Save className="w-4 h-4" />}
                            保存公告
                        </button>
                    </div>

                    <div className="p-5 space-y-5">
                        <div className="grid md:grid-cols-2 gap-4">
                            <Field label="公告标题">
                                <input
                                    type="text"
                                    value={form.title}
                                    onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                                    placeholder="例如：系统维护公告"
                                />
                            </Field>
                            <Field label="展示顺序">
                                <input
                                    type="number"
                                    value={form.displayOrder}
                                    onChange={(e) => setForm((current) => ({ ...current, displayOrder: Number(e.target.value) || 0 }))}
                                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                                />
                            </Field>
                        </div>

                        <Field label="公告内容">
                            <textarea
                                value={form.content}
                                onChange={(e) => setForm((current) => ({ ...current, content: e.target.value }))}
                                className="w-full min-h-[160px] px-3 py-3 rounded-xl border border-border bg-background text-sm leading-6 resize-y"
                                placeholder="进入网站后弹出的正文内容"
                            />
                        </Field>

                        <div className="grid md:grid-cols-2 gap-4">
                            <Field label="按钮文案">
                                <input
                                    type="text"
                                    value={form.ctaLabel}
                                    onChange={(e) => setForm((current) => ({ ...current, ctaLabel: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                                    placeholder="例如：查看详情"
                                />
                            </Field>
                            <Field label="按钮链接">
                                <input
                                    type="text"
                                    value={form.ctaHref}
                                    onChange={(e) => setForm((current) => ({ ...current, ctaHref: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                                    placeholder="/status 或 https://..."
                                />
                            </Field>
                        </div>

                        <div className="grid md:grid-cols-3 gap-4">
                            <Field label="状态">
                                <select
                                    value={form.status}
                                    onChange={(e) => setForm((current) => ({ ...current, status: e.target.value as AnnouncementStatus }))}
                                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                                >
                                    {STATUS_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="优先级">
                                <select
                                    value={form.priority}
                                    onChange={(e) => setForm((current) => ({ ...current, priority: e.target.value as AnnouncementPriority }))}
                                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                                >
                                    {PRIORITY_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                            <Field label="受众范围">
                                <select
                                    value={form.audienceScope}
                                    onChange={(e) => setForm((current) => ({ ...current, audienceScope: e.target.value as AnnouncementAudienceScope }))}
                                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                                >
                                    {AUDIENCE_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </Field>
                        </div>

                        <div className="grid md:grid-cols-2 gap-4">
                            <Field label="开始时间">
                                <input
                                    type="datetime-local"
                                    value={form.startsAt}
                                    onChange={(e) => setForm((current) => ({ ...current, startsAt: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                                />
                            </Field>
                            <Field label="结束时间">
                                <input
                                    type="datetime-local"
                                    value={form.endsAt}
                                    onChange={(e) => setForm((current) => ({ ...current, endsAt: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                                />
                            </Field>
                        </div>

                        <label className="flex items-center justify-between rounded-2xl border border-border bg-background-secondary/20 px-4 py-3">
                            <div>
                                <div className="font-medium">启用进站弹窗</div>
                                <div className="text-xs text-foreground-secondary mt-1">
                                    关闭后公告仍保留在管理台，但不会进入弹窗轮播。
                                </div>
                            </div>
                            <input
                                type="checkbox"
                                checked={form.popupEnabled}
                                onChange={(e) => setForm((current) => ({ ...current, popupEnabled: e.target.checked }))}
                            />
                        </label>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="rounded-2xl border border-border bg-background overflow-hidden">
                        <div className="px-5 py-4 border-b border-border bg-background-secondary/40">
                            <h3 className="text-base font-semibold">弹窗预览</h3>
                            <p className="text-xs text-foreground-secondary mt-1">
                                公告和通知完全分离，用户进入网站时只会看到这个弹窗样式。
                            </p>
                        </div>
                        <div className="p-5 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.16),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.94),rgba(255,255,255,1))]">
                            <div className="rounded-[28px] border border-red-200 bg-white shadow-[0_18px_48px_rgba(185,28,28,0.14)] overflow-hidden">
                                <div className="px-5 py-4 border-b border-red-100 bg-red-50 flex items-center gap-3">
                                    <div className="w-11 h-11 rounded-2xl bg-red-500 text-white flex items-center justify-center shadow-sm">
                                        <Megaphone className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-500 text-white font-semibold">公告</span>
                                            <span className="text-[11px] px-2 py-0.5 rounded-full bg-white text-red-500 border border-red-200">
                                                {form.priority === 'critical' ? '高优先级' : '普通'}
                                            </span>
                                        </div>
                                        <div className="text-xs text-red-700 mt-1">进入站点后自动弹出</div>
                                    </div>
                                </div>
                                <div className="px-5 py-5">
                                    <h4 className="text-lg font-semibold text-foreground">
                                        {form.title || '这里展示公告标题'}
                                    </h4>
                                    <p className="text-sm text-foreground-secondary leading-7 mt-3 whitespace-pre-wrap">
                                        {form.content || '这里展示公告内容，支持较长正文，用于维护通知、活动公告或重要更新提醒。'}
                                    </p>
                                </div>
                                <div className="px-5 py-4 border-t border-red-100 bg-red-50/70 flex items-center justify-between gap-3">
                                    <div className="text-xs text-foreground-secondary">
                                        v{form.version}{selectedAnnouncement?.updatedAt ? ` · 更新于 ${formatTime(selectedAnnouncement.updatedAt)}` : ''}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button className="px-3 py-2 rounded-lg text-sm border border-red-200 text-red-600 bg-white">
                                            今日关闭
                                        </button>
                                        <button className="px-3 py-2 rounded-lg text-sm bg-red-500 text-white">
                                            {form.ctaLabel || '查看详情'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-border bg-background p-4 text-sm text-foreground-secondary">
                        <p>当前记录：{selectedAnnouncement ? selectedAnnouncement.id : '新公告'}</p>
                        <p className="mt-2">发布时间：{formatTime(form.publishedAt)}</p>
                        <p className="mt-2">版本号：v{form.version}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="block">
            <div className="text-xs font-medium text-foreground-secondary mb-2">{label}</div>
            {children}
        </label>
    );
}
