'use client';

import { useRef, useEffect, useState } from 'react';
import { Send, Paperclip, Orbit, X, Sparkles, Square, Plus, Search } from 'lucide-react';
import type { SelectedCharts } from './BaziChartSelector';
import type { AttachmentState } from '@/types';
import { DEFAULT_MODEL_ID } from '@/lib/ai-config';
import type { MembershipType } from '@/lib/membership';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { useToast } from '@/components/ui/Toast';

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
    selectedModel?: string;
    onModelChange?: (modelId: string) => void;
    reasoningEnabled?: boolean;
    onReasoningChange?: (enabled: boolean) => void;
    userId?: string | null;
    membershipType?: MembershipType;
    // 附件和搜索相关
    attachmentState?: AttachmentState;
    onAttachmentChange?: (state: AttachmentState) => void;
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
    selectedModel = DEFAULT_MODEL_ID,
    onModelChange,
    reasoningEnabled = false,
    onReasoningChange,
    userId,
    membershipType = 'free',
    attachmentState,
    onAttachmentChange,
}: ChatComposerProps) {
    const hasBazi = selectedCharts?.bazi;
    const hasZiwei = selectedCharts?.ziwei;
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { showToast } = useToast();

    // 权限判断
    const canUseWeb = membershipType !== 'free';
    const canUseBoth = membershipType === 'pro';
    const hasFile = !!attachmentState?.file;
    const hasWebSearch = !!attachmentState?.webSearchEnabled;

    // 文件选择处理
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !onAttachmentChange) return;

        // plus会员：选择文件时自动关闭搜索，并提示
        if (!canUseBoth && attachmentState?.webSearchEnabled) {
            onAttachmentChange({ file, webSearchEnabled: false });
            showToast('info', '同时使用搜索和附件仅限 Pro 用户，已自动关闭搜索');
        } else {
            onAttachmentChange({ ...attachmentState, file, webSearchEnabled: attachmentState?.webSearchEnabled ?? false });
        }
        // 清空input以便重复选择同一文件
        e.target.value = '';
    };

    // 搜索切换处理
    const handleWebToggle = () => {
        if (!onAttachmentChange) return;

        // Free 用户提示
        if (!canUseWeb) {
            showToast('info', '网络搜索仅限 Plus 以上用户使用');
            return;
        }

        const newWebSearch = !attachmentState?.webSearchEnabled;
        // plus会员：启用搜索时自动清除文件，并提示
        if (!canUseBoth && attachmentState?.file && newWebSearch) {
            onAttachmentChange({ file: undefined, webSearchEnabled: true });
            showToast('info', '同时使用搜索和附件仅限 Pro 用户，已自动清除附件');
        } else {
            onAttachmentChange({
                file: attachmentState?.file,
                webSearchEnabled: newWebSearch
            });
        }
    };

    // 自动调整 textarea 高度
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.style.height = 'auto';
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
        <div className={`fixed left-0 right-0 bottom-[6rem] z-30 md:sticky md:bottom-0 md:left-auto md:right-auto border-border bg-gradient-to-t from-background/95 to-transparent backdrop-blur-[2px] md:backdrop-blur-none pb-3 ${disabled ? 'opacity-50' : ''}`}>
            <div className="max-w-3xl mx-auto">
                {/* 输入框容器 */}
                <div className={`
                    relative flex flex-col gap-1 p-3 rounded-2xl
                    bg-background/90 border border-border
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
                               placeholder:text-foreground-secondary/80
                               disabled:cursor-not-allowed
                               overflow-y-auto"
                            disabled={disabled}
                            rows={1}
                        />
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background/60 to-transparent" />
                    </div>

                    {/* 底部按钮栏 */}
                    <div className="flex items-center justify-between border-border/50">
                        {/* 左侧按钮组 */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                            {/* 桌面端：展开的工具栏 */}
                            <div className="hidden md:flex items-center gap-1">
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

                                <div className="w-px h-6 bg-border mx-1" />

                                {/* 附件按钮 */}
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all text-sm ${disabled
                                            ? 'opacity-50 cursor-not-allowed text-foreground-secondary'
                                            : hasFile
                                                ? 'bg-blue-500/10 text-blue-600'
                                                : 'hover:bg-background-tertiary text-foreground-secondary hover:text-foreground'
                                            }`}
                                        title={hasFile ? attachmentState?.file?.name : '上传附件'}
                                        disabled={disabled}
                                    >
                                        <Paperclip className="w-4.5 h-4.5" />
                                        <span className="max-w-[80px] truncate">{hasFile ? attachmentState?.file?.name : '附件'}</span>
                                    </button>
                                    {hasFile && !disabled && (
                                        <button
                                            type="button"
                                            onClick={() => onAttachmentChange?.({ ...attachmentState, file: undefined, webSearchEnabled: attachmentState?.webSearchEnabled ?? false })}
                                            className="p-1.5 rounded-lg hover:bg-blue-500/10 text-blue-600"
                                            title="清除附件"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {/* 搜索按钮 */}
                                <button
                                    type="button"
                                    onClick={handleWebToggle}
                                    className={`p-2 rounded-lg transition-all ${
                                        hasWebSearch
                                            ? 'bg-green-500/10 text-green-600'
                                            : !canUseWeb
                                                ? 'opacity-50 text-foreground-secondary hover:bg-background-tertiary'
                                                : disabled
                                                    ? 'opacity-50 cursor-not-allowed text-foreground-secondary'
                                                    : 'text-foreground-secondary hover:text-foreground hover:bg-background-tertiary'
                                    }`}
                                    title={!canUseWeb ? '网络搜索仅限 Plus 以上用户' : '网络搜索'}
                                    disabled={disabled}
                                >
                                    <Search className="w-5 h-5" />
                                </button>

                                {/* 隐藏的文件输入 */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.txt,.md,.doc,.docx,.xlsx,.xls,.csv"
                                    onChange={handleFileChange}
                                />
                            </div>

                            {/* 移动端：折叠菜单 */}
                            <div className="md:hidden relative">
                                <button
                                    type="button"
                                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                    className={`p-2 rounded-lg transition-all ${mobileMenuOpen
                                        ? 'bg-background-tertiary text-foreground'
                                        : 'text-foreground-secondary hover:text-foreground'
                                        }`}
                                >
                                    <Plus className={`w-5 h-5 transition-transform duration-200 ${mobileMenuOpen ? 'rotate-45' : ''}`} />
                                </button>

                                {mobileMenuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setMobileMenuOpen(false)} />
                                        <div className="absolute bottom-full left-0 mb-2 w-48 bg-background border border-border rounded-xl shadow-lg z-20 overflow-hidden p-1 flex flex-col gap-1">
                                            {onSelectChart && (
                                                <div className={`flex items-center w-full rounded-lg transition-all ${hasBazi
                                                    ? 'bg-orange-500/10 text-orange-600'
                                                    : 'hover:bg-background-secondary text-foreground-secondary'
                                                    }`}>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            onSelectChart('bazi');
                                                            setMobileMenuOpen(false);
                                                        }}
                                                        className="flex-1 flex items-center gap-2 px-3 py-2.5 text-sm"
                                                        disabled={disabled}
                                                    >
                                                        <Orbit className="w-4.5 h-4.5" />
                                                        <span>{hasBazi?.name || '八字命盘'}</span>
                                                    </button>
                                                </div>
                                            )}
                                            {onSelectChart && (
                                                <div className={`flex items-center w-full rounded-lg transition-all ${hasZiwei
                                                    ? 'bg-purple-500/10 text-purple-600'
                                                    : 'hover:bg-background-secondary text-foreground-secondary'
                                                    }`}>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            onSelectChart('ziwei');
                                                            setMobileMenuOpen(false);
                                                        }}
                                                        className="flex-1 flex items-center gap-2 px-3 py-2.5 text-sm"
                                                        disabled={disabled}
                                                    >
                                                        <Sparkles className="w-4.5 h-4.5" />
                                                        <span>{hasZiwei?.name || '紫微命盘'}</span>
                                                    </button>
                                                </div>
                                            )}
                                            {/* 附件选项 */}
                                            <div className={`flex items-center w-full rounded-lg transition-all ${hasFile
                                                ? 'bg-blue-500/10 text-blue-600'
                                                : 'hover:bg-background-secondary text-foreground-secondary'
                                                }`}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        fileInputRef.current?.click();
                                                        setMobileMenuOpen(false);
                                                    }}
                                                    className="flex-1 flex items-center gap-2 px-3 py-2.5 text-sm"
                                                    disabled={disabled}
                                                >
                                                    <Paperclip className="w-4.5 h-4.5" />
                                                    <span>{hasFile ? attachmentState?.file?.name : '上传附件'}</span>
                                                </button>
                                            </div>
                                            {/* 搜索选项 */}
                                            <div className={`flex items-center w-full rounded-lg transition-all ${
                                                hasWebSearch
                                                    ? 'bg-green-500/10 text-green-600'
                                                    : !canUseWeb
                                                        ? 'opacity-50 text-foreground-secondary hover:bg-background-secondary'
                                                        : 'hover:bg-background-secondary text-foreground-secondary'
                                                }`}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        handleWebToggle();
                                                        setMobileMenuOpen(false);
                                                    }}
                                                    className="flex-1 flex items-center gap-2 px-3 py-2.5 text-sm"
                                                    disabled={disabled}
                                                >
                                                    <Search className="w-4.5 h-4.5" />
                                                    <span>{!canUseWeb ? '搜索 (Plus+)' : hasWebSearch ? '搜索已启用' : '网络搜索'}</span>
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="w-px h-6 bg-border mx-1" />

                            <ModelSelector
                                selectedModel={selectedModel}
                                onModelChange={onModelChange}
                                reasoningEnabled={reasoningEnabled}
                                onReasoningChange={onReasoningChange}
                                userId={userId}
                                membershipType={membershipType}
                                disabled={disabled}
                            />
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

                <p className="text-center text-xs text-foreground-secondary/90 mt-1">
                    AI 回复仅供参考，请理性看待命理分析结果
                </p>
            </div>
        </div>
    );
}

// 导出类型和配置以保持向后兼容
export type AIModel = string;
export { getModelName } from '@/lib/ai-config';
