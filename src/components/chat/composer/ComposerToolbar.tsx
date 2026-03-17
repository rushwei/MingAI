/**
 * Composer 底部工具栏
 *
 * 'use client' 标记说明：
 * - 需要处理用户交互事件
 */
'use client';

import { Paperclip, Orbit, X, Sparkles, Square, Plus, ArrowUp, BookOpenText, AtSign, Globe, Moon } from 'lucide-react';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import type { SelectedCharts } from '@/components/chat/BaziChartSelector';
import type { MembershipType } from '@/lib/user/membership';
import { ModelSelector } from '@/components/ui/ModelSelector';
import { PromptPreview } from '@/components/chat/composer/PromptPreview';
import type { PromptLayerDiagnostic } from '@/types';

interface ComposerToolbarProps {
    // Menu
    menuOpen: boolean;
    setMenuOpen: (open: boolean) => void;
    // File
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    hasFile: boolean;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    // Web search
    hasWebSearch: boolean;
    canUseWeb: boolean;
    handleWebToggle: () => void;
    // Charts
    hasBazi: SelectedCharts['bazi'];
    hasZiwei: SelectedCharts['ziwei'];
    onSelectChart?: (type?: 'bazi' | 'ziwei') => void;
    onClearChart?: (type: 'bazi' | 'ziwei') => void;
    // Dream
    dreamMode: boolean;
    onDreamModeChange?: (enabled: boolean) => void;
    userId?: string | null;
    // Knowledge base
    knowledgeBaseEnabled: boolean;
    canUseKnowledgeBase: boolean;
    handleKnowledgeBaseOpen: () => void;
    // Mention
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    inputValue: string;
    onInputChange: (value: string) => void;
    setMentionOpen: (open: boolean) => void;
    setMentionQuery: (query: string) => void;
    setMentionStartIndex: (index: number | null) => void;
    // Prompt preview
    promptPreviewLoading: boolean;
    hasPromptDiagnostics: boolean;
    promptDiagnosticsOpen: boolean;
    setPromptDiagnosticsOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
    contextProgressPercent: number;
    promptProgressPercent: number;
    promptUsageLabel: string;
    displayLayers: PromptLayerDiagnostic[];
    displayUserMessageTokens: number;
    formatLayerLabel: (layerId: string) => string;
    // Model
    selectedModel: string;
    onModelChange?: (modelId: string) => void;
    reasoningEnabled: boolean;
    onReasoningChange?: (enabled: boolean) => void;
    membershipType: MembershipType;
    // Send
    disabled: boolean;
    isLoading: boolean;
    isSendingToList: boolean;
    dreamContextLoading: boolean;
    handleButtonClick: () => void;
}

