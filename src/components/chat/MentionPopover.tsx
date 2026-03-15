/**
 * @mention 弹出选择器组件
 *
 * 'use client' 标记说明：
 * - 使用 React hooks (useState, useEffect, useMemo, useRef)
 * - 有键盘导航和交互功能
 */
'use client';

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ChevronRight, Folder, BookOpenText, ArrowLeft, Orbit, Sparkles, Gem, Dices, ScanFace, Hand, Brain, HeartHandshake, Heart, Briefcase, Users, Calendar, CalendarDays, FileText, Compass } from 'lucide-react';
import { ChevronRight, Folder, BookOpenText, BookOpen, ArrowLeft, Orbit, Sparkles, Gem, Dices, ScanFace, Hand, Brain, HeartHandshake, Heart, Briefcase, Users, Calendar, CalendarDays, FileText } from 'lucide-react';
import type { Mention, MentionType } from '@/types';

interface MentionPopoverProps {
    query: string;
    dataSources: DataSourceSummary[];
    knowledgeBases: KnowledgeBaseSummary[];
    loadError?: string | null;
    dataSourceErrors?: DataSourceLoadError[];
    loading?: boolean;
    defaultCategory?: 'knowledge' | 'data';
    knowledgeBaseLocked?: boolean;
    onSelect: (mention: Mention) => void;
    onClose: () => void;
}

type Level = 'category' | 'subcategory' | 'type' | 'item' | 'search';

interface MentionPopoverState {
    level: Level;
    selectedCategory?: 'data' | 'knowledge';
    selectedSubcategory?: string;
    selectedType?: string;
    activeIndex: number;
}

type DataSourceSummary = {
    id: string;
    type: MentionType;
    name: string;
    preview: string;
    createdAt: string;
    hepanType?: 'love' | 'business' | 'family';
};

type DataSourceLoadError = { type: MentionType; message: string };

type KnowledgeBaseSummary = {
    id: string;
    name: string;
    description: string | null;
};

type ViewItem = {
    key: string;
    label: string;
    hint?: string;
    icon: ReactNode;
    raw?: DataSourceSummary | KnowledgeBaseSummary;
    disabled?: boolean;
};

type ViewModel = {
    title: string;
    items: ViewItem[];
};

const DATA_SUBCATEGORY_MAP: Record<string, MentionType[]> = {
    命盘: ['bazi_chart', 'ziwei_chart'],
    占卜记录: ['tarot_reading', 'liuyao_divination', 'face_reading', 'palm_reading', 'mbti_reading', 'qimen_chart'],
    合盘记录: ['hepan_chart'],
    命理记录: ['ming_record', 'daliuren_divination'],
    运势: ['daily_fortune', 'monthly_fortune']
};

const DATA_SUBCATEGORY_DIVIDE = new Set(['命盘', '占卜记录', '合盘记录']);

const TYPE_LABELS: Record<MentionType, string> = {
    knowledge_base: '知识库',
    bazi_chart: '八字命盘',
    ziwei_chart: '紫微命盘',
    tarot_reading: '塔罗占卜',
    liuyao_divination: '六爻占卜',
    face_reading: '面相分析',
    palm_reading: '手相分析',
    mbti_reading: 'MBTI 测评',
    hepan_chart: '合盘分析',
    ming_record: '命理记录',
    daily_fortune: '今日运势',
    monthly_fortune: '本月运势',
    qimen_chart: '奇门遁甲'
    daliuren_divination: '大六壬'
};

const TYPE_ICONS: Record<MentionType, ReactNode> = {
    knowledge_base: <BookOpenText className="w-4 h-4" />,
    bazi_chart: <Orbit className="w-4 h-4" />,
    ziwei_chart: <Sparkles className="w-4 h-4" />,
    tarot_reading: <Gem className="w-4 h-4" />,
    liuyao_divination: <Dices className="w-4 h-4" />,
    face_reading: <ScanFace className="w-4 h-4" />,
    palm_reading: <Hand className="w-4 h-4" />,
    mbti_reading: <Brain className="w-4 h-4" />,
    hepan_chart: <HeartHandshake className="w-4 h-4" />,
    ming_record: <FileText className="w-4 h-4" />,
    daily_fortune: <Calendar className="w-4 h-4" />,
    monthly_fortune: <CalendarDays className="w-4 h-4" />,
    qimen_chart: <Compass className="w-4 h-4" />
    daliuren_divination: <BookOpen className="w-4 h-4" />
};

