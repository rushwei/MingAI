/**
 * 管理员功能上线通知面板
 */
'use client'; // 客户端组件：需要处理表单与请求状态

import { useState } from 'react';
import { FEATURE_NAMES, NOTIFICATION_TEMPLATES, type NotificationTemplate } from '@/lib/notification';
import { supabase } from '@/lib/supabase';
import { FileText } from 'lucide-react';

const FEATURE_OPTIONS = Object.entries(FEATURE_NAMES);
export function NotificationLaunchPanel() {
    // useState: 跟踪表单输入与请求反馈状态
    const [featureKey, setFeatureKey] = useState<string>(FEATURE_OPTIONS[0]?.[0] ?? '');
    const [featureUrl, setFeatureUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [details, setDetails] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [selectedTemplate, setSelectedTemplate] = useState<NotificationTemplate | null>(null);
    const [templateVars, setTemplateVars] = useState<Record<string, string>>({});

    // 提取模板中的占位符变量
    const extractPlaceholders = (template: NotificationTemplate): string[] => {
        const combined = template.title + ' ' + template.content;
        const matches = combined.match(/\{\{(\w+)\}\}/g) || [];
        const vars = matches.map(m => m.replace(/\{\{|\}\}/g, ''));
        return [...new Set(vars)]; // 去重
    };

    // 替换模板中的占位符
    const fillTemplate = (text: string): string => {
        let result = text;
        Object.entries(templateVars).forEach(([key, value]) => {
            result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value || `{{${key}}}`);
        });
        return result;
    };

    // 变量名称映射
    const varLabels: Record<string, string> = {
        feature_name: '功能名称',
        time: '维护时间',
        duration: '持续时长',
        features: '功能列表',
        discount: '优惠内容',
        description: '活动描述',
        end_date: '截止日期',
        holiday: '节日名称',
        reward: '奖励内容',
    };

    const handleSubmit = async () => {
        if (!featureKey || !featureUrl) {
            setError('请填写功能标识和跳转链接');
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);
        setDetails([]);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;

            const response = await fetch('/api/notifications/launch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
                },
                body: JSON.stringify({ featureKey, featureUrl }),
            });

            const data = await response.json();
            if (!response.ok) {
                setError(data?.error || '发送失败');
                return;
            }

            const stats = data?.stats;
            const summary = stats
                ? `总订阅 ${stats.total}，站内通知 ${stats.notifications}，邮件 ${stats.emails}`
                : '发送成功';
            setResult(summary);

            if (stats) {
                const detailLines = [
                    `候选站内通知：${stats.siteEligible ?? 0}，跳过：${stats.siteSkipped ?? 0}`,
                    `候选邮件：${stats.emailEligible ?? 0}，缺少邮箱：${stats.missingEmailCount ?? 0}，跳过：${stats.emailSkipped ?? 0}`,
                ];
                if (Array.isArray(stats.errors) && stats.errors.length > 0) {
                    detailLines.push(...stats.errors);
                }
                setDetails(detailLines);
            }
        } catch (err) {
            console.error('发送通知失败:', err);
            setError('网络错误，请重试');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-background rounded-xl border border-border p-6 space-y-4">
            <div>
                <h2 className="text-lg font-semibold">功能上线通知</h2>
                <p className="text-sm text-foreground-secondary">
                    选择功能并填写跳转链接，即可批量发送站内通知和邮件。
                </p>
            </div>

            {/* 通知模板快捷选择 */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-foreground-secondary">
                    <FileText className="w-4 h-4" />
                    <span>通知模板（点击选择）</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {NOTIFICATION_TEMPLATES.map((template) => (
                        <button
                            key={template.id}
                            type="button"
                            onClick={() => {
                                setSelectedTemplate(template);
                                setTemplateVars({}); // 重置变量
                                if (template.linkPlaceholder) {
                                    setFeatureUrl(template.linkPlaceholder);
                                }
                            }}
                            className={`text-left p-2 rounded-lg border transition-colors ${selectedTemplate?.id === template.id
                                ? 'border-accent bg-accent/10'
                                : 'border-border hover:border-accent/50 hover:bg-accent/5'
                                }`}
                        >
                            <div className="text-xs font-medium truncate">{template.name}</div>
                            <div className="text-[10px] text-foreground-secondary truncate">{template.title}</div>
                        </button>
                    ))}
                </div>
            </div>

            {/* 模板变量输入 */}
            {selectedTemplate && extractPlaceholders(selectedTemplate).length > 0 && (
                <div className="space-y-3 p-3 rounded-lg bg-background-secondary border border-border">
                    <div className="text-xs font-medium text-foreground-secondary">📝 填写模板变量</div>
                    {extractPlaceholders(selectedTemplate).map(varName => (
                        <div key={varName} className="flex items-center gap-2">
                            <label className="text-sm text-foreground-secondary w-24 shrink-0">
                                {varLabels[varName] || varName}
                            </label>
                            <input
                                type="text"
                                value={templateVars[varName] || ''}
                                onChange={(e) => setTemplateVars(prev => ({ ...prev, [varName]: e.target.value }))}
                                placeholder={`输入${varLabels[varName] || varName}`}
                                className="flex-1 px-2 py-1.5 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-accent"
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* 模板预览 */}
            {selectedTemplate && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3 space-y-2">
                    <div className="text-xs font-medium text-amber-600">📋 预览效果</div>
                    <div className="text-sm font-medium">{fillTemplate(selectedTemplate.title)}</div>
                    <div className="text-xs text-foreground-secondary">{fillTemplate(selectedTemplate.content)}</div>
                    {selectedTemplate.linkPlaceholder && (
                        <div className="text-xs text-foreground-secondary">
                            💡 跳转链接：<code className="bg-background px-1 rounded">{featureUrl || selectedTemplate.linkPlaceholder}</code>
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-3">
                <label className="text-sm text-foreground-secondary">功能标识（用于发送API）</label>
                <input
                    type="text"
                    value={featureKey}
                    onChange={(e) => setFeatureKey(e.target.value)}
                    placeholder="例如: new_feature_v2"
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-accent"
                />
            </div>

            <div className="space-y-3">
                <label className="text-sm text-foreground-secondary">跳转链接</label>
                <input
                    type="url"
                    value={featureUrl}
                    onChange={(e) => setFeatureUrl(e.target.value)}
                    placeholder="https://mingai.app/feature"
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-accent"
                />
            </div>

            {
                error && (
                    <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-sm px-3 py-2">
                        {error}
                    </div>
                )
            }

            {
                result && (
                    <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-sm px-3 py-2 space-y-1">
                        <div>{result}</div>
                        {details.length > 0 && (
                            <div className="text-xs text-emerald-700/80 space-y-0.5">
                                {details.map((line, index) => (
                                    <p key={index}>{line}</p>
                                ))}
                            </div>
                        )}
                    </div>
                )
            }

            <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
                {isLoading ? '发送中...' : '发送通知'}
            </button>
        </div >
    );
}
