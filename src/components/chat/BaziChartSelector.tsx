'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { X, Search, Orbit, Star, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ChartItem {
    id: string;
    name: string;
    gender: 'male' | 'female' | null;
    birth_date: string;
    birth_time: string | null;
    type: 'bazi' | 'ziwei';
}

export interface SelectedCharts {
    bazi?: { id: string; name: string; info: string; analysisMode?: 'traditional' | 'mangpai' };
    ziwei?: { id: string; name: string; info: string };
}

interface ChartSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (charts: SelectedCharts) => void;
    userId: string;
    currentSelection?: SelectedCharts;
    focusType?: 'bazi' | 'ziwei';
}

export function BaziChartSelector({ isOpen, onClose, onSelect, userId, currentSelection, focusType }: ChartSelectorProps) {
    const [charts, setCharts] = useState<ChartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedIds, setSelectedIds] = useState<{ bazi?: string; ziwei?: string }>(() => ({
        bazi: currentSelection?.bazi?.id,
        ziwei: currentSelection?.ziwei?.id,
    }));
    const [baziAnalysisMode, setBaziAnalysisMode] = useState<'traditional' | 'mangpai'>(
        currentSelection?.bazi?.analysisMode || 'traditional'
    );

    const baziSectionRef = useRef<HTMLDivElement>(null);
    const ziweiSectionRef = useRef<HTMLDivElement>(null);

    // 滚动到指定类型
    useEffect(() => {
        if (isOpen && !loading && focusType) {
            setTimeout(() => {
                if (focusType === 'bazi' && baziSectionRef.current) {
                    baziSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else if (focusType === 'ziwei' && ziweiSectionRef.current) {
                    ziweiSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            }, 100);
        }
    }, [isOpen, loading, focusType]);

    // 加载用户命盘
    useEffect(() => {
        if (!isOpen || !userId) return;

        const loadCharts = async () => {
            setLoading(true);

            const [baziResult, ziweiResult] = await Promise.all([
                supabase
                    .from('bazi_charts')
                    .select('id, name, gender, birth_date, birth_time')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false }),
                supabase
                    .from('ziwei_charts')
                    .select('id, name, gender, birth_date, birth_time')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false }),
            ]);

            const allCharts: ChartItem[] = [];

            if (!baziResult.error && baziResult.data) {
                allCharts.push(...baziResult.data.map(c => ({ ...c, type: 'bazi' as const })));
            }
            if (!ziweiResult.error && ziweiResult.data) {
                allCharts.push(...ziweiResult.data.map(c => ({ ...c, type: 'ziwei' as const })));
            }

            setCharts(allCharts);
            setLoading(false);
        };

        loadCharts();
    }, [isOpen, userId]);

    // 过滤命盘
    const filteredCharts = useMemo(() => {
        if (!searchQuery.trim()) return charts;
        const query = searchQuery.toLowerCase();
        return charts.filter(chart =>
            chart.name.toLowerCase().includes(query)
        );
    }, [charts, searchQuery]);

    // 分类
    const baziCharts = filteredCharts.filter(c => c.type === 'bazi');
    const ziweiCharts = filteredCharts.filter(c => c.type === 'ziwei');

    const selectedBazi = useMemo(
        () => charts.find(chart => chart.type === 'bazi' && chart.id === selectedIds.bazi) || null,
        [charts, selectedIds.bazi],
    );
    const selectedZiwei = useMemo(
        () => charts.find(chart => chart.type === 'ziwei' && chart.id === selectedIds.ziwei) || null,
        [charts, selectedIds.ziwei],
    );

    // 格式化显示信息
    const formatInfo = (chart: ChartItem) => {
        const genderText = chart.gender === 'male' ? '男' : chart.gender === 'female' ? '女' : '';
        const dateText = chart.birth_date
            ? new Date(`${chart.birth_date}T00:00:00`).toLocaleDateString('zh-CN')
            : '';
        return [genderText, dateText].filter(Boolean).join(' · ');
    };

    const handleToggle = (chart: ChartItem) => {
        if (chart.type === 'bazi') {
            setSelectedIds(prev => ({
                ...prev,
                bazi: prev.bazi === chart.id ? undefined : chart.id,
            }));
        } else {
            setSelectedIds(prev => ({
                ...prev,
                ziwei: prev.ziwei === chart.id ? undefined : chart.id,
            }));
        }
    };

    const handleConfirm = () => {
        const result: SelectedCharts = {};
        if (selectedBazi) {
            result.bazi = {
                id: selectedBazi.id,
                name: selectedBazi.name,
                info: formatInfo(selectedBazi),
                analysisMode: baziAnalysisMode,
            };
        }
        if (selectedZiwei) {
            result.ziwei = {
                id: selectedZiwei.id,
                name: selectedZiwei.name,
                info: formatInfo(selectedZiwei),
            };
        }
        onSelect(result);
        onClose();
    };

    const handleClear = () => {
        setSelectedIds({ bazi: undefined, ziwei: undefined });
        setBaziAnalysisMode('traditional');
    };

    if (!isOpen) return null;

    const renderChartItem = (chart: ChartItem) => {
        const isSelected = chart.type === 'bazi'
            ? selectedIds.bazi === chart.id
            : selectedIds.ziwei === chart.id;

        return (
            <button
                key={`${chart.type}-${chart.id}`}
                onClick={() => handleToggle(chart)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${isSelected ? 'bg-background-secondary ring-2 ring-accent' : 'hover:bg-background-secondary'
                    }`}
            >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${chart.type === 'bazi' ? 'bg-orange-500/10' : 'bg-purple-500/10'
                    }`}>
                    {chart.type === 'bazi' ? (
                        <Orbit className="w-4 h-4 text-orange-500" />
                    ) : (
                        <Star className="w-4 h-4 text-purple-500" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{chart.name}</div>
                    <div className="text-xs text-foreground-secondary truncate">
                        {formatInfo(chart)}
                    </div>
                </div>
                {isSelected && (
                    <Check className="w-4 h-4 text-accent flex-shrink-0" />
                )}
            </button>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} />

            <div className="relative bg-background/95 rounded-2xl border border-border/60 shadow-2xl w-full max-w-md flex flex-col overflow-hidden" style={{ maxHeight: '460px' }}>
                {/* 头部 */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-muted/30 flex-shrink-0">
                    <h3 className="text-base font-semibold">选择命盘</h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* 搜索框 */}
                <div className="px-4 py-3 border-b border-border/60 flex-shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="搜索命盘..."
                            className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-muted/40 border border-border/70 focus:outline-none focus:ring-2 focus:ring-accent/30"
                            autoFocus
                        />
                    </div>
                </div>

                {/* 命盘列表 */}
                <div className="flex-1 overflow-y-auto p-3" style={{ maxHeight: '260px' }}>
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filteredCharts.length === 0 ? (
                        <div className="text-center py-8 text-foreground-secondary text-sm">
                            {searchQuery ? '未找到匹配的命盘' : '暂无保存的命盘'}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {baziCharts.length > 0 && (
                                <div ref={baziSectionRef}>
                                    {/* 分析模式选择 - 仅在选中八字命盘时显示 */}
                                    {selectedIds.bazi && (
                                        <div className="mb-2 px-2">
                                            <div className="text-xs text-foreground-secondary mb-1.5">分析模式</div>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => setBaziAnalysisMode('traditional')}
                                                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${baziAnalysisMode === 'traditional'
                                                        ? 'bg-orange-500/10 border-orange-500/50 text-orange-600'
                                                        : 'border-border hover:bg-background-secondary text-foreground-secondary'
                                                        }`}
                                                >
                                                    传统命理
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setBaziAnalysisMode('mangpai')}
                                                    className={`flex-1 px-3 py-2 text-sm rounded-lg border transition-colors ${baziAnalysisMode === 'mangpai'
                                                        ? 'bg-amber-500/10 border-amber-500/50 text-amber-600'
                                                        : 'border-border hover:bg-background-secondary text-foreground-secondary'
                                                        }`}
                                                >
                                                    盲派分析
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                    <div className="text-xs text-foreground-secondary px-2 mb-1 flex items-center gap-1">
                                        <Orbit className="w-3 h-3 text-orange-500" />
                                        八字命盘
                                    </div>
                                    <div className="space-y-1">
                                        {baziCharts.slice(0, 3).map(renderChartItem)}
                                    </div>
                                </div>
                            )}
                            {ziweiCharts.length > 0 && (
                                <div ref={ziweiSectionRef}>
                                    <div className="text-xs text-foreground-secondary px-2 mb-1 flex items-center gap-1">
                                        <Star className="w-3 h-3 text-purple-500" />
                                        紫微命盘
                                    </div>
                                    <div className="space-y-1">
                                        {ziweiCharts.slice(0, 3).map(renderChartItem)}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* 底部操作 */}
                <div className="px-4 py-3 border-t border-border/60 bg-muted/30 flex items-center justify-between flex-shrink-0">
                    <button
                        onClick={handleClear}
                        className="text-sm text-foreground-secondary hover:text-foreground transition-colors"
                        disabled={!selectedIds.bazi && !selectedIds.ziwei}
                    >
                        清除选择
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-4 py-2 text-sm rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors shadow-sm"
                    >
                        确认
                    </button>
                </div>
            </div>
        </div>
    );
}
