'use client';

import { Send, Paperclip, Orbit, X, Sparkles } from 'lucide-react';
import type { SelectedCharts } from './BaziChartSelector';

interface ChatComposerProps {
    inputValue: string;
    isLoading: boolean;
    onInputChange: (value: string) => void;
    onSend: () => void;
    disabled?: boolean;
    selectedCharts?: SelectedCharts;
    onSelectChart?: (type?: 'bazi' | 'ziwei') => void;
    onClearChart?: (type: 'bazi' | 'ziwei') => void;
}

export function ChatComposer({
    inputValue,
    isLoading,
    onInputChange,
    onSend,
    disabled = false,
    selectedCharts,
    onSelectChart,
    onClearChart,
}: ChatComposerProps) {
    const isDisabled = disabled || isLoading;
    const hasBazi = selectedCharts?.bazi;
    const hasZiwei = selectedCharts?.ziwei;

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey && !isDisabled && inputValue.trim()) {
            e.preventDefault();
            onSend();
        }
    };

    return (
        <div className={`border-t border-border bg-gradient-to-t from-background to-transparent p-4 ${disabled ? 'opacity-50' : ''}`}>
            <div className="max-w-3xl mx-auto">
                {/* 输入框容器 - 更大的高度 */}
                <div className={`
                    relative flex flex-col gap-3 p-3 rounded-2xl 
                    bg-background-secondary border border-border
                    focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent
                    transition-all duration-300
                `}>
                    {/* 输入框 - 单独在上面 */}
                    <textarea
                        value={inputValue}
                        onChange={(e) => onInputChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={disabled ? "请充值后继续使用" : "输入您的问题..."}
                        className="w-full bg-transparent resize-none text-sm py-2 px-1
                           focus:outline-none
                           placeholder:text-foreground-secondary/50
                           disabled:cursor-not-allowed
                           min-h-[80px]"
                        disabled={isDisabled}
                        rows={3}
                    />

                    {/* 底部按钮栏 */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        {/* 左侧按钮组 */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                            {/* 八字命盘选择框 */}
                            {onSelectChart && (
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => onSelectChart('bazi')}
                                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all text-sm ${hasBazi
                                            ? 'bg-orange-500/10 text-orange-600'
                                            : 'hover:bg-background-tertiary text-foreground-secondary hover:text-foreground'
                                            }`}
                                        title="选择八字命盘"
                                        disabled={isDisabled}
                                    >
                                        <Orbit className="w-4.5 h-4.5" />
                                        <span className="max-w-[50px] truncate">{hasBazi?.name || '八字'}</span>
                                    </button>
                                    {hasBazi && (
                                        <button
                                            type="button"
                                            onClick={() => onClearChart?.('bazi')}
                                            className="p-1.5 rounded-lg hover:bg-orange-500/10 text-orange-600"
                                            title="清除八字命盘"
                                            disabled={isDisabled}
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* 分隔线 */}
                            <div className="w-px h-6 bg-border mx-1" />

                            {/* 紫微命盘选择框 */}
                            {onSelectChart && (
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => onSelectChart('ziwei')}
                                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all text-sm ${hasZiwei
                                            ? 'bg-purple-500/10 text-purple-600'
                                            : 'hover:bg-background-tertiary text-foreground-secondary hover:text-foreground'
                                            }`}
                                        title="选择紫微命盘"
                                        disabled={isDisabled}
                                    >
                                        <Sparkles className="w-4.5 h-4.5" />
                                        <span className="max-w-[50px] truncate">{hasZiwei?.name || '紫微'}</span>
                                    </button>
                                    {hasZiwei && (
                                        <button
                                            type="button"
                                            onClick={() => onClearChart?.('ziwei')}
                                            className="p-1.5 rounded-lg hover:bg-purple-500/10 text-purple-600"
                                            title="清除紫微命盘"
                                            disabled={isDisabled}
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* 分隔线 */}
                            <div className="w-px h-6 bg-border mx-1" />

                            {/* 附件按钮（预留） */}
                            <button
                                type="button"
                                className="p-2 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-background-tertiary transition-all opacity-50"
                                title="附件（开发中）"
                                disabled
                            >
                                <Paperclip className="w-5 h-5" />
                            </button>
                        </div>

                        {/* 发送按钮 */}
                        <button
                            onClick={onSend}
                            disabled={!inputValue.trim() || isDisabled}
                            className={`
                                px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 flex-shrink-0
                                ${inputValue.trim() && !isDisabled
                                    ? 'bg-foreground text-background hover:bg-foreground/90'
                                    : 'bg-background-tertiary text-foreground-secondary cursor-not-allowed'
                                }
                            `}
                        >
                            <Send className="w-4.5 h-4.5" />
                            <span className="text-sm">发送</span>
                        </button>
                    </div>
                </div>

                <p className="text-center text-xs text-foreground-secondary/60 mt-3">
                    AI 回复仅供参考，请理性看待命理分析结果
                </p>
            </div>
        </div>
    );
}
