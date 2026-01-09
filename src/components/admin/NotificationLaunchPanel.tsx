/**
 * 管理员功能上线通知面板
 */
'use client'; // 客户端组件：需要处理表单与请求状态

import { useState } from 'react';
import { FEATURE_NAMES } from '@/lib/notification';
import { supabase } from '@/lib/supabase';

const FEATURE_OPTIONS = Object.entries(FEATURE_NAMES);

export function NotificationLaunchPanel() {
    // useState: 跟踪表单输入与请求反馈状态
    const [featureKey, setFeatureKey] = useState<string>(FEATURE_OPTIONS[0]?.[0] ?? '');
    const [featureUrl, setFeatureUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const [details, setDetails] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

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

            <div className="space-y-3">
                <label className="text-sm text-foreground-secondary">功能标识</label>
                <select
                    value={featureKey}
                    onChange={(e) => setFeatureKey(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm focus:outline-none focus:border-accent"
                >
                    {FEATURE_OPTIONS.map(([key, label]) => (
                        <option key={key} value={key}>
                            {label}（{key}）
                        </option>
                    ))}
                </select>
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

            {error && (
                <div className="rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 text-sm px-3 py-2">
                    {error}
                </div>
            )}

            {result && (
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
            )}

            <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
                {isLoading ? '发送中...' : '发送通知'}
            </button>
        </div>
    );
}
