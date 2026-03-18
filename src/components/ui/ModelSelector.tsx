/**
 * AI 模型选择器组件
 *
 * 'use client' 标记说明：
 * - 使用 React hooks (useState, useEffect, useMemo)
 * - 有下拉选择交互功能
 */
'use client';

import { useMemo, useEffect, useState } from 'react';
import { readLocalCache, writeLocalCache } from '@/lib/cache';
import { ChevronDown, Lightbulb } from 'lucide-react';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import { getVendorIcon } from '@/lib/ai/vendor-config';
import { DEFAULT_MODEL_ID } from '@/lib/ai/ai-config';
import { registerClientModelNames } from '@/lib/ai/model-name-cache';
import type { AIVendor } from '@/types';
import { supabase } from '@/lib/auth';
import type { MembershipType } from '@/lib/user/membership';

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

interface ModelSelectorProps {
    selectedModel?: string;
    onModelChange?: (modelId: string) => void;
    reasoningEnabled?: boolean;
    onReasoningChange?: (enabled: boolean) => void;
    userId?: string | null;
    membershipType?: MembershipType;
    disabled?: boolean;
    compact?: boolean;
}

export function ModelSelector({
    selectedModel = DEFAULT_MODEL_ID,
    onModelChange,
    reasoningEnabled = false,
    onReasoningChange,
    userId,
    membershipType = 'free',
    disabled = false,
    compact = false,
}: ModelSelectorProps) {
    const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
    const [models, setModels] = useState<ClientModelConfig[]>([]);
    const [modelsLoading, setModelsLoading] = useState(true);
    const [modelsError, setModelsError] = useState<string | null>(null);
    const [refreshNonce, setRefreshNonce] = useState(0);

    useEffect(() => {
        const handleInvalidate = () => {
            setRefreshNonce((value) => value + 1);
        };
        window.addEventListener('mingai:models:invalidate', handleInvalidate);
        return () => {
            window.removeEventListener('mingai:models:invalidate', handleInvalidate);
        };
    }, []);

    useEffect(() => {
        if (!onModelChange) return;
        let isMounted = true;
        const loadModels = async () => {
            const cacheKey = userId
                ? `mingai.models.${userId}.${membershipType}`
                : 'mingai.models.guest';
            const cached = refreshNonce === 0
                ? readLocalCache<ClientModelConfig[]>(cacheKey, 10 * 60 * 1000)
                : null;
            const hasWarmCache = !!(cached && cached.length > 0);

            try {
                if (!isMounted) return;
                setModelsLoading(!hasWarmCache);
                setModelsError(null);

                if (hasWarmCache && cached) {
                    setModels(cached);
                    registerClientModelNames(cached);
                }

                const { data: { session } } = await supabase.auth.getSession();
                const resolvedUserId = userId || session?.user?.id || null;
                const headers: HeadersInit = {};
                if (session?.access_token) {
                    headers.Authorization = `Bearer ${session.access_token}`;
                }
                if (membershipType) {
                    headers['x-membership-type'] = membershipType;
                }

                const response = await fetch('/api/models', { headers });
                const data = await response.json();
                if (!response.ok) {
                    throw new Error(data.error || 'Failed to load models');
                }
                if (isMounted && data.models && data.models.length > 0) {
                    setModels(data.models);
                    registerClientModelNames(data.models);
                    const effectiveCacheKey = resolvedUserId
                        ? `mingai.models.${resolvedUserId}.${membershipType}`
                        : cacheKey;
                    writeLocalCache(effectiveCacheKey, data.models);
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
    }, [membershipType, onModelChange, refreshNonce, userId]);

    useEffect(() => {
        if (!models.length || !onModelChange) return;
        const selected = models.find(model => model.id === selectedModel);
        if (selected && selected.allowed !== false) return;
        const nextModel = models.find(model => model.allowed !== false) || models[0];
        if (nextModel && nextModel.id !== selectedModel) {
            onModelChange(nextModel.id);
        }
    }, [models, onModelChange, selectedModel]);

    const currentModelConfig = useMemo(() => {
        const config = models.find(m => m.id === selectedModel) || models[0];
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

    const modelSelectorDisabled = disabled || modelsLoading || models.length === 0;

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

    useEffect(() => {
        if (!onReasoningChange) return;
        if (!currentModelConfig?.supportsReasoning || !reasoningAllowed) {
            if (reasoningEnabled) onReasoningChange(false);
            return;
        }
        if (currentModelConfig.isReasoningDefault && !reasoningEnabled) {
            onReasoningChange(true);
        }
    }, [currentModelConfig, onReasoningChange, reasoningAllowed, reasoningEnabled]);

    const handleReasoningToggle = () => {
        if (canToggleReasoning && onReasoningChange) {
            onReasoningChange(!reasoningEnabled);
        }
    };

    if (!onModelChange && !onReasoningChange) return null;

    const buttonPadding = compact ? 'px-2 py-1' : 'px-2 py-1.5';
    const textSize = compact ? 'text-xs' : 'text-sm';
    return (
        <div className={`flex items-center`}>
            {onModelChange && (
                <div className="relative">
                    <button
                        type="button"
                        onClick={() => setModelDropdownOpen(!modelDropdownOpen)}
                        className={`flex items-center gap-1.5 ${buttonPadding} rounded-lg transition-all ${textSize} ${modelSelectorDisabled
                            ? 'opacity-50 cursor-not-allowed text-foreground-secondary'
                            : 'hover:bg-background-tertiary text-foreground-secondary hover:text-foreground'
                            }`}
                        disabled={modelSelectorDisabled}
                    >
                        {modelsLoading ? (
                            <SoundWaveLoader variant="inline" />
                        ) : (
                            getVendorIcon(currentModelConfig.vendor)
                        )}
                        <span className={`${compact ? 'max-w-[96px]' : 'max-w-[125px]'} truncate`}>
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
                                            {getVendorIcon(model.vendor)}
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
                        </>
                    )}
                    {modelsError && !modelsLoading && (
                        <div className="mt-1 text-xs text-rose-500">{modelsError}</div>
                    )}
                </div>
            )}

            {onReasoningChange && (
                <>
                    {onModelChange && !compact}
                    <button
                        type="button"
                        onClick={handleReasoningToggle}
                        disabled={disabled || !canToggleReasoning}
                        className={`flex items-center gap-1.5 ${buttonPadding} rounded-lg transition-all ${textSize} ${disabled || !currentModelConfig?.supportsReasoning || !reasoningAllowed
                            ? 'opacity-30 cursor-not-allowed text-foreground-secondary'
                            : isReasoningForced
                                ? 'text-yellow-600 cursor-default'
                                : reasoningEnabled
                                    ? 'text-yellow-600'
                                    : 'hover:bg-background-tertiary text-foreground-secondary hover:text-foreground'
                            }`}
                        title={reasoningTooltip}
                    >
                        <Lightbulb className={`${compact ? 'w-4 h-4' : 'w-4.5 h-4.5'} ${(reasoningEnabled || isReasoningForced) ? 'fill-yellow-500' : ''}`} />
                        <span className={compact ? 'hidden sm:inline' : 'hidden md:inline'}>
                            推理
                        </span>
                    </button>
                </>
            )}
        </div>
    );
}
