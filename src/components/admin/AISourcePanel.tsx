/**
 * AI 来源管理面板
 *
 * 功能：
 * - 按模型分组显示所有来源
 * - 添加/编辑/删除来源
 * - 切换活跃来源
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Loader2,
    Plus,
    Trash2,
    Check,
    Save,
    ChevronDown,
    ChevronUp,
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
    modelIdOverride: string | null;
    reasoningModelId: string | null;
    isActive: boolean;
    isEnabled: boolean;
    priority: number;
    notes: string | null;
}

interface AIModel {
    id: string;
    modelKey: string;
    displayName: string;
    vendor: string;
    sources: ModelSource[];
}

export function AISourcePanel() {
    const [models, setModels] = useState<AIModel[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedModel, setExpandedModel] = useState<string | null>(null);
    const [addingToModel, setAddingToModel] = useState<string | null>(null);
    const { showToast } = useToast();
    const [updating, setUpdating] = useState(false);

    // 新来源表单状态
    const [newSource, setNewSource] = useState({
        sourceKey: '',
        sourceName: '',
        apiUrl: '',
        apiKeyEnvVar: '',
        modelIdOverride: '',
        reasoningModelId: '',
        priority: 0,
        notes: '',
    });

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

    // 切换活跃来源
    const activateSource = async (modelId: string, sourceId: string) => {
        setUpdating(true);

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

            await loadModels();
        } catch (e) {
            showToast('error', e instanceof Error ? e.message : '切换来源失败');
        } finally {
            setUpdating(false);
        }
    };

    // 删除来源
    const deleteSource = async (modelId: string, sourceId: string) => {
        if (!confirm('确定要删除这个来源吗？')) return;

        setUpdating(true);

        try {
            const token = await getToken();
            if (!token) return;

            const response = await fetch(
                `/api/admin/ai-models/${modelId}/sources/${sourceId}`,
                {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || '删除来源失败');
            }

            await loadModels();
        } catch (e) {
            showToast('error', e instanceof Error ? e.message : '删除来源失败');
        } finally {
            setUpdating(false);
        }
    };

    // 添加来源
    const addSource = async (modelId: string) => {
        if (!newSource.sourceKey || !newSource.sourceName || !newSource.apiUrl || !newSource.apiKeyEnvVar) {
            showToast('warning', '请填写所有必填字段');
            return;
        }

        setUpdating(true);

        try {
            const token = await getToken();
            if (!token) return;

            const response = await fetch(`/api/admin/ai-models/${modelId}/sources`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(newSource),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || '添加来源失败');
            }

            setAddingToModel(null);
            setNewSource({
                sourceKey: '',
                sourceName: '',
                apiUrl: '',
                apiKeyEnvVar: '',
                modelIdOverride: '',
                reasoningModelId: '',
                priority: 0,
                notes: '',
            });
            await loadModels();
        } catch (e) {
            showToast('error', e instanceof Error ? e.message : '添加来源失败');
        } finally {
            setUpdating(false);
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
            <p className="text-sm text-foreground-secondary mb-4">
                管理各模型的 API 来源，支持在多个供应商之间切换
            </p>

            {/* 按模型分组的来源列表 */}
            <div className="space-y-3">
                {models.map(model => {
                    const isExpanded = expandedModel === model.id;
                    const isAddingHere = addingToModel === model.id;

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
                                    <span className="font-medium">{model.displayName}</span>
                                    <span className="text-xs text-foreground-secondary">
                                        {model.sources.length} 个来源
                                    </span>
                                </div>
                                {isExpanded ? (
                                    <ChevronUp className="w-5 h-5 text-foreground-secondary" />
                                ) : (
                                    <ChevronDown className="w-5 h-5 text-foreground-secondary" />
                                )}
                            </div>

                            {/* 展开内容 */}
                            {isExpanded && (
                                <div className="border-t border-border p-4 bg-background-secondary/30">
                                    {/* 来源列表 */}
                                    <div className="space-y-2 mb-4">
                                        {model.sources.map(source => (
                                            <div
                                                key={source.id}
                                                className={`flex items-center justify-between p-3 rounded-lg border ${source.isActive
                                                    ? 'border-accent bg-accent/5'
                                                    : 'border-border bg-background'
                                                    }`}
                                            >
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-sm">
                                                            {source.sourceName}
                                                        </span>
                                                        {source.isActive && (
                                                            <span className="text-xs bg-accent text-white px-2 py-0.5 rounded-full">
                                                                活跃
                                                            </span>
                                                        )}
                                                        {!source.hasApiKey && (
                                                            <span className="text-xs bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full">
                                                                未配置 Key
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-foreground-secondary mt-1">
                                                        {source.apiKeyEnvVar} → {source.apiUrl.slice(0, 50)}...
                                                    </p>
                                                    {source.modelIdOverride && (
                                                        <p className="text-xs text-foreground-secondary">
                                                            模型 ID: {source.modelIdOverride}
                                                        </p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {!source.isActive && (
                                                        <button
                                                            onClick={() => activateSource(model.id, source.id)}
                                                            disabled={updating}
                                                            className="p-1.5 rounded-lg hover:bg-background-secondary transition-colors"
                                                            title="设为活跃"
                                                        >
                                                            <Check className="w-4 h-4 text-green-500" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => deleteSource(model.id, source.id)}
                                                        disabled={updating || model.sources.length <= 1}
                                                        className="p-1.5 rounded-lg hover:bg-background-secondary transition-colors disabled:opacity-30"
                                                        title="删除来源"
                                                    >
                                                        <Trash2 className="w-4 h-4 text-red-500" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* 添加来源按钮/表单 */}
                                    {isAddingHere ? (
                                        <div className="p-4 border border-border rounded-lg bg-background">
                                            <h4 className="font-medium text-sm mb-3">添加新来源</h4>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs text-foreground-secondary mb-1">
                                                        来源标识 *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={newSource.sourceKey}
                                                        onChange={e => setNewSource({ ...newSource, sourceKey: e.target.value })}
                                                        placeholder="nvidia"
                                                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-foreground-secondary mb-1">
                                                        来源名称 *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={newSource.sourceName}
                                                        onChange={e => setNewSource({ ...newSource, sourceName: e.target.value })}
                                                        placeholder="NVIDIA"
                                                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="block text-xs text-foreground-secondary mb-1">
                                                        API URL *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={newSource.apiUrl}
                                                        onChange={e => setNewSource({ ...newSource, apiUrl: e.target.value })}
                                                        placeholder="https://api.example.com/v1/chat/completions"
                                                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-foreground-secondary mb-1">
                                                        API Key 环境变量 *
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={newSource.apiKeyEnvVar}
                                                        onChange={e => setNewSource({ ...newSource, apiKeyEnvVar: e.target.value })}
                                                        placeholder="NVIDIA_API_KEY"
                                                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-xs text-foreground-secondary mb-1">
                                                        模型 ID（可选）
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={newSource.modelIdOverride}
                                                        onChange={e => setNewSource({ ...newSource, modelIdOverride: e.target.value })}
                                                        placeholder="model-id"
                                                        className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex justify-end gap-2 mt-4">
                                                <button
                                                    onClick={() => setAddingToModel(null)}
                                                    className="px-3 py-1.5 rounded-lg text-sm border border-border hover:bg-background-secondary"
                                                >
                                                    取消
                                                </button>
                                                <button
                                                    onClick={() => addSource(model.id)}
                                                    disabled={updating}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-accent text-white hover:bg-accent/90 disabled:opacity-50"
                                                >
                                                    {updating ? (
                                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    ) : (
                                                        <Save className="w-3.5 h-3.5" />
                                                    )}
                                                    保存
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setAddingToModel(model.id)}
                                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm border border-dashed border-border hover:border-accent hover:text-accent transition-colors w-full justify-center"
                                        >
                                            <Plus className="w-4 h-4" />
                                            添加来源
                                        </button>
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
