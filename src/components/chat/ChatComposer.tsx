'use client';

import { useRef, useEffect, useState } from 'react';
import { Send, Paperclip, Orbit, X, Sparkles, Square, ChevronDown } from 'lucide-react';
import type { SelectedCharts } from './BaziChartSelector';
import { Zhipu, DeepSeek, Gemini } from '@lobehub/icons';

export type AIModel = 'deepseek' | 'glm' | 'gemini';

export const AI_MODEL_NAMES: Record<AIModel, string> = {
    deepseek: 'DeepSeek',
    glm: 'GLM-4.6',
    gemini: 'Gemini 3 Flash',
};

const AI_MODELS: { id: AIModel; name: string; desc: string; icon: React.ReactNode }[] = [
    { id: 'deepseek', name: 'DeepSeek', desc: '推理能力强', icon: <DeepSeek.Color size={18} /> },
    { id: 'glm', name: 'GLM-4.6', desc: '中文理解优秀', icon: <Zhipu.Color size={18} /> },
    { id: 'gemini', name: 'Gemini 3 Flash', desc: '快速响应', icon: <Gemini.Color size={18} /> },
];

interface ChatComposerProps {
    inputValue: string;
    isLoading: boolean;
    onInputChange: (value: string) => void;
    onSend: () => void;
    onStop?: () => void;
    disabled?: boolean;
    selectedCharts?: SelectedCharts;
    onSelectChart?: (type?: 'bazi' | 'ziwei') => void;
    onClearChart?: (type: 'bazi' | 'ziwei') => void;
    selectedModel?: AIModel;
    onModelChange?: (model: AIModel) => void;
}

