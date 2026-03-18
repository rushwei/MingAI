/**
 * 管理员功能上线通知面板
 * 
 * Beuatified version with step-based workflow and realistic previews.
 */
'use client';

import { useState } from 'react';
import { FEATURE_NAMES, NOTIFICATION_TEMPLATES, type NotificationTemplate } from '@/lib/notification';
import { supabase } from '@/lib/auth';
import {
    FileText,
    Bell,
    Send,
    LayoutTemplate,
    CheckCircle2,
    AlertCircle,
    Link as LinkIcon,
    Sparkles,
    Eye,
    type LucideIcon,
} from 'lucide-react';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';

const FEATURE_OPTIONS = Object.entries(FEATURE_NAMES);

export function NotificationLaunchPanel() {
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
        return [...new Set(vars)];
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
                body: JSON.stringify({
                    featureKey,
                    featureUrl,
                    templateId: selectedTemplate?.id ?? null,
                    templateVars,
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                setError(data?.error || '发送失败');
                return;
            }

            const stats = data?.stats;
            const summary = stats
                ? `发送成功！总计触达 ${stats.total} 位用户`
                : '发送成功';
            setResult(summary);

            if (stats) {
                const detailLines = [
                    `📊 站内信：${stats.notifications} (候选 ${stats.siteEligible ?? 0})`,
                    `📧 邮件：${stats.emails} (候选 ${stats.emailEligible ?? 0})`,
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
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* 左侧：配置面板 */}
            <div className="lg:col-span-2 space-y-6">

                {/* 步骤 1: 选择模板 */}
                <Section title="1. 选择通知模板" icon={LayoutTemplate}>
                    <div className="grid grid-cols-2 gap-3">
                        {NOTIFICATION_TEMPLATES.map((template) => (
                            <button
                                key={template.id}
                                onClick={() => {
                                    setSelectedTemplate(template);
                                    setTemplateVars({});
                                    if (template.linkPlaceholder) {
                                        setFeatureUrl(template.linkPlaceholder);
                                    }
                                    // 预填充常用的 feature key 如果能匹配的话
                                    const matchingKey = FEATURE_OPTIONS.find(([key]) => key.includes(template.id.split('_')[0]))?.[0];
                                    if (matchingKey) setFeatureKey(matchingKey);
                                }}
                                className={`relative p-3 rounded-xl border text-left transition-all ${selectedTemplate?.id === template.id
                                    ? 'border-accent bg-accent/5 shadow-[0_0_0_1px_rgba(var(--accent),0.3)]'
                                    : 'border-border hover:border-accent/40 hover:bg-background-secondary'
                                    }`}
                            >
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${selectedTemplate?.id === template.id ? 'bg-accent/20 text-accent' : 'bg-background-secondary text-foreground-secondary'
                                        }`}>
                                        {template.name}
                                    </span>
                                </div>
                                <div className="text-xs text-foreground-secondary line-clamp-2">
                                    {template.title}
                                </div>
                                {selectedTemplate?.id === template.id && (
                                    <div className="absolute top-2 right-2 text-accent">
                                        <CheckCircle2 className="w-4 h-4" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>
                </Section>

                {/* 步骤 2: 填写内容 */}
                <Section title="2. 填写内容" icon={FileText} disabled={!selectedTemplate}>
                    <div className="space-y-4">
                        {selectedTemplate && extractPlaceholders(selectedTemplate).length > 0 ? (
                            <div className="grid grid-cols-1 gap-4 bg-background-secondary/30 p-4 rounded-xl border border-border/50">
                                {extractPlaceholders(selectedTemplate).map(varName => (
                                    <div key={varName} className="space-y-1.5">
                                        <label className="text-xs font-medium text-foreground-secondary ml-1">
                                            {varLabels[varName] || varName}
                                        </label>
                                        <input
                                            type="text"
                                            value={templateVars[varName] || ''}
                                            onChange={(e) => setTemplateVars(prev => ({ ...prev, [varName]: e.target.value }))}
                                            placeholder={`请输入${varLabels[varName] || varName}...`}
                                            className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all outline-none"
                                        />
                                    </div>
                                ))}
                            </div>
                        ) : (selectedTemplate ? (
                            <div className="text-sm text-foreground-secondary italic bg-background-secondary/30 p-4 rounded-xl">
                                此模板无需额外变量配置
                            </div>
                        ) : (
                            <div className="text-sm text-foreground-secondary italic">请先选择一个模板</div>
                        ))}

                        <div className="grid sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-foreground-secondary ml-1">
                                    功能标识 (Feature Key)
                                </label>
                                <input
                                    type="text"
                                    value={featureKey}
                                    onChange={(e) => setFeatureKey(e.target.value)}
                                    placeholder="e.g., new_feature_v2"
                                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all outline-none font-mono"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-medium text-foreground-secondary ml-1">
                                    跳转链接
                                </label>
                                <div className="relative">
                                    <input
                                        type="url"
                                        value={featureUrl}
                                        onChange={(e) => setFeatureUrl(e.target.value)}
                                        placeholder="https://..."
                                        className="w-full pl-9 pr-3 py-2 rounded-lg bg-background border border-border text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all outline-none font-mono"
                                    />
                                    <LinkIcon className="absolute left-3 top-2.5 w-4 h-4 text-foreground-secondary" />
                                </div>
                            </div>
                        </div>
                    </div>
                </Section>

                {/* 发送按钮 & 状态 */}
                <div className="pt-2">
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading || !selectedTemplate}
                        className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium transition-all shadow-lg shadow-accent/20 active:scale-95"
                    >
                        {isLoading ? (
                            <>
                                <SoundWaveLoader variant="inline" />
                                正在发送通知...
                            </>
                        ) : (
                            <>
                                <Send className="w-5 h-5" />
                                确认发布通知
                            </>
                        )}
                    </button>

                    {/* 结果反馈 */}
                    {(result || error) && (
                        <div className={`mt-4 rounded-xl p-4 border animate-in fade-in slide-in-from-bottom-2 ${error
                            ? 'bg-red-500/5 border-red-500/20 text-red-600'
                            : 'bg-emerald-500/5 border-emerald-500/20'
                            }`}>
                            <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-full ${error ? 'bg-red-500/10' : 'bg-emerald-500/10'}`}>
                                    {error ? (
                                        <AlertCircle className="w-5 h-5" />
                                    ) : (
                                        <CheckCircle2 className={`w-5 h-5 ${error ? 'text-red-500' : 'text-emerald-500'}`} />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <h4 className={`text-sm font-semibold mb-1 ${error ? 'text-red-700' : 'text-emerald-700'}`}>
                                        {error ? '发送失败' : result}
                                    </h4>
                                    {details.length > 0 && (
                                        <div className="mt-2 text-xs opacity-90 space-y-1">
                                            {details.map((line, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <span className="w-1 h-1 rounded-full bg-current opacity-60" />
                                                    {line}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 右侧：实时预览 */}
            <div className="lg:col-span-3 space-y-6">
                <Section title="预览效果" icon={Eye} className="h-full bg-background-secondary/10">
                    <div className="bg-background border border-border rounded-xl overflow-hidden shadow-sm">
                        {/* 模拟浏览器顶栏 */}
                        <div className="bg-background-secondary/50 border-b border-border p-3 flex items-center gap-2">
                            <div className="flex gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                                <div className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
                            </div>
                            <div className="text-[10px] text-foreground-secondary ml-2 flex-1 text-center font-mono opacity-50">
                                mingai.app
                            </div>
                        </div>

                        {/* 预览内容 */}
                        <div className="p-6 min-h-[300px] flex flex-col justify-center items-center bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] dark:[background-image:radial-gradient(#333_1px,transparent_1px)]">
                            {selectedTemplate ? (
                                <div className="w-full max-w-sm bg-background rounded-xl shadow-xl border border-border overflow-hidden animate-in zoom-in-95 duration-300">
                                    {/* 模拟通知卡片 */}
                                    <div className="p-4 border-b border-border/50">
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-accent/10 rounded-lg text-accent shrink-0">
                                                <Bell className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="text-sm font-semibold mb-1 truncate">
                                                    {fillTemplate(selectedTemplate.title)}
                                                </h4>
                                                <p className="text-xs text-foreground-secondary leading-relaxed line-clamp-3">
                                                    {fillTemplate(selectedTemplate.content)}
                                                </p>
                                            </div>
                                            <div className="w-2 h-2 rounded-full bg-red-500 shrink-0 mt-1.5" />
                                        </div>
                                    </div>

                                    {/* 模拟 Action */}
                                    <div className="bg-background-secondary/30 p-3 flex justify-end gap-2">
                                        <button className="text-xs px-3 py-1.5 rounded-lg text-foreground-secondary hover:bg-background-secondary transition-colors">
                                            忽略
                                        </button>
                                        <button className="text-xs px-3 py-1.5 rounded-lg bg-accent text-white shadow-sm hover:opacity-90 transition-opacity">
                                            查看详情
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-foreground-secondary p-8">
                                    <div className="w-12 h-12 rounded-full bg-background-secondary flex items-center justify-center mx-auto mb-3">
                                        <Sparkles className="w-6 h-6 text-foreground-secondary/50" />
                                    </div>
                                    <p className="text-sm">选择模板以预览效果</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-amber-500/5 rounded-xl p-4 border border-amber-500/10">
                        <h5 className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5" />
                            注意事项
                        </h5>
                        <ul className="text-xs text-foreground-secondary space-y-1.5 list-disc list-inside opacity-80">
                            <li>通知将发送给所有已订阅的用户。</li>
                            <li>请确保链接以 <code>https://</code> 开头。</li>
                            <li>发送量较大时可能有几分钟的延迟。</li>
                        </ul>
                    </div>
                </Section>
            </div>
        </div>
    );
}

function Section({ title, icon: Icon, children, disabled = false, className = '' }: {
    title: string;
    icon: LucideIcon;
    children: React.ReactNode;
    disabled?: boolean;
    className?: string;
}) {
    return (
        <div className={`bg-background border border-border rounded-2xl overflow-hidden transition-all ${disabled ? 'opacity-50 pointer-events-none' : ''
            } ${className}`}>
            <div className="bg-background-secondary/30 px-5 py-3 border-b border-border/50 flex items-center gap-2">
                <Icon className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-semibold">{title}</h3>
            </div>
            <div className="p-5">
                {children}
            </div>
        </div>
    );
}