const HEPAN_TYPE_LABELS: Record<string, string> = {
    love: '情侣合婚',
    business: '商业合伙',
    family: '亲子关系'
};

const HEPAN_TYPE_ICONS: Record<string, ReactNode> = {
    love: <Heart className="w-4 h-4" />,
    business: <Briefcase className="w-4 h-4" />,
    family: <Users className="w-4 h-4" />
};

const getHepanSubtype = (item: DataSourceSummary): 'love' | 'business' | 'family' | null => {
    if (item.hepanType === 'love' || item.hepanType === 'business' || item.hepanType === 'family') {
        return item.hepanType;
    }
    return null;
};

const shouldShowHint = (item: DataSourceSummary) => {
    if (item.type === 'bazi_chart' || item.type === 'ziwei_chart') return false;
    if (item.type === 'tarot_reading' || item.type === 'liuyao_divination') {
        return item.preview.startsWith('问题：');
    }
    return true;
};

function normalizeQuery(raw: string) {
    const q = raw.trim().toLowerCase();
    if (!q) return '';
    return q
        .replace(/^(?:d|data|数|数据)\s*/i, '')
        .replace(/^(?:k|kb|knowledge|知|知识库)\s*/i, '');
}

function getQueryHint(raw: string): 'data' | 'knowledge' | null {
    const q = raw.trim().toLowerCase();
    if (!q) return null;
    if (/^(?:d|data|数|数据)\b/i.test(q)) return 'data';
    if (/^(?:k|kb|knowledge|知|知识库)\b/i.test(q)) return 'knowledge';
    return null;
}

