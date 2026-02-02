/**
 * AI 模型管理面板
 *
 * 功能：
 * - 查看所有模型及其配置
 * - 启用/禁用模型
 * - 修改模型参数
 * - 切换活跃来源
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Loader2,
    RefreshCw,
    Check,
    X,
    ChevronDown,
    ChevronUp,
    Zap,
    Eye,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/Toast';

// 类型定义
interface ModelSource {
    id: string;
    sourceKey: string;
    sourceName: string;
    apiUrl: string;
    apiKeyEnvVar: string;
    hasApiKey: boolean;
    isActive: boolean;
    isEnabled: boolean;
}

interface AIModel {
    id: string;
    modelKey: string;
    displayName: string;
    vendor: string;
    isEnabled: boolean;
    sortOrder: number;
    requiredTier: 'free' | 'plus' | 'pro';
    supportsReasoning: boolean;
    reasoningRequiredTier: string;
    isReasoningDefault: boolean;
    supportsVision: boolean;
    defaultTemperature: number;
    defaultMaxTokens: number;
    description: string | null;
    sources: ModelSource[];
}

const TIER_LABELS: Record<string, { label: string; color: string }> = {
    free: { label: 'Free', color: 'text-gray-500 bg-gray-500/10' },
    plus: { label: 'Plus', color: 'text-amber-500 bg-amber-500/10' },
    pro: { label: 'Pro', color: 'text-purple-500 bg-purple-500/10' },
};

const VENDOR_LABELS: Record<string, string> = {
    deepseek: 'DeepSeek',
    glm: 'GLM',
    gemini: 'Gemini',
    qwen: 'Qwen',
    deepai: 'DeepAI',
    moonshot: 'Kimi',
    'qwen-vl': 'Qwen VL',
    'gemini-vl': 'Gemini VL',
};

export function AIModelPanel() {
    const [models, setModels] = useState<AIModel[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedModel, setExpandedModel] = useState<string | null>(null);
    const [updating, setUpdating] = useState<string | null>(null);
    const { showToast } = useToast();

    // 获取 token
    const getToken = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token;
    }, []);

    // 加载模型列表
    const loadModels = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const token = await getToken();
            if (!token) {
                setError('未登录');
                return;
            }

            const response = await fetch('/api/admin/ai-models?includeDisabled=true', {
                headers: { Authorization: `Bearer ${token}` },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || '获取模型列表失败');
            }

            setModels(data.models || []);
        } catch (e) {
            setError(e instanceof Error ? e.message : '获取模型列表失败');
        } finally {
            setLoading(false);
        }
    }, [getToken]);

    useEffect(() => {
        loadModels();
    }, [loadModels]);

    // 更新模型
    const updateModel = async (modelId: string, updates: Partial<AIModel>) => {
        setUpdating(modelId);

        try {
            const token = await getToken();
            if (!token) return;

            const response = await fetch(`/api/admin/ai-models/${modelId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(updates),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || '更新失败');
            }

            // 刷新列表
            await loadModels();
        } catch (e) {
            console.error('Update model failed:', e);
            showToast('error', e instanceof Error ? e.message : '更新失败');
        } finally {
            setUpdating(null);
        }
    };

    // 切换活跃来源
    const activateSource = async (modelId: string, sourceId: string) => {
        setUpdating(modelId);

        try {
            const token = await getToken();
            if (!token) return;

            const response = await fetch(
                `/api/admin/ai-models/${modelId}/sources/${sourceId}`,
                {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || '切换来源失败');
            }

            // 刷新列表
            await loadModels();
        } catch (e) {
            console.error('Activate source failed:', e);
            showToast('error', e instanceof Error ? e.message : '切换来源失败');
        } finally {
            setUpdating(null);
        }
    };

    // 清除缓存
    const clearCache = async () => {
        try {
            const token = await getToken();
            if (!token) return;

            const response = await fetch('/api/admin/ai-models/cache', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
                showToast('success', '缓存已清除');
            }
        } catch (e) {
            console.error('Clear cache failed:', e);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-accent" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <p className="text-red-500 mb-4">{error}</p>
                <button
                    onClick={loadModels}
                    className="px-4 py-2 rounded-lg bg-accent text-white hover:bg-accent/90"
                >
                    重试
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* 工具栏 */}
            <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-foreground-secondary">
                    共 {models.length} 个模型
                </p>
                <div className="flex gap-2">
                    <button
                        onClick={clearCache}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-background-secondary hover:bg-background-secondary/80 transition-colors"
                    >
                        <RefreshCw className="w-3.5 h-3.5" />
                        清除缓存
                    </button>
                </div>
            </div>

            {/* 模型列表 */}
            <div className="space-y-3">
                {models.map(model => {
                    const isExpanded = expandedModel === model.id;
                    const isUpdating = updating === model.id;
                    const activeSource = model.sources.find(s => s.isActive);
                    const tierInfo = TIER_LABELS[model.requiredTier];

                    return (
                        <div
                            key={model.id}
                            className="border border-border rounded-xl overflow-hidden"
                        >
                            {/* 模型头部 */}
                            <div
                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-background-secondary/50 transition-colors"
                                onClick={() => setExpandedModel(isExpanded ? null : model.id)}
                            >
                                <div className="flex items-center gap-3">
                                    {/* 启用状态 */}
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            updateModel(model.id, { isEnabled: !model.isEnabled });
                                        }}
                                        disabled={isUpdating}
                                        className={`w-10 h-6 rounded-full relative transition-colors ${model.isEnabled ? 'bg-green-500' : 'bg-gray-300'
                                            }`}
                                    >
                                        <span
                                            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${model.isEnabled ? 'left-5' : 'left-1'
                                                }`}
                                        />
                                    </button>

                                    {/* 模型信息 */}
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-medium">{model.displayName}</span>
                                            <span className="text-xs text-foreground-secondary">
                                                {VENDOR_LABELS[model.vendor] || model.vendor}
                                            </span>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${tierInfo.color}`}>
                                                {tierInfo.label}
                                            </span>
                                            {model.supportsReasoning && (
                                                <span title="支持推理">
                                                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                                                </span>
                                            )}
                                            {model.supportsVision && (
                                                <span title="支持视觉">
                                                    <Eye className="w-3.5 h-3.5 text-blue-500" />
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-foreground-secondary mt-0.5">
                                            {activeSource?.sourceName || '无活跃来源'}
                                            {activeSource && !activeSource.hasApiKey && (
                                                <span className="text-red-500 ml-2">API Key 未配置</span>
                                            )}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    {isUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
                                    {isExpanded ? (
                                        <ChevronUp className="w-5 h-5 text-foreground-secondary" />
                                    ) : (
                                        <ChevronDown className="w-5 h-5 text-foreground-secondary" />
                                    )}
                                </div>
                            </div>

                            {/* 展开内容 */}
                            {isExpanded && (
                                <div className="border-t border-border p-4 bg-background-secondary/30">
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        {/* 会员等级 */}
                                        <div>
                                            <label className="block text-xs text-foreground-secondary mb-1">
                                                所需会员等级
                                            </label>
                                            <select
                                                value={model.requiredTier}
                                                onChange={(e) => updateModel(model.id, {
                                                    requiredTier: e.target.value as 'free' | 'plus' | 'pro'
                                                })}
                                                disabled={isUpdating}
                                                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                                            >
                                                <option value="free">Free</option>
                                                <option value="plus">Plus</option>
                                                <option value="pro">Pro</option>
                                            </select>
                                        </div>

                                        {/* 默认温度 */}
                                        <div>
                                            <label className="block text-xs text-foreground-secondary mb-1">
                                                默认温度
                                            </label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="2"
                                                step="0.1"
                                                value={model.defaultTemperature}
                                                onChange={(e) => updateModel(model.id, {
                                                    defaultTemperature: parseFloat(e.target.value)
                                                })}
                                                disabled={isUpdating}
                                                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                                            />
                                        </div>

                                        {/* 最大 Token */}
                                        <div>
                                            <label className="block text-xs text-foreground-secondary mb-1">
                                                最大输出 Token
                                            </label>
                                            <input
                                                type="number"
                                                min="1000"
                                                max="100000"
                                                step="1000"
                                                value={model.defaultMaxTokens}
                                                onChange={(e) => updateModel(model.id, {
                                                    defaultMaxTokens: parseInt(e.target.value)
                                                })}
                                                disabled={isUpdating}
                                                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                                            />
                                        </div>

                                        {/* 推理模式 */}
                                        {model.supportsReasoning && (
                                            <div>
                                                <label className="block text-xs text-foreground-secondary mb-1">
                                                    默认开启推理
                                                </label>
                                                <div className="flex items-center gap-2 h-10">
                                                    <button
                                                        onClick={() => updateModel(model.id, {
                                                            isReasoningDefault: !model.isReasoningDefault
                                                        })}
                                                        disabled={isUpdating}
                                                        className={`w-10 h-6 rounded-full relative transition-colors ${model.isReasoningDefault ? 'bg-amber-500' : 'bg-gray-300'
                                                            }`}
                                                    >
                                                        <span
                                                            className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${model.isReasoningDefault ? 'left-5' : 'left-1'
                                                                }`}
                                                        />
                                                    </button>
                                                    <span className="text-sm">
                                                        {model.isReasoningDefault ? '是' : '否'}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* 来源列表 */}
                                    {model.sources.length > 1 && (
                                        <div className="mt-4">
                                            <label className="block text-xs text-foreground-secondary mb-2">
                                                API 来源（点击切换）
                                            </label>
                                            <div className="flex flex-wrap gap-2">
                                                {model.sources.map(source => (
                                                    <button
                                                        key={source.id}
                                                        onClick={() => !source.isActive && activateSource(model.id, source.id)}
                                                        disabled={isUpdating || source.isActive}
                                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${source.isActive
                                                            ? 'bg-accent text-white'
                                                            : 'bg-background border border-border hover:border-accent'
                                                            } ${!source.hasApiKey ? 'opacity-50' : ''}`}
                                                    >
                                                        {source.isActive && <Check className="w-3.5 h-3.5" />}
                                                        {source.sourceName}
                                                        {!source.hasApiKey && (
                                                            <X className="w-3.5 h-3.5 text-red-500" />
                                                        )}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* 描述 */}
                                    {model.description && (
                                        <p className="mt-4 text-xs text-foreground-secondary">
                                            {model.description}
                                        </p>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
