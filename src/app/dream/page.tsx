'use client';

import { useState } from 'react';
import { Moon, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function DreamPage() {
    const [dream, setDream] = useState('');
    const [question, setQuestion] = useState('');
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async () => {
        const trimmed = dream.trim();
        if (!trimmed) {
            setError('请填写梦境内容');
            return;
        }
        setError(null);
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;
            const resp = await fetch('/api/dream', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
                },
                body: JSON.stringify({
                    dream: trimmed,
                    question: question.trim() || undefined
                })
            });
            const data = await resp.json().catch(() => ({} as Record<string, unknown>));
            if (!resp.ok) {
                setError(typeof data.error === 'string' ? data.error : '解梦失败');
                setResult('');
                return;
            }
            setResult(typeof data.content === 'string' ? data.content : '');
        } catch {
            setError('解梦失败');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background pb-16">
            <div className="max-w-3xl mx-auto px-4 py-10">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                        <Moon className="w-6 h-6 text-purple-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">周公解梦</h1>
                        <p className="text-sm text-foreground-secondary">结合命盘与今日运势的梦境分析</p>
                    </div>
                </div>

                <div className="bg-background-secondary rounded-2xl border border-border p-5 space-y-4">
                    <div>
                        <label className="text-sm font-medium">梦境内容</label>
                        <textarea
                            value={dream}
                            onChange={(e) => setDream(e.target.value)}
                            className="mt-2 w-full min-h-[140px] p-4 rounded-2xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/40 text-sm"
                            placeholder="例如：梦见在雨夜走在陌生城市..."
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium">想咨询的问题（可选）</label>
                        <textarea
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            className="mt-2 w-full min-h-[80px] p-4 rounded-2xl bg-background border border-border focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/40 text-sm"
                            placeholder="例如：这是否与最近的事业焦虑有关？"
                        />
                    </div>

                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-60 transition-colors"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                        开始解梦
                    </button>

                    {error && <div className="text-sm text-red-500">{error}</div>}
                </div>

                {result && (
                    <div className="mt-6 bg-background-secondary rounded-2xl border border-border p-5 whitespace-pre-wrap text-sm leading-relaxed">
                        {result}
                    </div>
                )}
            </div>
        </div>
    );
}
