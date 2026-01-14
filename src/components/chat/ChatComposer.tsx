'use client';

import { useRef, useEffect, useState, useMemo } from 'react';
import { Send, Paperclip, Orbit, X, Sparkles, Square, ChevronDown, Plus, Lightbulb, Loader2 } from 'lucide-react';
import type { SelectedCharts } from './BaziChartSelector';
import { Zhipu, DeepSeek, Gemini, Qwen, Claude } from '@lobehub/icons';
import type { AIVendor } from '@/types';
import { VENDOR_NAMES, DEFAULT_MODEL_ID } from '@/lib/ai-config';
import { supabase } from '@/lib/supabase';
import type { MembershipType } from '@/lib/membership';

// 客户端用的模型配置类型（不包含敏感信息）
interface ClientModelConfig {
    id: string;
    name: string;
    vendor: AIVendor;
    supportsReasoning: boolean;
    isReasoningDefault?: boolean;
    allowed?: boolean;
    blockedReason?: string | null;
    reasoningAllowed?: boolean;
}

// 供应商图标映射
const VENDOR_ICONS: Record<AIVendor, React.ReactNode> = {
    deepseek: <DeepSeek.Color size={18} />,
    glm: <Zhipu.Color size={18} />,
    gemini: <Gemini.Color size={18} />,
    qwen: <Qwen.Color size={18} />,
    deepai: <Claude.Color size={18} />,
};

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
}: ChatComposerProps) {
    const hasBazi = selectedCharts?.bazi;
    const hasZiwei = selectedCharts?.ziwei;
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [models, setModels] = useState<ClientModelConfig[]>([]);
    const [modelsLoading, setModelsLoading] = useState(true);
    const [modelsError, setModelsError] = useState<string | null>(null);

    // 从 API 加载模型配置
    useEffect(() => {
        let isMounted = true;
        const loadModels = async () => {
            try {
                if (!isMounted) return;
                setModelsLoading(true);
                setModelsError(null);

                const { data: { session } } = await supabase.auth.getSession();
                const resolvedUserId = userId || session?.user?.id || null;
                const headers: HeadersInit = {};
                if (session?.access_token) {
                    headers.Authorization = `Bearer ${session.access_token}`;
                }
                if (membershipType) {
                    headers['x-membership-type'] = membershipType;
                }

                const cacheKey = resolvedUserId
                    ? `mingai.models.${resolvedUserId}.${membershipType}`
                    : 'mingai.models.guest';

                if (typeof window !== 'undefined') {
                    const cached = window.localStorage.getItem(cacheKey);
                    if (cached) {
                        try {
                            const parsed = JSON.parse(cached) as {
                                expiresAt: number;
                                models: ClientModelConfig[];
                            };
                            if (parsed.expiresAt > Date.now() && parsed.models?.length) {
                                setModels(parsed.models);
                                setModelsLoading(false);
                                return;
                            }
                        } catch {
                            window.localStorage.removeItem(cacheKey);
                        }
                    }
                }

                const response = await fetch('/api/models', { headers });
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'Failed to load models');
                }
                if (isMounted && data.models && data.models.length > 0) {
                    setModels(data.models);
                    if (typeof window !== 'undefined') {
                        window.localStorage.setItem(
                            cacheKey,
                            JSON.stringify({
                                expiresAt: Date.now() + 10 * 60 * 1000,
                                models: data.models,
                            })
                        );
                    }
                }
            } catch (err) {
                console.error('Failed to load models:', err);
                if (isMounted) {
                    setModelsError('模型加载失败');
                }
            } finally {
                if (isMounted) {
                    setModelsLoading(false);
                }
            }
        };
        loadModels();
        return () => {
            isMounted = false;
        };
    }, [membershipType, userId]);

    useEffect(() => {
        if (!models.length || !onModelChange) return;
        const selected = models.find(model => model.id === selectedModel);
        if (selected && selected.allowed !== false) return;
        const nextModel = models.find(model => model.allowed !== false) || models[0];
        if (nextModel && nextModel.id !== selectedModel) {
            onModelChange(nextModel.id);
        }
    }, [models, onModelChange, selectedModel]);

    // 当前选中的模型配置
    const currentModelConfig = useMemo(() => {
        const config = models.find(m => m.id === selectedModel) || models[0];
        // 如果没有配置任何模型，返回一个默认占位配置
        if (!config) {
            return {
                id: 'none',
                name: '未配置模型',
                vendor: 'deepseek' as const,
                supportsReasoning: false,
            };
        }
        return config;
    }, [selectedModel, models]);

    // 按供应商分组模型
    const modelsByVendor = useMemo(() => {
        const grouped: Record<AIVendor, ClientModelConfig[]> = {
            deepseek: [],
            glm: [],
            gemini: [],
            qwen: [],
            deepai: [],
        };
        models.forEach(model => {
            grouped[model.vendor].push(model);
        });
        return grouped;
    }, [models]);

    const modelSelectorDisabled = disabled || modelsLoading || models.length === 0;

    // 判断当前模型是否支持推理
    const reasoningAllowed = currentModelConfig?.reasoningAllowed ?? currentModelConfig?.supportsReasoning;
    const canToggleReasoning = reasoningAllowed && currentModelConfig?.supportsReasoning && !currentModelConfig?.isReasoningDefault;
    const isReasoningForced = reasoningAllowed && currentModelConfig?.isReasoningDefault;
    const reasoningTooltip = membershipType === 'free'
        ? '请升级会员使用'
        : !currentModelConfig?.supportsReasoning
            ? '当前模型不支持推理模式'
            : !reasoningAllowed
                ? (currentModelConfig?.blockedReason || '当前会员等级无法使用推理模式')
                : isReasoningForced
                    ? '此模型默认开启推理'
                    : reasoningEnabled
                        ? '关闭推理模式'
                        : '开启推理模式';

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

    const handleReasoningToggle = () => {
        if (canToggleReasoning && onReasoningChange) {
            onReasoningChange(!reasoningEnabled);
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
                                <button
                                    type="button"
                                    className="p-2 rounded-lg text-foreground-secondary hover:text-foreground hover:bg-background-tertiary transition-all opacity-50"
                                    title="附件（开发中）"
                                    disabled
                                >
                                    <Paperclip className="w-5 h-5" />
                                </button>
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
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="w-px h-6 bg-border mx-1" />

                            {/* 模型选择器 */}
                            {onModelChange && (
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all text-sm ${modelSelectorDisabled
                                            ? 'opacity-50 cursor-not-allowed text-foreground-secondary'
                                            : 'hover:bg-background-tertiary text-foreground-secondary hover:text-foreground'
                                            }`}
                                        disabled={modelSelectorDisabled}
                                    >
                                        {modelsLoading ? (
                                            <Loader2 className="w-4 h-4 animate-spin text-foreground-secondary" />
                                        ) : (
                                            VENDOR_ICONS[currentModelConfig.vendor]
                                        )}
                                        <span className="max-w-[120px] truncate">
                                            {modelsLoading
                                                ? '模型加载中...'
                                                : models.length === 0
                                                    ? '暂无可用模型'
                                                    : currentModelConfig.name}
                                        </span>
                                        <ChevronDown className={`w-4 h-4 transition-transform ${modelDropdownOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    {modelDropdownOpen && !modelSelectorDisabled && (
                                        <>
                                            <div
                                                className="fixed inset-0 z-10"
                                                onClick={() => setModelDropdownOpen(false)}
                                            />
                                            <div className="absolute bottom-full left-0 mb-2 w-56 max-h-80 overflow-y-auto bg-background border border-border rounded-lg shadow-lg z-20">
                                                {(Object.keys(modelsByVendor) as AIVendor[]).map((vendor) => {
                                                    const models = modelsByVendor[vendor];
                                                    if (models.length === 0) return null;
                                                    return (
                                                        <div key={vendor}>
                                                            <div className="px-3 py-1.5 text-xs font-medium text-foreground-secondary bg-background-secondary/50 sticky top-0">
                                                                {VENDOR_NAMES[vendor]}
                                                            </div>
                                                            {models.map((model) => {
                                                                const isAllowed = model.allowed !== false;
                                                                return (
                                                                <button
                                                                    key={model.id}
                                                                    type="button"
                                                                    onClick={() => {
                                                                        onModelChange(model.id);
                                                                        setModelDropdownOpen(false);
                                                                    }}
                                                                    className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center gap-2 ${isAllowed ? 'hover:bg-background-secondary' : 'opacity-50 cursor-not-allowed'} ${selectedModel === model.id ? 'bg-accent/10 text-accent' : ''}`}
                                                                    disabled={!isAllowed}
                                                                >
                                                                    {VENDOR_ICONS[model.vendor]}
                                                                    <div className="flex-1 min-w-0">
                                                                        <div className="font-medium truncate">{model.name}</div>
                                                                    </div>
                                                                    {!isAllowed && model.blockedReason && (
                                                                        <span className="text-xs text-amber-600 whitespace-nowrap">{model.blockedReason}</span>
                                                                    )}
                                                                </button>
                                                                );
                                                            })}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
                                    {modelsError && !modelsLoading && (
                                        <div className="mt-1 text-xs text-rose-500">{modelsError}</div>
                                    )}
                                </div>
                            )}

                            <div className="w-px h-6 bg-border mx-1" />

                            {/* 推理模式按钮 */}
                            {onReasoningChange && (
                                <button
                                    type="button"
                                    onClick={handleReasoningToggle}
                                    disabled={disabled || !canToggleReasoning}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all text-sm ${disabled || !currentModelConfig?.supportsReasoning || !reasoningAllowed
                                        ? 'opacity-30 cursor-not-allowed text-foreground-secondary'
                                        : isReasoningForced
                                            ? 'bg-yellow-500/20 text-yellow-600 cursor-default'
                                            : reasoningEnabled
                                                ? 'bg-yellow-500/20 text-yellow-600 hover:bg-yellow-500/30'
                                                : 'hover:bg-background-tertiary text-foreground-secondary hover:text-foreground'
                                        }`}
                                    title={reasoningTooltip}
                                >
                                    <Lightbulb className={`w-4.5 h-4.5 ${(reasoningEnabled || isReasoningForced) ? 'fill-yellow-500' : ''}`} />
                                    <span className="hidden md:inline">
                                        {isReasoningForced ? '推理' : reasoningEnabled ? '推理' : '推理'}
                                    </span>
                                </button>
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