export function ChatComposer({
    inputValue,
    isLoading,
    onInputChange,
    onSend,
    onStop,
    disabled = false,
    selectedCharts,
    onSelectChart,
    onClearChart,
    selectedModel = 'deepseek',
    onModelChange,
}: ChatComposerProps) {
    const hasBazi = selectedCharts?.bazi;
    const hasZiwei = selectedCharts?.ziwei;
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
    const currentModel = AI_MODELS.find(m => m.id === selectedModel) || AI_MODELS[0];

    // 自动调整 textarea 高度
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        // 重置高度以获取正确的 scrollHeight
        textarea.style.height = 'auto';
        // 设置新高度，最小单行（约 24px），最大 236px
        const newHeight = Math.min(Math.max(textarea.scrollHeight, 24), 236);
        textarea.style.height = `${newHeight}px`;
    }, [inputValue]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey && !disabled && !isLoading && inputValue.trim()) {
            e.preventDefault();
            onSend();
        }
    };

    const handleButtonClick = () => {
        if (isLoading && onStop) {
            onStop();
        } else if (inputValue.trim()) {
            onSend();
        }
    };

    return (
        <div className={`border-border bg-gradient-to-t from-background to-transparent pb-3 ${disabled ? 'opacity-50' : ''}`}>
            <div className="max-w-3xl mx-auto">
                {/* 输入框容器 - 白色背景 */}
                <div className={`
                    relative flex flex-col gap-1 p-3 rounded-2xl
                    bg-background border border-border
                    focus-within:ring-2 focus-within:ring-accent/30 focus-within:border-accent
                    transition-all duration-300
                `}>
                    {/* 输入框区域 */}
                    <div className="relative">
                        <textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={(e) => onInputChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={disabled ? "请充值后继续使用" : "输入您的问题..."}
                            className="w-full bg-transparent resize-none text-base py-2 px-1
                               focus:outline-none
                               placeholder:text-foreground-secondary/50
                               disabled:cursor-not-allowed
                               overflow-y-auto"
                            disabled={disabled}
                            rows={1}
                        />
                        {/* 底部渐变遮罩 - 仅在内容较多时可见 */}
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background to-transparent" />
                    </div>

                    {/* 底部按钮栏 */}
                    <div className="flex items-center justify-between border-border/50">
                        {/* 左侧按钮组 */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                            {/* 八字命盘选择框 */}
                            {onSelectChart && (
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => onSelectChart('bazi')}
                                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all text-sm ${disabled
                                            ? 'opacity-50 cursor-not-allowed text-foreground-secondary'
                                            : hasBazi
                                                ? 'bg-orange-500/10 text-orange-600'
                                                : 'hover:bg-background-tertiary text-foreground-secondary hover:text-foreground'
                                            }`}
                                        title={disabled ? "请充值后使用" : "选择八字命盘"}
                                        disabled={disabled}
                                    >
                                        <Orbit className="w-4.5 h-4.5" />
                                        <span className="max-w-[50px] truncate">{hasBazi?.name || '八字'}</span>
                                    </button>
                                    {hasBazi && !disabled && (
                                        <button
                                            type="button"
                                            onClick={() => onClearChart?.('bazi')}
                                            className="p-1.5 rounded-lg hover:bg-orange-500/10 text-orange-600"
                                            title="清除八字命盘"
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
                                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all text-sm ${disabled
                                            ? 'opacity-50 cursor-not-allowed text-foreground-secondary'
                                            : hasZiwei
                                                ? 'bg-purple-500/10 text-purple-600'
                                                : 'hover:bg-background-tertiary text-foreground-secondary hover:text-foreground'
                                            }`}
                                        title={disabled ? "请充值后使用" : "选择紫微命盘"}
                                        disabled={disabled}
                                    >
                                        <Sparkles className="w-4.5 h-4.5" />
                                        <span className="max-w-[50px] truncate">{hasZiwei?.name || '紫微'}</span>
                                    </button>
                                    {hasZiwei && !disabled && (
                                        <button
                                            type="button"
                                            onClick={() => onClearChart?.('ziwei')}
                                            className="p-1.5 rounded-lg hover:bg-purple-500/10 text-purple-600"
                                            title="清除紫微命盘"
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

                            {/* 分隔线 */}
                            <div className="w-px h-6 bg-border mx-1" />

                            {/* 模型选择器 */}
                            {onModelChange && (
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all text-base ${disabled
                                            ? 'opacity-50 cursor-not-allowed text-foreground-secondary'
                                            : 'hover:bg-background-tertiary text-foreground-secondary hover:text-foreground'
                                            }`}
                                        disabled={disabled}
                                    >
                                        {currentModel.icon}
                                        <span>{currentModel.name}</span>
                                        <ChevronDown className={`w-4 h-4 transition-transform ${modelDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {modelDropdownOpen && !disabled && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-10"
                                                onClick={() => setModelDropdownOpen(false)}
                                            />
                                            <div className="absolute bottom-full left-0 mb-2 w-44 bg-background border border-border rounded-lg shadow-lg z-20 overflow-hidden">
                                                {AI_MODELS.map((model) => (
                                                    <button
                                                        key={model.id}
                                                        type="button"
                                                        onClick={() => {
                                                            onModelChange(model.id);
                                                            setModelDropdownOpen(false);
                                                        }}
                                                        className={`w-full px-3 py-2 text-left text-sm hover:bg-background-secondary transition-colors flex items-center gap-2 ${selectedModel === model.id ? 'bg-accent/10 text-accent' : ''
                                                            }`}
                                                    >
                                                        {model.icon}
                                                        <div>
                                                            <div className="font-medium">{model.name}</div>
                                                            <div className="text-xs text-foreground-secondary">{model.desc}</div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* 发送/停止按钮 */}
                        <button
                            onClick={handleButtonClick}
                            disabled={disabled || (!isLoading && !inputValue.trim())}
                            className={`
                                px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-2 flex-shrink-0
                                ${isLoading
                                    ? 'bg-red-500 text-white hover:bg-red-600'
                                    : inputValue.trim() && !disabled
                                        ? 'bg-foreground text-background hover:bg-foreground/90'
                                        : 'bg-background-tertiary text-foreground-secondary cursor-not-allowed'
                                }
                            `}
                        >
                            {isLoading ? (
                                <>
                                    <Square className="w-4 h-4" />
                                    <span className="text-sm">停止</span>
                                </>
                            ) : (
                                <>
                                    <Send className="w-4.5 h-4.5" />
                                    <span className="text-sm">发送</span>
                                </>
                            )}
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

