'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookOpenText, CalendarDays, Plus, Save, Trash2 } from 'lucide-react';
import {
    BAZI_CASE_ADVANCED_GOD_OPTIONS,
    BAZI_CASE_BASIC_ELEMENTS,
    BAZI_CASE_EDUCATION_OPTIONS,
    BAZI_CASE_EVENT_CATEGORY_OPTIONS,
    BAZI_CASE_FAMILY_TAG_OPTIONS,
    BAZI_CASE_HEALTH_STATUS_OPTIONS,
    BAZI_CASE_MARRIAGE_STATUS_OPTIONS,
    BAZI_CASE_OCCUPATION_OPTIONS,
    BAZI_CASE_PATTERN_OPTIONS,
    BAZI_CASE_STRENGTH_LEVELS,
    BAZI_CASE_TEMPERAMENT_TAG_OPTIONS,
    BAZI_CASE_WEALTH_LEVEL_OPTIONS,
    createEmptyBaziCaseProfile,
    type BaziCaseEvent,
    type BaziCaseGodSelection,
    type BaziCaseProfile,
} from '@/lib/bazi-case-profile';
import { loadBaziCaseProfile, saveBaziCaseProfile } from '@/lib/bazi-case-profile-client';
import { useToast } from '@/components/ui/Toast';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';

type NotesTab = 'owner' | 'master';
type GodKey = 'yongShen' | 'xiShen' | 'jiShen' | 'xianShen';

function cx(...values: Array<string | false | null | undefined>) {
    return values.filter(Boolean).join(' ');
}

