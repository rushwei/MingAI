'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { X, Check, Search } from 'lucide-react';
import type { BaziChart } from '@/types';

interface ChartSelectorModalProps {
    charts: BaziChart[];
    selectedId?: string;
    onSelect: (chart: BaziChart) => void;
    onClose: () => void;
}

export function ChartSelectorModal({
    charts,
    selectedId,
    onSelect,
    onClose,
}: ChartSelectorModalProps) {
    const [searchQuery, setSearchQuery] = useState('');

    // 过滤命盘
    const filteredCharts = useMemo(() => {
        if (!searchQuery.trim()) return charts;
        const query = searchQuery.trim().toLowerCase();
        return charts.filter(chart =>
            chart.name.toLowerCase().includes(query) ||
            chart.birthDate?.includes(query)
        );
    }, [charts, searchQuery]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative w-full max-w-sm mx-4 bg-background rounded-2xl border border-border shadow-2xl animate-fade-in">
                {/* 标题 */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div>
                        <h3 className="font-semibold">选择八字命盘</h3>
                        <p className="text-xs text-foreground-secondary">切换命盘查看个性化八字运势</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-background-secondary transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 搜索框 */}
                <div className="p-4 pb-2">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-secondary" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="搜索命盘名称..."
                            className="w-full pl-9 pr-4 py-2 rounded-lg bg-background-secondary border border-border focus:border-accent focus:outline-none text-sm"
                        />
                    </div>
                </div>

                {/* 命盘列表 */}
                <div className="p-4 pt-2 space-y-2 max-h-60 overflow-y-auto">
                    {filteredCharts.map((chart) => (
                        <button
                            key={chart.id}
                            onClick={() => onSelect(chart)}
                            className={`w-full p-3 rounded-xl text-left transition-colors flex items-center justify-between ${selectedId === chart.id
                                    ? 'bg-accent/10 border border-accent'
                                    : 'bg-background-secondary border border-transparent hover:border-border'
                                }`}
                        >
                            <div>
                                <div className="font-medium">{chart.name}</div>
                                <div className="text-sm text-foreground-secondary">
                                    {chart.birthDate} {chart.gender === 'male' ? '男' : '女'}
                                </div>
                            </div>
                            {selectedId === chart.id && (
                                <Check className="w-5 h-5 text-accent" />
                            )}
                        </button>
                    ))}
                    {filteredCharts.length === 0 && searchQuery && (
                        <div className="text-center text-foreground-secondary py-4">
                            未找到匹配的命盘
                        </div>
                    )}
                    {charts.length === 0 && (
                        <div className="text-center text-foreground-secondary py-4">
                            暂无命盘，
                            <Link href="/bazi" className="text-accent hover:underline">
                                去创建
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
