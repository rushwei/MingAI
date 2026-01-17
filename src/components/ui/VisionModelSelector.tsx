/**
 * 视觉模型选择器
 * 
 * 仅显示 Qwen VL 和 Gemini VL 模型，用于手相/面相分析
 */
'use client';

import { useMemo, useState, useEffect } from 'react';
import { ChevronDown, Eye, Loader2 } from 'lucide-react';
import { Qwen, Gemini } from '@lobehub/icons';
import type { AIVendor } from '@/types';
import { DEFAULT_VISION_MODEL_ID, VENDOR_NAMES } from '@/lib/ai-config';
import { supabase } from '@/lib/supabase';

interface VisionModelConfig {
    id: string;
    name: string;
    vendor: AIVendor;
    supportsReasoning: boolean;
    isReasoningDefault?: boolean;
    allowed?: boolean;
    blockedReason?: string | null;
    reasoningAllowed?: boolean;
}

const VISION_VENDOR_ICONS: Record<string, React.ReactNode> = {
    'qwen-vl': <Qwen.Color size={18} />,
    'gemini-vl': <Gemini.Color size={18} />,
};

interface VisionModelSelectorProps {
    selectedModel?: string;
    onModelChange?: (modelId: string) => void;
    disabled?: boolean;
    compact?: boolean;
}

export function VisionModelSelector({
    selectedModel = DEFAULT_VISION_MODEL_ID,
    onModelChange,
    disabled = false,
    compact = false,
}: VisionModelSelectorProps) {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [models, setModels] = useState<VisionModelConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!onModelChange) return;
        let isMounted = true;

        const loadModels = async () => {
            try {
                setLoading(true);
                setError(null);

                const { data: { session } } = await supabase.auth.getSession();
                const headers: HeadersInit = {};
                if (session?.access_token) {
                    headers.Authorization = `Bearer ${session.access_token}`;
                }

                const response = await fetch('/api/models?vision=true', { headers });
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to load models');
                }

                if (isMounted && data.models) {
                    // 只保留视觉模型
                    const visionModels = data.models.filter((m: VisionModelConfig) =>
                        m.vendor === 'qwen-vl' || m.vendor === 'gemini-vl'
                    );
                    setModels(visionModels);
                }
            } catch (err) {
                console.error('Failed to load vision models:', err);
                if (isMounted) {
                    setError('加载失败');
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        loadModels();
        return () => { isMounted = false; };
    }, [onModelChange]);

    // 确保选中的模型存在
    useEffect(() => {
        if (!models.length || !onModelChange) return;
        const selected = models.find(model => model.id === selectedModel);
        if (selected && selected.allowed !== false) return;
        const nextModel = models.find(model => model.allowed !== false) || models[0];
        if (nextModel && nextModel.id !== selectedModel) {
            onModelChange(nextModel.id);
        }
    }, [models, onModelChange, selectedModel]);

    const currentModel = useMemo(() => {
        return models.find(m => m.id === selectedModel) || models[0];
    }, [selectedModel, models]);

    const isDisabled = disabled || loading || models.length === 0;

    if (!onModelChange) return null;

    const buttonPadding = compact ? 'px-2 py-1' : 'px-2.5 py-1.5';
    const textSize = compact ? 'text-xs' : 'text-sm';

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className={`flex items-center gap-1.5 ${buttonPadding} rounded-lg transition-all ${textSize} ${isDisabled
                    ? 'opacity-50 cursor-not-allowed text-foreground-secondary'
                    : 'hover:bg-background-secondary border border-border text-foreground-secondary hover:text-foreground'
                    }`}
                disabled={isDisabled}
            >
                {loading ? (
                    <Loader2 className={`${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} animate-spin text-foreground-secondary`} />
                ) : currentModel ? (
                    VISION_VENDOR_ICONS[currentModel.vendor] || <Eye className="w-4 h-4" />
                ) : (
                    <Eye className="w-4 h-4" />
                )}
                <span className={`${compact ? 'max-w-[80px]' : 'max-w-[100px]'} truncate`}>
                    {loading
                        ? '加载中...'
                        : models.length === 0
                            ? '无可用模型'
                            : currentModel?.name || '选择模型'}
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && !isDisabled && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setDropdownOpen(false)}
                    />
                    <div className="absolute top-full left-0 mt-2 w-52 bg-background border border-border rounded-lg shadow-lg z-20 overflow-hidden">
                        <div className="text-xs font-medium text-foreground-secondary px-3 py-2 bg-background-secondary/50 border-b border-border">
                            视觉分析模型
                        </div>
                        {models.map((model) => {
                            const isAllowed = model.allowed !== false;
                            return (
                                <button
                                    key={model.id}
                                    type="button"
                                    onClick={() => {
                                        if (isAllowed && onModelChange) {
                                            onModelChange(model.id);
                                        }
                                        setDropdownOpen(false);
                                    }}
                                    className={`w-full px-3 py-2.5 text-left text-sm transition-colors flex items-center gap-2 ${isAllowed ? 'hover:bg-background-secondary' : 'opacity-50 cursor-not-allowed'
                                        } ${selectedModel === model.id ? 'bg-accent/10 text-accent' : ''}`}
                                    disabled={!isAllowed}
                                >
                                    {VISION_VENDOR_ICONS[model.vendor] || <Eye className="w-4 h-4" />}
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium truncate">{model.name}</div>
                                        <div className="text-xs text-foreground-secondary">
                                            {VENDOR_NAMES[model.vendor] || model.vendor}
                                        </div>
                                    </div>
                                    {!isAllowed && model.blockedReason && (
                                        <span className="text-xs text-amber-600">{model.blockedReason}</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </>
            )}

            {error && !loading && (
                <div className="mt-1 text-xs text-rose-500">{error}</div>
            )}
        </div>
    );
}