export function ComposerToolbar(props: ComposerToolbarProps) {
    const {
        menuOpen, setMenuOpen,
        fileInputRef, hasFile, handleFileChange,
        hasWebSearch, canUseWeb, handleWebToggle,
        hasBazi, hasZiwei, onSelectChart, onClearChart,
        dreamMode, onDreamModeChange, userId,
        knowledgeBaseEnabled, canUseKnowledgeBase, handleKnowledgeBaseOpen,
        textareaRef, inputValue, onInputChange,
        setMentionOpen, setMentionQuery, setMentionStartIndex,
        promptPreviewLoading, hasPromptDiagnostics, promptDiagnosticsOpen,
        setPromptDiagnosticsOpen, contextProgressPercent, promptProgressPercent,
        promptUsageLabel, displayLayers, displayUserMessageTokens, formatLayerLabel,
        selectedModel, onModelChange, reasoningEnabled, onReasoningChange, membershipType,
        disabled, isLoading, isSendingToList, dreamContextLoading, handleButtonClick,
    } = props;

    return (
        <div className="flex items-center justify-between border-border/50">
            {/* 左侧按钮组 */}
            <div className="flex items-center gap-1 flex-shrink-0">
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setMenuOpen(!menuOpen)}
                        className={`h-10 w-10 rounded-xl transition-all flex items-center justify-center ${menuOpen
                            ? 'bg-background-tertiary text-foreground'
                            : 'text-foreground-secondary hover:text-foreground hover:bg-background-tertiary'
                            }`}
                        title="更多选项"
                    >
                        <Plus className={`w-5.5 h-5.5 transition-transform duration-200 ${menuOpen ? 'rotate-45' : ''}`} />
                    </button>

                    {menuOpen && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                            <div className="absolute bottom-full left-0 mb-2 w-38 bg-background border border-border rounded-xl shadow-lg z-20 overflow-hidden p-1 flex flex-col gap-1">
                                {/* 附件选项 */}
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (dreamMode) return;
                                        fileInputRef.current?.click();
                                        setMenuOpen(false);
                                    }}
                                    className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-all ${hasFile
                                        ? 'bg-blue-500/10 text-blue-600'
                                        : dreamMode
                                            ? 'opacity-40 text-foreground-secondary cursor-not-allowed'
                                            : 'hover:bg-background-secondary text-foreground-secondary'
                                        }`}
                                    disabled={disabled || dreamMode}
                                >
                                    <Paperclip className="w-4.5 h-4.5" />
                                    <span>{hasFile ? '更换附件' : '上传附件'}</span>
                                </button>
                                {/* 搜索选项 */}
                                <div className={`flex items-center w-full rounded-lg transition-all ${hasWebSearch
                                    ? 'bg-green-500/10 text-green-600'
                                    : (!canUseWeb || dreamMode)
                                        ? 'opacity-40 text-foreground-secondary cursor-not-allowed'
                                        : 'hover:bg-background-secondary text-foreground-secondary'
                                    }`}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (dreamMode) return;
                                            handleWebToggle();
                                            setMenuOpen(false);
                                        }}
                                        className="flex-1 flex items-center gap-2 px-3 py-2 text-sm"
                                        disabled={disabled || dreamMode}
                                    >
                                        <Globe className="w-4.5 h-4.5" />
                                        <span>{!canUseWeb ? '搜索 (Plus+)' : '搜索'}</span>
                                    </button>
                                </div>
                                {onSelectChart && (
                                    <div className={`flex items-center w-full rounded-lg transition-all ${hasBazi
                                        ? 'bg-orange-500/10 text-orange-600'
                                        : dreamMode
                                            ? 'opacity-40 text-foreground-secondary cursor-not-allowed'
                                            : 'hover:bg-background-secondary text-foreground-secondary'
                                        }`}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (dreamMode) return;
                                                onSelectChart('bazi');
                                                setMenuOpen(false);
                                            }}
                                            className="flex-1 flex items-center gap-2 px-3 py-2 text-sm"
                                            disabled={disabled || dreamMode}
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
                                        : dreamMode
                                            ? 'opacity-40 text-foreground-secondary cursor-not-allowed'
                                            : 'hover:bg-background-secondary text-foreground-secondary'
                                        }`}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (dreamMode) return;
                                                onSelectChart('ziwei');
                                                setMenuOpen(false);
                                            }}
                                            className="flex-1 flex items-center gap-2 px-3 py-2 text-sm"
                                            disabled={disabled || dreamMode}
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
                                {!!userId && onDreamModeChange && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onDreamModeChange(!dreamMode);
                                            setMenuOpen(false);
                                            textareaRef.current?.focus();
                                        }}
                                        className={`flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-all ${dreamMode
                                            ? 'bg-purple-500/10 text-purple-600'
                                            : 'hover:bg-background-secondary text-foreground-secondary'
                                            }`}
                                        disabled={disabled}
                                    >
                                        <Moon className="w-4.5 h-4.5" />
                                        <span>周公解梦</span>
                                    </button>
                                )}
                                {!!userId && knowledgeBaseEnabled && (
                                    <div className={`flex items-center w-full rounded-lg transition-all ${canUseKnowledgeBase
                                        ? 'hover:bg-background-secondary text-foreground-secondary'
                                        : 'opacity-50 text-foreground-secondary hover:bg-background-secondary'
                                        }`}>
                                        <button
                                            type="button"
                                            onClick={handleKnowledgeBaseOpen}
                                            className="flex-1 flex items-center gap-2 w-full px-3 py-2 text-sm"
                                            disabled={disabled}
                                        >
                                            <BookOpenText className="w-4.5 h-4.5" />
                                            <span>{canUseKnowledgeBase ? '知识库' : '知识库 (Plus+)'}</span>
                                        </button>
                                    </div>
                                )}
                                {!!userId && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const textarea = textareaRef.current;
                                            const caret = textarea?.selectionStart ?? inputValue.length;
                                            const before = inputValue.slice(0, caret);
                                            const after = inputValue.slice(caret);
                                            const nextValue = `${before}@${after}`;
                                            onInputChange(nextValue);
                                            setMentionOpen(true);
                                            setMentionQuery('');
                                            setMentionStartIndex(caret);
                                            setMenuOpen(false);
                                            requestAnimationFrame(() => {
                                                textareaRef.current?.focus();
                                                textareaRef.current?.setSelectionRange(caret + 1, caret + 1);
                                            });
                                        }}
                                        className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg transition-all hover:bg-background-secondary text-foreground-secondary"
                                        disabled={disabled}
                                    >
                                        <AtSign className="w-4.5 h-4.5" />
                                        <span className="truncate flex flex-col items-start text-left">
                                            <span className="truncate w-full">提及</span>
                                        </span>
                                    </button>
                                )}
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

                <div className="flex items-center gap-2 pl-1 pr-2">
                    <PromptPreview
                        promptPreviewLoading={promptPreviewLoading}
                        hasPromptDiagnostics={hasPromptDiagnostics}
                        promptDiagnosticsOpen={promptDiagnosticsOpen}
                        setPromptDiagnosticsOpen={setPromptDiagnosticsOpen}
                        contextProgressPercent={contextProgressPercent}
                        promptProgressPercent={promptProgressPercent}
                        promptUsageLabel={promptUsageLabel}
                        displayLayers={displayLayers}
                        displayUserMessageTokens={displayUserMessageTokens}
                        formatLayerLabel={formatLayerLabel}
                    />
                </div>

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
                disabled={disabled || isSendingToList || (!isLoading && (!inputValue.trim() || dreamContextLoading))}
                className={`
                    px-2 py-2 rounded-full transition-all duration-200 flex items-center gap-2 flex-shrink-0
                    ${isSendingToList
                        ? 'bg-background-tertiary text-foreground-secondary cursor-wait'
                        : isLoading
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : inputValue.trim() && !disabled && !dreamContextLoading
                            ? 'bg-foreground text-background hover:bg-foreground/90'
                            : 'bg-background-tertiary text-foreground-secondary cursor-not-allowed'
                    }
                `}
            >
                {isSendingToList ? (
                    <SoundWaveLoader variant="inline" />
                ) : isLoading ? (
                    <Square className="w-4.5 h-4.5" strokeWidth={2.5} />
                ) : (
                    <ArrowUp className="w-5 h-5" strokeWidth={2.5} />
                )}
            </button>
        </div>
    );
}