export function MentionPopover({ query, dataSources, knowledgeBases, loadError = null, dataSourceErrors = [], loading = false, defaultCategory, knowledgeBaseLocked = false, onSelect, onClose }: MentionPopoverProps) {
    const [state, setState] = useState<MentionPopoverState>({ level: 'category', activeIndex: 0 });
    const listRef = useRef<HTMLDivElement | null>(null);
    const normalizedQuery = useMemo(() => normalizeQuery(query), [query]);
    const queryHint = useMemo(() => getQueryHint(query), [query]);
    const effectiveState = useMemo<MentionPopoverState>(() => {
        if (!queryHint || normalizedQuery) return state;
        if (queryHint === 'data') {
            return { ...state, level: 'subcategory', selectedCategory: 'data', selectedSubcategory: undefined, activeIndex: 0 };
        }
        if (queryHint === 'knowledge') {
            return { ...state, level: 'item', selectedCategory: 'knowledge', selectedSubcategory: undefined, activeIndex: 0 };
        }
        return state;
    }, [queryHint, normalizedQuery, state]);
    const activeLevel: Level = normalizedQuery ? 'search' : effectiveState.level;

    useEffect(() => {
        const timer = window.setTimeout(() => {
            if (defaultCategory === 'knowledge') {
                setState({ level: 'item', selectedCategory: 'knowledge', activeIndex: 0 });
            } else if (defaultCategory === 'data') {
                setState({ level: 'subcategory', selectedCategory: 'data', activeIndex: 0 });
            }
        }, 0);
        return () => window.clearTimeout(timer);
    }, [defaultCategory]);

    const goBack = () => {
        setState(prev => {
            if (prev.level === 'item' && prev.selectedCategory === 'data' && prev.selectedSubcategory) {
                if (prev.selectedType) {
                    return { level: 'type', selectedCategory: 'data', selectedSubcategory: prev.selectedSubcategory, activeIndex: 0 };
                }
                return { level: 'subcategory', selectedCategory: 'data', activeIndex: 0 };
            }
            if (prev.level === 'type') {
                return { level: 'subcategory', selectedCategory: 'data', activeIndex: 0 };
            }
            if (prev.level === 'subcategory') {
                return { level: 'category', activeIndex: 0 };
            }
            if (prev.level === 'item' && prev.selectedCategory === 'knowledge') {
                return { level: 'category', activeIndex: 0 };
            }
            return prev;
        });
    };

    const filteredDataSources = useMemo(() => {
        if (!normalizedQuery) return dataSources;
        return dataSources.filter(item =>
            item.name.toLowerCase().includes(normalizedQuery) ||
            (item.preview || '').toLowerCase().includes(normalizedQuery)
        );
    }, [dataSources, normalizedQuery]);

    const filteredKnowledgeBases = useMemo(() => {
        if (!normalizedQuery) return knowledgeBases;
        return knowledgeBases.filter(kb =>
            kb.name.toLowerCase().includes(normalizedQuery) ||
            (kb.description || '').toLowerCase().includes(normalizedQuery)
        );
    }, [knowledgeBases, normalizedQuery]);

    const typeCounts = useMemo(() => {
        const counts = new Map<MentionType, number>();
        for (const item of dataSources) {
            counts.set(item.type, (counts.get(item.type) || 0) + 1);
        }
        return counts;
    }, [dataSources]);

    const hepanTypeCounts = useMemo(() => {
        const counts: Record<string, number> = { love: 0, business: 0, family: 0 };
        dataSources.filter(item => item.type === 'hepan_chart').forEach(item => {
            const key = getHepanSubtype(item);
            if (!key) return;
            counts[key] = (counts[key] || 0) + 1;
        });
        return counts;
    }, [dataSources]);

    const view = useMemo((): ViewModel => {
        if (activeLevel === 'search') {
            const dataItems = filteredDataSources.map((i) => ({
                key: `data-${i.id}`,
                label: `@数据 · ${i.name}`,
                hint: shouldShowHint(i) ? i.preview : '',
                icon: TYPE_ICONS[i.type],
                raw: i
            }));
            const kbItems = knowledgeBaseLocked
                ? []
                : filteredKnowledgeBases.map((kb) => ({
                    key: `kb-${kb.id}`,
                    label: `@知识库 · ${kb.name}`,
                    hint: kb.description || '知识库',
                    icon: <BookOpenText className="w-4 h-4" />,
                    raw: kb
                }));
            return {
                title: '搜索结果',
                items: [...dataItems, ...kbItems]
            };
        }

        if (activeLevel === 'category') {
            return {
                title: '选择类别',
                items: [
                    { key: 'data', label: '@数据', hint: dataSourceErrors.length ? `部分来源失败（${dataSourceErrors.length}）` : '命盘/记录/运势', icon: <Folder className="w-4 h-4" /> },
                    { key: 'knowledge', label: knowledgeBaseLocked ? '@知识库 (Plus+)' : '@知识库', hint: knowledgeBaseLocked ? '仅限 Plus 以上会员使用' : '你的知识库', icon: <BookOpenText className="w-4 h-4" />, disabled: knowledgeBaseLocked }
                ]
            };
        }

        if (activeLevel === 'subcategory' && effectiveState.selectedCategory === 'data') {
            const subs = Object.keys(DATA_SUBCATEGORY_MAP);
            return {
                title: '@数据',
                items: subs.map((s) => ({ key: s, label: s, icon: <Folder className="w-4 h-4" /> }))
            };
        }

        if (activeLevel === 'type' && effectiveState.selectedCategory === 'data') {
            const sub = effectiveState.selectedSubcategory || '命盘';
            if (sub === '合盘记录') {
                const items = Object.keys(HEPAN_TYPE_LABELS).map(key => ({
                    key: `hepan:${key}`,
                    label: HEPAN_TYPE_LABELS[key],
                    hint: `${hepanTypeCounts[key] || 0} 条`,
                    icon: HEPAN_TYPE_ICONS[key]
                }));
                return { title: `@数据 / ${sub}`, items };
            }
            const allowed = DATA_SUBCATEGORY_MAP[sub] || [];
            return {
                title: `@数据 / ${sub}`,
                items: allowed.map((t) => ({
                    key: t,
                    label: TYPE_LABELS[t],
                    hint: `${typeCounts.get(t) || 0} 条`,
                    icon: TYPE_ICONS[t]
                }))
            };
        }

        if (activeLevel === 'item' && effectiveState.selectedCategory === 'data') {
            const sub = effectiveState.selectedSubcategory || '命盘';
            const selectedType = effectiveState.selectedType;
            let items = filteredDataSources;
            if (selectedType) {
                if (selectedType.startsWith('hepan:')) {
                    const typeKey = selectedType.replace('hepan:', '');
                    items = items.filter(i => i.type === 'hepan_chart' && i.hepanType === typeKey);
                } else {
                    items = items.filter(i => i.type === selectedType);
                }
            } else {
                const allowed = new Set(DATA_SUBCATEGORY_MAP[sub] || []);
                items = items.filter(i => allowed.has(i.type));
            }
            return {
                title: `@数据 / ${sub}`,
                items: items.map((i) => ({
                    key: i.id,
                    label: i.name,
                    hint: shouldShowHint(i) ? i.preview : '',
                    icon: TYPE_ICONS[i.type],
                    raw: i
                }))
            };
        }

        const items = filteredKnowledgeBases;
        return {
            title: '@知识库',
            items: knowledgeBaseLocked
                ? [{ key: 'kb-locked', label: '知识库 (Plus+)', hint: '仅限 Plus 以上会员使用', icon: <BookOpenText className="w-4 h-4" />, disabled: true }]
                : items.map((kb) => ({ key: kb.id, label: kb.name, hint: kb.description || '知识库', icon: <ChevronRight className="w-4 h-4 opacity-50" />, raw: kb }))
        };
    }, [activeLevel, dataSourceErrors.length, effectiveState.selectedCategory, effectiveState.selectedSubcategory, effectiveState.selectedType, filteredDataSources, filteredKnowledgeBases, hepanTypeCounts, knowledgeBaseLocked, typeCounts]);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                if (activeLevel === 'category' || activeLevel === 'search') onClose();
                else goBack();
                return;
            }

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setState(prev => ({ ...prev, activeIndex: Math.min(prev.activeIndex + 1, view.items.length - 1) }));
                return;
            }

            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setState(prev => ({ ...prev, activeIndex: Math.max(prev.activeIndex - 1, 0) }));
                return;
            }

            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                goBack();
                return;
            }

            if (e.key === 'ArrowRight') {
                if (activeLevel === 'category') {
                    e.preventDefault();
                    const key = view.items[effectiveState.activeIndex]?.key;
                    if (key === 'data') {
                        setState({ level: 'subcategory', selectedCategory: 'data', activeIndex: 0 });
                    } else if (key === 'knowledge' && !knowledgeBaseLocked) {
                        setState({ level: 'item', selectedCategory: 'knowledge', activeIndex: 0 });
                    }
                } else if (activeLevel === 'subcategory') {
                    e.preventDefault();
                    const sub = view.items[effectiveState.activeIndex]?.key;
                    if (sub) {
                        if (DATA_SUBCATEGORY_DIVIDE.has(sub)) {
                            setState({ level: 'type', selectedCategory: 'data', selectedSubcategory: sub, activeIndex: 0 });
                        } else {
                            setState({ level: 'item', selectedCategory: 'data', selectedSubcategory: sub, activeIndex: 0 });
                        }
                    }
                } else if (activeLevel === 'type') {
                    e.preventDefault();
                    const nextType = view.items[effectiveState.activeIndex]?.key;
                    if (nextType) {
                        setState({ level: 'item', selectedCategory: 'data', selectedSubcategory: effectiveState.selectedSubcategory, selectedType: nextType, activeIndex: 0 });
                    }
                }
                return;
            }

            if (e.key === 'Enter') {
                e.preventDefault();
                const item = view.items[effectiveState.activeIndex];
                if (!item) return;

                if (activeLevel === 'search') {
                    const raw = item.raw;
                    if (!raw) return;
                    if ('type' in raw) {
                        onSelect({ type: raw.type, id: raw.id, name: raw.name, preview: raw.preview });
                        onClose();
                        return;
                    }
                    if (knowledgeBaseLocked) return;
                    onSelect({ type: 'knowledge_base', id: raw.id, name: raw.name, preview: raw.description || '知识库' });
                    onClose();
                    return;
                }

                if (activeLevel === 'category') {
                    if (item.key === 'data') {
                        setState({ level: 'subcategory', selectedCategory: 'data', activeIndex: 0 });
                    } else if (!item.disabled) {
                        setState({ level: 'item', selectedCategory: 'knowledge', activeIndex: 0 });
                    }
                    return;
                }

                if (activeLevel === 'subcategory' && effectiveState.selectedCategory === 'data') {
                    if (DATA_SUBCATEGORY_DIVIDE.has(item.key)) {
                        setState({ level: 'type', selectedCategory: 'data', selectedSubcategory: item.key, activeIndex: 0 });
                    } else {
                        setState({ level: 'item', selectedCategory: 'data', selectedSubcategory: item.key, activeIndex: 0 });
                    }
                    return;
                }

                if (activeLevel === 'type' && effectiveState.selectedCategory === 'data') {
                    setState({ level: 'item', selectedCategory: 'data', selectedSubcategory: effectiveState.selectedSubcategory, selectedType: item.key, activeIndex: 0 });
                    return;
                }

                if (activeLevel === 'item' && effectiveState.selectedCategory === 'data') {
                    const raw = item.raw;
                    if (!raw || !('type' in raw)) return;
                    onSelect({ type: raw.type, id: raw.id, name: raw.name, preview: raw.preview });
                    onClose();
                    return;
                }

                const raw = item.raw;
                if (!raw) return;
                if ('type' in raw) {
                    onSelect({ type: raw.type, id: raw.id, name: raw.name, preview: raw.preview });
                    onClose();
                    return;
                }
                if (knowledgeBaseLocked) return;
                onSelect({ type: 'knowledge_base', id: raw.id, name: raw.name, preview: raw.description || '知识库' });
                onClose();
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [activeLevel, knowledgeBaseLocked, onClose, onSelect, effectiveState.activeIndex, effectiveState.selectedCategory, effectiveState.selectedSubcategory, view.items]);

    useEffect(() => {
        const list = listRef.current;
        if (!list) return;
        const active = list.querySelector<HTMLElement>('[data-active="true"]');
        if (!active) return;
        active.scrollIntoView({ block: 'nearest' });
    }, [state.activeIndex, view.items]);

    return (
        <div className="absolute bottom-full mb-2 z-40 left-2 right-2 md:left-0 md:right-auto md:w-[240px] md:max-w-[calc(100vw-2rem)]">
            <div className="bg-background border border-border rounded-xl shadow-lg overflow-hidden">
                <div className="px-3 py-2 text-xs text-foreground-secondary border-b border-border/60 flex items-center gap-2">
                    {activeLevel !== 'category' && activeLevel !== 'search' && (
                        <button
                            type="button"
                            onClick={goBack}
                            className="p-1 rounded hover:bg-background-secondary text-foreground-secondary hover:text-foreground"
                            aria-label="返回"
                        >
                            <ArrowLeft className="w-4 h-4" />
                        </button>
                    )}
                    <div className="truncate">{view.title}</div>
                </div>
                {!!loadError && (
                    <div className="px-3 py-2 text-xs text-red-500 border-b border-border/60">
                        {loadError}
                    </div>
                )}
                {!loadError && dataSourceErrors.length > 0 && (
                    <div className="px-3 py-2 text-xs text-amber-500 border-b border-border/60">
                        数据源加载部分失败：{dataSourceErrors.slice(0, 2).map(e => e.type).join('、')}{dataSourceErrors.length > 2 ? '…' : ''}
                    </div>
                )}
                <div ref={listRef} className="max-h-48 overflow-auto">
                    {loading ? (
                        <div className="space-y-1 p-2">
                            {/* 骨架屏 - 模拟列表项 */}
                            {[1, 2, 3].map(i => (
                                <div key={i} className="flex items-center gap-2 px-2 py-2">
                                    <div className="w-5 h-5 rounded bg-foreground/10 animate-pulse" />
                                    <div className="h-4 w-24 rounded bg-foreground/10 animate-pulse" />
                                </div>
                            ))}
                        </div>
                    ) : view.items.length === 0 ? (
                        <div className="px-3 py-3 text-sm text-foreground-secondary">
                            {loadError
                                ? loadError
                                : activeLevel === 'item' && state.selectedCategory === 'knowledge'
                                    ? (knowledgeBaseLocked ? '仅限 Plus 以上会员使用' : '你还没有知识库')
                                    : activeLevel === 'item' && state.selectedCategory === 'data'
                                        ? '该分类暂无数据'
                                        : '没有匹配项'}
                        </div>
                    ) : (
                        view.items.map((item, idx) => (
                            <button
                                key={item.key}
                                type="button"
                                data-active={idx === state.activeIndex ? 'true' : 'false'}
                                className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm ${item.disabled ? 'opacity-60 cursor-not-allowed' : 'hover:bg-background-secondary'} ${idx === state.activeIndex ? 'bg-background-secondary' : ''}`}
                                onMouseEnter={() => setState(prev => ({ ...prev, activeIndex: idx }))}
                                onClick={() => {
                                    if (item.disabled) return;
                                    if (activeLevel === 'search') {
                                        const raw = item.raw;
                                        if (!raw) return;
                                        if ('type' in raw) {
                                            onSelect({ type: raw.type, id: raw.id, name: raw.name, preview: raw.preview });
                                            onClose();
                                            return;
                                        }
                                        if (knowledgeBaseLocked) return;
                                        onSelect({ type: 'knowledge_base', id: raw.id, name: raw.name, preview: raw.description || '知识库' });
                                        onClose();
                                        return;
                                    }
                                    if (activeLevel === 'category') {
                                        if (item.key === 'data') setState({ level: 'subcategory', selectedCategory: 'data', activeIndex: 0 });
                                        else if (!knowledgeBaseLocked) setState({ level: 'item', selectedCategory: 'knowledge', activeIndex: 0 });
                                        return;
                                    }
                                    if (activeLevel === 'subcategory') {
                                        if (DATA_SUBCATEGORY_DIVIDE.has(item.key)) {
                                            setState({ level: 'type', selectedCategory: 'data', selectedSubcategory: item.key, activeIndex: 0 });
                                        } else {
                                            setState({ level: 'item', selectedCategory: 'data', selectedSubcategory: item.key, activeIndex: 0 });
                                        }
                                        return;
                                    }
                                    if (activeLevel === 'type') {
                                        setState({ level: 'item', selectedCategory: 'data', selectedSubcategory: state.selectedSubcategory, selectedType: item.key, activeIndex: 0 });
                                        return;
                                    }
                                    if (activeLevel === 'item' && state.selectedCategory === 'data') {
                                        const raw = item.raw;
                                        if (!raw || !('type' in raw)) return;
                                        onSelect({ type: raw.type, id: raw.id, name: raw.name, preview: raw.preview });
                                        onClose();
                                        return;
                                    }
                                    const raw = item.raw;
                                    if (!raw || 'type' in raw) return;
                                    if (knowledgeBaseLocked) return;
                                    onSelect({ type: 'knowledge_base', id: raw.id, name: raw.name, preview: raw.description || '知识库' });
                                    onClose();
                                }}
                            >
                                <span className="text-foreground-secondary">{item.icon}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="truncate">{item.label}</div>
                                    {!!item.hint && <div className="truncate text-xs text-foreground-secondary">{item.hint}</div>}
                                </div>
                                {(activeLevel === 'category' || activeLevel === 'subcategory') && <ChevronRight className="w-4 h-4 text-foreground-secondary" />}
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
