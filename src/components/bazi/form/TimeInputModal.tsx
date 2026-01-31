/**
 * 时间输入模态框组件
 *
 * 'use client' 标记说明：
 * - 使用 useState 管理模态框状态
 * - 包含交互式时间选择
 */
'use client';

import { useState } from 'react';
import { Clock, X } from 'lucide-react';
import type { BaziFormData } from '@/types';
import { HOUR_OPTIONS } from './options';

interface TimeInputModalProps {
    isOpen: boolean;
    onClose: () => void;
    formData: BaziFormData;
    unknownTime: boolean;
    onToggleUnknownTime: () => void;
    onUpdate: <K extends keyof BaziFormData>(field: K, value: BaziFormData[K]) => void;
}

export function TimeInputModal({
    isOpen,
    onClose,
    formData,
    unknownTime,
    onToggleUnknownTime,
    onUpdate,
}: TimeInputModalProps) {
    const [localHour, setLocalHour] = useState(formData.birthHour);
    const [localMinute, setLocalMinute] = useState(formData.birthMinute);
    const [localUnknownTime, setLocalUnknownTime] = useState(unknownTime);

    // 当模态框打开时，同步外部值到本地状态
    const [lastIsOpen, setLastIsOpen] = useState(isOpen);
    if (isOpen && !lastIsOpen) {
        setLocalHour(formData.birthHour);
        setLocalMinute(formData.birthMinute);
        // 打开模态框时默认显示"已知时辰"，方便用户直接选择时间
        setLocalUnknownTime(false);
    }
    if (isOpen !== lastIsOpen) {
        setLastIsOpen(isOpen);
    }

    const handleConfirm = () => {
        onUpdate('birthHour', localHour);
        onUpdate('birthMinute', localMinute);
        if (localUnknownTime !== unknownTime) {
            onToggleUnknownTime();
        }
        onClose();
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const timeValue = e.target.value;
        if (timeValue) {
            const [hours, minutes] = timeValue.split(':').map(Number);
            setLocalHour(hours);
            setLocalMinute(minutes);
        }
    };

    const formatTimeValue = () => {
        const hour = String(localHour).padStart(2, '0');
        const minute = String(localMinute || 0).padStart(2, '0');
        return `${hour}:${minute}`;
    };

    if (!isOpen) return null;

    // knowTime 表示"知道时辰"，是 localUnknownTime（不知时辰）的反义
    const knowTime = !localUnknownTime;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
            {/* 遮罩层 */}
            <div
                className="absolute inset-0 bg-black/50"
                onClick={onClose}
            />

            {/* 模态框内容 */}
            <div className="relative bg-background rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* 头部 */}
                <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex items-center justify-between">
                    <h2 className="text-lg font-semibold flex items-center gap-2">
                        <Clock className="w-5 h-5 text-accent" />
                        出生时辰
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-foreground-secondary hover:text-foreground transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 内容 */}
                <div className="p-6 space-y-6">
                    {/* 不知时辰开关 */}
                    <label className="flex items-center justify-between cursor-pointer group">
                        <span className="text-sm font-medium">
                            {knowTime ? '已知时辰' : '不知时辰'}
                        </span>
                        <div
                            onClick={() => setLocalUnknownTime(!localUnknownTime)}
                            className={`
                                relative w-12 h-6 rounded-full transition-all duration-300 ease-out flex items-center
                                ${knowTime ? 'bg-accent' : 'bg-foreground-secondary/20'}
                            `}
                        >
                            <div
                                className={`
                                    absolute w-5 h-5 bg-white rounded-full shadow-sm
                                    transition-all duration-300 cubic-bezier(0.4, 0.0, 0.2, 1)
                                    ${knowTime ? 'translate-x-6' : 'translate-x-0.5'}
                                `}
                            />
                        </div>
                    </label>

                    {/* 具体时间输入 - 仅当知道时辰时显示 */}
                    {knowTime && (
                        <div className="space-y-6 animate-fade-in-up">
                            {/* 精确时间输入框 */}
                            <div className="flex items-center gap-4 bg-background-secondary/30 p-4 rounded-xl border border-border/50">
                                <label className="text-sm font-medium whitespace-nowrap text-foreground-secondary">
                                    精确时间
                                </label>
                                <input
                                    type="time"
                                    value={formatTimeValue()}
                                    onChange={handleTimeChange}
                                    className="flex-1 bg-background border border-border rounded-lg px-4 py-2 text-center font-mono text-lg
                                        focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent
                                        transition-all duration-200"
                                />
                            </div>

                            {/* 时辰快捷选择 */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-sm font-medium text-foreground-secondary">
                                        快捷选择时辰
                                    </label>
                                    <span className="text-xs text-foreground-tertiary">
                                        点击选择将自动修正时间
                                    </span>
                                </div>

                                <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2">
                                    {HOUR_OPTIONS.map(({ value, name, time }) => {
                                        const isSelected = localHour === value && (localMinute || 0) === 0;
                                        return (
                                            <button
                                                key={value}
                                                type="button"
                                                onClick={() => {
                                                    setLocalHour(value);
                                                    setLocalMinute(0);
                                                }}
                                                className={`
                                                    relative overflow-hidden
                                                    py-2 px-1 rounded-lg border text-sm transition-all duration-200
                                                    flex flex-col items-center justify-center gap-0.5
                                                    ${isSelected
                                                        ? 'bg-accent text-white border-accent shadow-md shadow-accent/20'
                                                        : 'bg-background border-border hover:border-accent/50 hover:bg-background-secondary'
                                                    }
                                                `}
                                            >
                                                <span className={`font-medium ${isSelected ? 'text-white' : ''}`}>
                                                    {name}
                                                </span>
                                                <span className={`text-[10px] scale-90 ${isSelected ? 'text-white/80' : 'text-foreground-tertiary'}`}>
                                                    {time}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 底部按钮 */}
                <div className="sticky bottom-0 bg-background border-t border-border px-6 py-4 flex gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 px-4 py-2 border border-border rounded-lg text-sm font-medium
                            hover:bg-background-secondary transition-colors"
                    >
                        取消
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        className="flex-1 px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium
                            hover:bg-accent/90 transition-colors"
                    >
                        确定
                    </button>
                </div>
            </div>
        </div>
    );
}
