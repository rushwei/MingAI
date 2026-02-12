'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import type { LiuQin } from '@/lib/divination/liuyao';

export const YONG_SHEN_TARGET_OPTIONS: Array<{
    label: string;
    value: LiuQin;
    description: string;
}> = [
    { label: '钱和资源', value: '妻财', description: '感情婚姻/钱财/资源' },
    { label: '工作与压力', value: '官鬼', description: '功名求官/工作事业/规则/压力/风险/疾病' },
    { label: '学业与文书', value: '父母', description: '合同文书/证件/学业/房屋车辆/长辈' },
    { label: '进展与结果', value: '子孙', description: '子女后辈/医药' },
    { label: '人际与竞争', value: '兄弟', description: '同辈/合作/竞争' },
];

export type YongShenPickerVariant = 'inline-right' | 'block';

interface YongShenTargetPickerProps {
    value: LiuQin[];
    onChange: (targets: LiuQin[]) => void;
    variant?: YongShenPickerVariant;
    className?: string;
}

function isSameTargets(a: LiuQin[], b: LiuQin[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((item, index) => item === b[index]);
}

export function YongShenTargetPicker({
    value,
    onChange,
    variant = 'inline-right',
    className = '',
}: YongShenTargetPickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const canUseDOM = typeof document !== 'undefined';
    const selectedLabels = useMemo(
        () => YONG_SHEN_TARGET_OPTIONS.filter((item) => value.includes(item.value)).map((item) => item.label),
        [value]
    );

    const toggleTarget = (target: LiuQin) => {
        const exists = value.includes(target);
        const next = exists
            ? value.filter((item) => item !== target)
            : [...value, target];
        if (!isSameTargets(value, next)) {
            onChange(next);
        }
    };

    useEffect(() => {
        if (!isOpen) return;
        const onKeydown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };
        window.addEventListener('keydown', onKeydown);
        return () => window.removeEventListener('keydown', onKeydown);
    }, [isOpen]);

    if (variant === 'block') {
        return (
            <div className={`rounded-xl border border-white/10 bg-white/[0.02] p-3 ${className}`}>
                <div className="text-sm font-medium text-foreground mb-2">请选择分析目标（可多选）</div>
                <div className="grid gap-2 sm:grid-cols-2">
                    {YONG_SHEN_TARGET_OPTIONS.map((item) => {
                        const checked = value.includes(item.value);
                        return (
                            <button
                                key={item.value}
                                type="button"
                                onClick={() => toggleTarget(item.value)}
                                className={`text-left rounded-lg border px-3 py-2 transition-colors ${
                                    checked
                                        ? 'border-accent/50 bg-accent/10 text-accent'
                                        : 'border-white/10 bg-white/[0.02] text-foreground-secondary hover:border-white/20 hover:text-foreground'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <span className="font-medium">{item.label}</span>
                                    {checked && <Check className="w-4 h-4" />}
                                </div>
                                <div className="mt-1 text-xs opacity-80">{item.description}</div>
                            </button>
                        );
                    })}
                </div>
                <div className="mt-2 text-xs text-foreground-tertiary">
                    {selectedLabels.length > 0
                        ? `已选：${selectedLabels.join('、')}`
                        : '至少选择 1 项，系统才会开始六爻分析。'}
                </div>
            </div>
        );
    }

    return (
        <div className={`relative ${className}`}>
            <button
                type="button"
                onClick={() => setIsOpen((prev) => !prev)}
                className={`inline-flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs transition-colors ${
                    selectedLabels.length > 0
                        ? 'border-accent/40 bg-accent/10 text-accent'
                        : 'border-white/15 bg-background/90 text-foreground-secondary hover:text-foreground'
                }`}
            >
                <span className="max-w-[120px] truncate text-sm">
                    {selectedLabels.length > 0 ? `分析目标 ${selectedLabels.length} 项` : '选择分析目标'}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && canUseDOM && createPortal(
                <>
                    <button
                        type="button"
                        aria-label="关闭分析目标弹窗"
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 z-[70] bg-black/35 backdrop-blur-[1px]"
                    />
                    <div className="fixed inset-0 z-[71] flex items-center justify-center p-4 pointer-events-none">
                        <div
                            role="dialog"
                            aria-modal="true"
                            className="pointer-events-auto w-full max-w-[460px] overflow-hidden rounded-2xl border border-white/10 bg-background/95 shadow-2xl backdrop-blur"
                        >
                            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                                <div>
                                    <div className="text-sm font-semibold text-foreground">选择分析目标（可多选）</div>
                                    <div className="text-xs text-foreground-tertiary">多选不限（最多 5 项）</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsOpen(false)}
                                    className="rounded-md border border-white/15 p-1 text-foreground-secondary hover:text-foreground"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="max-h-[52vh] overflow-y-auto p-3">
                                <div className="space-y-2">
                                    {YONG_SHEN_TARGET_OPTIONS.map((item) => {
                                        const checked = value.includes(item.value);
                                        return (
                                            <button
                                                key={item.value}
                                                type="button"
                                                onClick={() => toggleTarget(item.value)}
                                                className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
                                                    checked
                                                        ? 'border-accent/40 bg-accent/10 text-accent'
                                                        : 'border-white/10 bg-white/[0.02] text-foreground-secondary hover:border-white/20 hover:text-foreground'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <span className="text-base font-medium">{item.label}</span>
                                                    {checked && <Check className="h-4 w-4" />}
                                                </div>
                                                <div className="mt-0.5 text-xs opacity-80">{item.description}</div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-3">
                                <div className="text-xs text-foreground-tertiary">
                                    {selectedLabels.length > 0 ? `已选：${selectedLabels.join('、')}` : '至少选择 1 项后再起卦。'}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => onChange([])}
                                        className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-foreground-secondary hover:text-foreground"
                                    >
                                        清空
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsOpen(false)}
                                        className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90"
                                    >
                                        完成选择
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    );
}