function ToggleChips<T extends string>({
    title,
    options,
    values,
    onToggle,
    compact = false,
}: {
    title: string;
    options: readonly T[];
    values: T[];
    onToggle: (value: T) => void;
    compact?: boolean;
}) {
    return (
        <div className="space-y-2">
            <div className="text-sm font-medium text-foreground-secondary">{title}</div>
            <div className="flex flex-wrap gap-2">
                {options.map((option) => {
                    const selected = values.includes(option);
                    return (
                        <button
                            key={option}
                            type="button"
                            onClick={() => onToggle(option)}
                            className={cx(
                                'rounded-full border transition-colors',
                                compact ? 'px-3 py-1 text-xs' : 'px-3 py-1.5 text-sm',
                                selected
                                    ? 'border-accent bg-accent text-white'
                                    : 'border-border bg-background hover:border-accent/40 hover:text-accent'
                            )}
                        >
                            {option}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

function SingleSelectField<T extends string>({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: T | null;
    options: readonly T[];
    onChange: (value: T | null) => void;
}) {
    return (
        <label className="space-y-2">
            <div className="text-sm font-medium text-foreground-secondary">{label}</div>
            <select
                value={value ?? ''}
                onChange={(event) => onChange((event.target.value || null) as T | null)}
                className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent"
            >
                <option value="">未填写</option>
                {options.map((option) => (
                    <option key={option} value={option}>
                        {option}
                    </option>
                ))}
            </select>
        </label>
    );
}

function TextAreaField({
    label,
    value,
    onChange,
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
}) {
    return (
        <label className="space-y-2">
            <div className="text-sm font-medium text-foreground-secondary">{label}</div>
            <textarea
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                rows={4}
                className="w-full rounded-2xl border border-border bg-background px-3 py-3 text-sm outline-none transition-colors focus:border-accent"
            />
        </label>
    );
}

function GodSelectionField({
    label,
    value,
    onChange,
}: {
    label: string;
    value: BaziCaseGodSelection;
    onChange: (value: BaziCaseGodSelection) => void;
}) {
    const toggleBasic = (option: typeof BAZI_CASE_BASIC_ELEMENTS[number]) => {
        onChange({
            ...value,
            basic: value.basic.includes(option)
                ? value.basic.filter((item) => item !== option)
                : [...value.basic, option],
        });
    };

    const toggleAdvanced = (option: typeof BAZI_CASE_ADVANCED_GOD_OPTIONS[number]) => {
        onChange({
            ...value,
            advanced: value.advanced.includes(option)
                ? value.advanced.filter((item) => item !== option)
                : [...value.advanced, option],
        });
    };

    return (
        <div className="rounded-2xl border border-border bg-background-secondary/60 p-4 space-y-4">
            <div className="font-medium">{label}</div>
            <ToggleChips title="基础五行" options={BAZI_CASE_BASIC_ELEMENTS} values={value.basic} onToggle={toggleBasic} />
            <ToggleChips title="进阶字项" options={BAZI_CASE_ADVANCED_GOD_OPTIONS} values={value.advanced} onToggle={toggleAdvanced} compact />
        </div>
    );
}

function EventEditor({
    event,
    onChange,
    onDelete,
}: {
    event: BaziCaseEvent;
    onChange: (event: BaziCaseEvent) => void;
    onDelete: () => void;
}) {
    return (
        <div className="rounded-2xl border border-border bg-background-secondary/60 p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium">
                    <CalendarDays className="w-4 h-4 text-accent" />
                    关键事件
                </div>
                <button
                    type="button"
                    onClick={onDelete}
                    className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-foreground-secondary hover:text-red-500"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                    删除
                </button>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-2">
                    <div className="text-sm font-medium text-foreground-secondary">日期</div>
                    <input
                        type="date"
                        value={event.eventDate}
                        onChange={(e) => onChange({ ...event, eventDate: e.target.value })}
                        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent"
                    />
                </label>
                <SingleSelectField
                    label="类别"
                    value={event.category}
                    options={BAZI_CASE_EVENT_CATEGORY_OPTIONS}
                    onChange={(value) => onChange({ ...event, category: (value || '其他') as BaziCaseEvent['category'] })}
                />
            </div>
            <label className="space-y-2">
                <div className="text-sm font-medium text-foreground-secondary">事件标题</div>
                <input
                    value={event.title}
                    onChange={(e) => onChange({ ...event, title: e.target.value })}
                    placeholder="例如：岗位晋升、订婚、搬家"
                    className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none transition-colors focus:border-accent"
                />
            </label>
            <TextAreaField
                label="事件说明"
                value={event.detail}
                onChange={(detail) => onChange({ ...event, detail })}
                placeholder="记录发生时间点、实际结果、命理应验点等"
            />
        </div>
    );
}

export function CaseNotesSection({ chartId }: { chartId?: string | null }) {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<NotesTab>('owner');
    const [profile, setProfile] = useState<BaziCaseProfile>(createEmptyBaziCaseProfile());
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!chartId) {
            setProfile(createEmptyBaziCaseProfile());
            return;
        }

        let cancelled = false;
        setLoading(true);
        loadBaziCaseProfile(chartId)
            .then((nextProfile) => {
                if (cancelled) return;
                setProfile(nextProfile || { ...createEmptyBaziCaseProfile(), chartId });
            })
            .catch((error) => {
                if (cancelled) return;
                console.error('[CaseNotesSection] failed to load profile:', error);
                setProfile({ ...createEmptyBaziCaseProfile(), chartId });
                showToast('error', error instanceof Error ? error.message : '加载断事笔记失败');
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [chartId, showToast]);

    const orderedEvents = useMemo(
        () => profile.events
            .map((event, index) => ({ event, index }))
            .sort((left, right) => right.event.eventDate.localeCompare(left.event.eventDate)),
        [profile.events],
    );

    const updateGodSelection = (key: GodKey, value: BaziCaseGodSelection) => {
        setProfile((prev) => ({
            ...prev,
            masterReview: {
                ...prev.masterReview,
                [key]: value,
            },
        }));
    };

    const addEvent = () => {
        setProfile((prev) => ({
            ...prev,
            events: [
                {
                    eventDate: new Date().toISOString().slice(0, 10),
                    category: '其他',
                    title: '',
                    detail: '',
                },
                ...prev.events,
            ],
        }));
    };

    const updateEvent = (index: number, nextEvent: BaziCaseEvent) => {
        setProfile((prev) => ({
            ...prev,
            events: prev.events.map((event, currentIndex) => currentIndex === index ? nextEvent : event),
        }));
    };

    const deleteEvent = (index: number) => {
        setProfile((prev) => ({
            ...prev,
            events: prev.events.filter((_, currentIndex) => currentIndex !== index),
        }));
    };

    const handleSave = async () => {
        if (!chartId) {
            showToast('info', '请先保存命盘，再录入断事笔记');
            return;
        }
        setSaving(true);
        try {
            const savedProfile = await saveBaziCaseProfile({
                chartId,
                masterReview: profile.masterReview,
                ownerFeedback: profile.ownerFeedback,
                events: profile.events,
            });
            setProfile(savedProfile);
            showToast('success', '断事笔记已保存');
        } catch (error) {
            console.error('[CaseNotesSection] failed to save profile:', error);
            showToast('error', error instanceof Error ? error.message : '保存断事笔记失败');
        } finally {
            setSaving(false);
        }
    };

    if (!chartId) {
        return (
            <section className="rounded-3xl border border-border bg-background-secondary p-6 text-center space-y-3">
                <div className="flex justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                        <BookOpenText className="w-6 h-6" />
                    </div>
                </div>
                <div className="text-lg font-semibold">断事笔记需要先绑定命盘</div>
                <p className="text-sm text-foreground-secondary">
                    先保存当前八字，再录入师傅点评和命主反馈，后续 AI 才能自动引用这些资料。
                </p>
            </section>
        );
    }

    if (loading) {
        return <SoundWaveLoader variant="block" text="正在加载断事笔记" />;
    }

    return (
        <div className="space-y-4">
            <section className="rounded-3xl border border-border bg-background-secondary p-4 md:p-5">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold flex items-center gap-2">
                            <BookOpenText className="w-5 h-5 text-accent" />
                            断事笔记
                        </h2>
                        <p className="mt-1 text-sm text-foreground-secondary">
                            结构化录入师傅点评与命主反馈，当前绑定八字的 AI 会自动引用这些信息。
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? '保存中...' : '保存笔记'}
                    </button>
                </div>
            </section>

            <div className="flex gap-2 rounded-2xl bg-background-secondary p-1">
                {[
                    { id: 'owner', label: '命主反馈' },
                    { id: 'master', label: '师傅点评' },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id as NotesTab)}
                        className={cx(
                            'flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
                            activeTab === tab.id
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-foreground-secondary hover:text-foreground'
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeTab === 'master' ? (
                <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <SingleSelectField
                            label="旺衰"
                            value={profile.masterReview.strengthLevel}
                            options={BAZI_CASE_STRENGTH_LEVELS}
                            onChange={(strengthLevel) => setProfile((prev) => ({
                                ...prev,
                                masterReview: { ...prev.masterReview, strengthLevel },
                            }))}
                        />
                        <ToggleChips
                            title="格局"
                            options={BAZI_CASE_PATTERN_OPTIONS}
                            values={profile.masterReview.patterns}
                            onToggle={(pattern) => setProfile((prev) => ({
                                ...prev,
                                masterReview: {
                                    ...prev.masterReview,
                                    patterns: prev.masterReview.patterns.includes(pattern)
                                        ? prev.masterReview.patterns.filter((item) => item !== pattern)
                                        : [...prev.masterReview.patterns, pattern],
                                },
                            }))}
                        />
                    </div>

                    <div className="grid gap-4">
                        <GodSelectionField label="用神" value={profile.masterReview.yongShen} onChange={(value) => updateGodSelection('yongShen', value)} />
                        <GodSelectionField label="喜神" value={profile.masterReview.xiShen} onChange={(value) => updateGodSelection('xiShen', value)} />
                        <GodSelectionField label="忌神" value={profile.masterReview.jiShen} onChange={(value) => updateGodSelection('jiShen', value)} />
                        <GodSelectionField label="闲神" value={profile.masterReview.xianShen} onChange={(value) => updateGodSelection('xianShen', value)} />
                    </div>

                    <TextAreaField
                        label="师傅总结"
                        value={profile.masterReview.summary}
                        onChange={(summary) => setProfile((prev) => ({
                            ...prev,
                            masterReview: { ...prev.masterReview, summary },
                        }))}
                        placeholder="记录断局思路、取象重点、后续观察点"
                    />
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <SingleSelectField
                            label="职业"
                            value={profile.ownerFeedback.occupation}
                            options={BAZI_CASE_OCCUPATION_OPTIONS}
                            onChange={(occupation) => setProfile((prev) => ({
                                ...prev,
                                ownerFeedback: { ...prev.ownerFeedback, occupation },
                            }))}
                        />
                        <SingleSelectField
                            label="学历"
                            value={profile.ownerFeedback.education}
                            options={BAZI_CASE_EDUCATION_OPTIONS}
                            onChange={(education) => setProfile((prev) => ({
                                ...prev,
                                ownerFeedback: { ...prev.ownerFeedback, education },
                            }))}
                        />
                        <SingleSelectField
                            label="财富"
                            value={profile.ownerFeedback.wealthLevel}
                            options={BAZI_CASE_WEALTH_LEVEL_OPTIONS}
                            onChange={(wealthLevel) => setProfile((prev) => ({
                                ...prev,
                                ownerFeedback: { ...prev.ownerFeedback, wealthLevel },
                            }))}
                        />
                        <SingleSelectField
                            label="婚姻"
                            value={profile.ownerFeedback.marriageStatus}
                            options={BAZI_CASE_MARRIAGE_STATUS_OPTIONS}
                            onChange={(marriageStatus) => setProfile((prev) => ({
                                ...prev,
                                ownerFeedback: { ...prev.ownerFeedback, marriageStatus },
                            }))}
                        />
                        <SingleSelectField
                            label="健康状态"
                            value={profile.ownerFeedback.healthStatus}
                            options={BAZI_CASE_HEALTH_STATUS_OPTIONS}
                            onChange={(healthStatus) => setProfile((prev) => ({
                                ...prev,
                                ownerFeedback: { ...prev.ownerFeedback, healthStatus },
                            }))}
                        />
                    </div>

                    <ToggleChips
                        title="六亲状况"
                        options={BAZI_CASE_FAMILY_TAG_OPTIONS}
                        values={profile.ownerFeedback.familyStatusTags}
                        onToggle={(tag) => setProfile((prev) => ({
                            ...prev,
                            ownerFeedback: {
                                ...prev.ownerFeedback,
                                familyStatusTags: prev.ownerFeedback.familyStatusTags.includes(tag)
                                    ? prev.ownerFeedback.familyStatusTags.filter((item) => item !== tag)
                                    : [...prev.ownerFeedback.familyStatusTags, tag],
                            },
                        }))}
                    />

                    <ToggleChips
                        title="性情描述"
                        options={BAZI_CASE_TEMPERAMENT_TAG_OPTIONS}
                        values={profile.ownerFeedback.temperamentTags}
                        onToggle={(tag) => setProfile((prev) => ({
                            ...prev,
                            ownerFeedback: {
                                ...prev.ownerFeedback,
                                temperamentTags: prev.ownerFeedback.temperamentTags.includes(tag)
                                    ? prev.ownerFeedback.temperamentTags.filter((item) => item !== tag)
                                    : [...prev.ownerFeedback.temperamentTags, tag],
                            },
                        }))}
                    />

                    <TextAreaField
                        label="命主总结"
                        value={profile.ownerFeedback.summary}
                        onChange={(summary) => setProfile((prev) => ({
                            ...prev,
                            ownerFeedback: { ...prev.ownerFeedback, summary },
                        }))}
                        placeholder="记录现实反馈、长期状态、与命局印证点"
                    />
                </div>
            )}

            <section className="space-y-4 rounded-3xl border border-border bg-background-secondary p-4 md:p-5">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <h3 className="text-base font-semibold">关键事件反馈记录</h3>
                        <p className="mt-1 text-sm text-foreground-secondary">
                            保存已经发生的重要节点，后续可作为断事验证样本输入 AI。
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={addEvent}
                        className="inline-flex items-center gap-2 rounded-full border border-border px-3 py-2 text-sm font-medium hover:border-accent hover:text-accent"
                    >
                        <Plus className="w-4 h-4" />
                        新增事件
                    </button>
                </div>

                {orderedEvents.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-foreground-secondary">
                        暂无关键事件，可点击右上角新增。
                    </div>
                ) : (
                    <div className="space-y-3">
                        {orderedEvents.map(({ event, index }) => {
                            return (
                                <EventEditor
                                    key={`${event.id || 'event'}-${index}`}
                                    event={event}
                                    onChange={(nextEvent) => updateEvent(index, nextEvent)}
                                    onDelete={() => deleteEvent(index)}
                                />
                            );
                        })}
                    </div>
                )}
            </section>
        </div>
    );
}
