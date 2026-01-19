'use client';

import { useRef, useEffect, useState } from 'react';
import { Paperclip, Orbit, X, Sparkles, Square, Plus, Search, FileText, ArrowUp } from 'lucide-react';
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
    // 隐藏底部免责声明
    hideDisclaimer?: boolean;
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
    hideDisclaimer = false,
}: ChatComposerProps) {
    const hasBazi = selectedCharts?.bazi;
    const hasZiwei = selectedCharts?.ziwei;
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [menuOpen, setMenuOpen] = useState(false);
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
        <div className={`fixed left-0 right-0 bottom-[3.5rem] z-30 md:sticky md:bottom-0 md:left-auto md:right-auto border-border bg-gradient-to-t from-background/95 to-transparent backdrop-blur-[2px] md:backdrop-blur-none pb-3 ${disabled ? 'opacity-50' : ''}`}>
            <div className="max-w-3xl mx-auto">
                {/* 输入框容器 */}
                <div className={`
                    relative flex flex-col gap-1 p-3 rounded-4xl
                    bg-background/90 border border-border
                    transition-all duration-300
                `}>
                    {/* 已上传文件显示卡片 */}
                    {hasFile && (
                        <div className="flex items-start gap-2 mb-2">
                            <div className="flex items-center gap-3 px-3 py-2.5 bg-background border border-border rounded-xl max-w-[280px]">
                                <div className="flex-shrink-0 w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center">
                                    <FileText className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">
                                        {attachmentState?.file?.name}
                                    </p>
                                    <p className="text-xs text-foreground-secondary">文件</p>
                                </div>
                                {!disabled && (
                                    <button
                                        type="button"
                                        onClick={() => onAttachmentChange?.({ ...attachmentState, file: undefined, webSearchEnabled: attachmentState?.webSearchEnabled ?? false })}
                                        className="flex-shrink-0 ml-1 p-0.5 rounded-full bg-foreground-secondary/20 hover:bg-foreground-secondary/40 text-foreground-secondary hover:text-foreground transition-colors"
                                        title="移除文件"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 输入框区域 */}
                    <div className="relative">
                        <textarea
                            ref={textareaRef}
                            value={inputValue}
                            onChange={(e) => onInputChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={disabled ? "请充值后继续使用" : "尽管问"}
                            className="w-full bg-transparent resize-none text-base py-2 px-2
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
                            {/* 统一的折叠菜单（电脑端和手机端都使用） */}
                            <div className="relative">
                                <button
                                    type="button"
                                    onClick={() => setMenuOpen(!menuOpen)}
                                    className={`p-2 rounded-lg transition-all ${menuOpen
                                        ? 'bg-background-tertiary text-foreground'
                                        : 'text-foreground-secondary hover:text-foreground hover:bg-background-tertiary'
                                        }`}
                                    title="更多选项"
                                >
                                    <Plus className={`w-5 h-5 transition-transform duration-200 ${menuOpen ? 'rotate-45' : ''}`} />
                                </button>

                                {menuOpen && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                                        <div className="absolute bottom-full left-0 mb-2 w-36 bg-background border border-border rounded-xl shadow-lg z-20 overflow-hidden p-1 flex flex-col gap-1">
                                            {onSelectChart && (
                                                <div className={`flex items-center w-full rounded-lg transition-all ${hasBazi
                                                    ? 'bg-orange-500/10 text-orange-600'
                                                    : 'hover:bg-background-secondary text-foreground-secondary'
                                                    }`}>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            onSelectChart('bazi');
                                                            setMenuOpen(false);
                                                        }}
                                                        className="flex-1 flex items-center gap-2 px-3 py-2.5 text-sm"
                                                        disabled={disabled}
                                                    >
                                                        <Orbit className="w-4.5 h-4.5" />
                                                        <span className="truncate flex flex-col items-start text-left">
                                                            <span className="truncate w-full">{hasBazi?.name || '八字命盘'}</span>
                                                            {hasBazi?.analysisMode && (
                                                                <span className="text-[11px] opacity-70">
                                                                    {hasBazi.analysisMode === 'mangpai' ? '盲派分析' : '传统分析'}
                                                                </span>
                                                            )}
                                                        </span>
                                                    </button>
                                                    {hasBazi && !disabled && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onClearChart?.('bazi');
                                                            }}
                                                            className="p-1.5 mr-1 rounded-lg hover:bg-orange-500/20"
                                                            title="清除八字命盘"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
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
                                                            setMenuOpen(false);
                                                        }}
                                                        className="flex-1 flex items-center gap-2 px-3 py-2.5 text-sm"
                                                        disabled={disabled}
                                                    >
                                                        <Sparkles className="w-4.5 h-4.5" />
                                                        <span className="truncate">{hasZiwei?.name || '紫微命盘'}</span>
                                                    </button>
                                                    {hasZiwei && !disabled && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onClearChart?.('ziwei');
                                                            }}
                                                            className="p-1.5 mr-1 rounded-lg hover:bg-purple-500/20"
                                                            title="清除紫微命盘"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                            {/* 附件选项 */}
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    fileInputRef.current?.click();
                                                    setMenuOpen(false);
                                                }}
                                                className={`flex items-center gap-2 w-full px-3 py-2.5 text-sm rounded-lg transition-all ${hasFile
                                                    ? 'bg-blue-500/10 text-blue-600'
                                                    : 'hover:bg-background-secondary text-foreground-secondary'
                                                    }`}
                                                disabled={disabled}
                                            >
                                                <Paperclip className="w-4.5 h-4.5" />
                                                <span>{hasFile ? '更换附件' : '上传附件'}</span>
                                            </button>
                                            {/* 搜索选项 */}
                                            <div className={`flex items-center w-full rounded-lg transition-all ${hasWebSearch
                                                ? 'bg-green-500/10 text-green-600'
                                                : !canUseWeb
                                                    ? 'opacity-50 text-foreground-secondary hover:bg-background-secondary'
                                                    : 'hover:bg-background-secondary text-foreground-secondary'
                                                }`}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        handleWebToggle();
                                                        setMenuOpen(false);
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

                                {/* 隐藏的文件输入 */}
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    accept=".pdf,.txt,.md,.doc,.docx,.xlsx,.xls,.csv"
                                    onChange={handleFileChange}
                                />
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
                                px-2 py-2 rounded-full transition-all duration-200 flex items-center gap-2 flex-shrink-0
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
                                    <Square className="w-4.5 h-4.5" strokeWidth={2.5} />
                                    {/* <span className="text-sm">停止</span> */}
                                </>
                            ) : (
                                <>
                                    <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
                                    {/* <span className="text-sm">发送</span> */}
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {!hideDisclaimer && (
                    <p className="text-center text-xs text-foreground-secondary/90 mt-1">
                        AI 回复仅供参考，请理性看待命理分析结果
                    </p>
                )}
            </div>
        </div>
    );
}

// 导出类型和配置以保持向后兼容
export type AIModel = string;
export { getModelName } from '@/lib/ai-config';
