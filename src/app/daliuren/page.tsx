/**
 * 大六壬排盘主页面
 * 需要 useState + 路由跳转
 */
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, CalendarDays, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { HistoryDrawer } from '@/components/layout/HistoryDrawer';
import { FeatureGate } from '@/components/layout/FeatureGate';
import { writeSessionJSON } from '@/lib/cache';

export default function DaliurenPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';

    // 基础参数
    const [question, setQuestion] = useState('');
    const [date, setDate] = useState('');
    const [hour, setHour] = useState(0);
    const [minute, setMinute] = useState(0);

    // 高级设置
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [birthYear, setBirthYear] = useState('');
    const [gender, setGender] = useState<'male' | 'female' | ''>('');

    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const now = new Date();
        setDate(now.toISOString().split('T')[0]);
        setHour(now.getHours());
        setMinute(now.getMinutes());
    }, []);

    const handleStartDivination = async () => {
        if (!date) {
            showToast('error', '请选择日期');
            return;
        }
        setIsLoading(true);
        try {
            const params = {
                date,
                hour,
                minute,
                timezone: localTimeZone,
                question: question.trim() || undefined,
                birthYear: birthYear ? parseInt(birthYear) : undefined,
                gender: gender || undefined,
            };
            writeSessionJSON('daliuren_params', params);
            router.push('/daliuren/result');
        } catch {
            showToast('error', '起课失败，请重试');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <FeatureGate featureId="daliuren">
            <div className="min-h-screen bg-background pb-20">
                {/* 头部 */}
                <div className="bg-gradient-to-b from-cyan-500/10 to-background border-b border-border/50 px-4 pt-8 pb-6">
                    <div className="max-w-lg mx-auto text-center">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-cyan-500/10 mb-4">
                            <BookOpen className="w-7 h-7 text-cyan-500" />
                        </div>
                        <h1 className="text-2xl font-bold text-foreground mb-1">大六壬</h1>
                        <p className="text-sm text-foreground-secondary">三式之首，推演时空吉凶</p>
                    </div>
                </div>

                <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
                    {/* 占事 */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">占事（可选）</label>
                        <input
                            type="text"
                            value={question}
                            onChange={e => setQuestion(e.target.value)}
                            placeholder="输入占问的事情..."
                            className="w-full px-4 py-3 rounded-xl border border-border bg-background-secondary text-foreground placeholder:text-foreground-tertiary focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                        />
                    </div>

                    {/* 日期时间 */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground flex items-center gap-2">
                            <CalendarDays className="w-4 h-4" />
                            起课时间
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="col-span-2">
                                <input
                                    type="date"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="w-full px-3 py-3 rounded-xl border border-border bg-background-secondary text-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                />
                            </div>
                            <div className="flex gap-1">
                                <input
                                    type="number"
                                    value={hour}
                                    onChange={e => setHour(Math.max(0, Math.min(23, parseInt(e.target.value) || 0)))}
                                    min={0} max={23}
                                    placeholder="时"
                                    className="w-full px-2 py-3 rounded-xl border border-border bg-background-secondary text-foreground text-center focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                />
                                <input
                                    type="number"
                                    value={minute}
                                    onChange={e => setMinute(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                                    min={0} max={59}
                                    placeholder="分"
                                    className="w-full px-2 py-3 rounded-xl border border-border bg-background-secondary text-foreground text-center focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 高级设置折叠 */}
                    <div className="border border-border/50 rounded-xl overflow-hidden">
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-foreground-secondary hover:text-foreground hover:bg-background-secondary/50 transition-colors"
                        >
                            <span>本命设置（可选）</span>
                            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        {showAdvanced && (
                            <div className="px-4 pb-4 space-y-3 border-t border-border/50">
                                <div className="grid grid-cols-2 gap-3 pt-3">
                                    <div className="space-y-1">
                                        <label className="text-xs text-foreground-secondary">出生年份</label>
                                        <input
                                            type="number"
                                            value={birthYear}
                                            onChange={e => setBirthYear(e.target.value)}
                                            placeholder="如 1990"
                                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-foreground-secondary">性别</label>
                                        <select
                                            value={gender}
                                            onChange={e => setGender(e.target.value as 'male' | 'female' | '')}
                                            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
                                        >
                                            <option value="">不填</option>
                                            <option value="male">男</option>
                                            <option value="female">女</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 起课按钮 */}
                    <button
                        onClick={handleStartDivination}
                        disabled={isLoading}
                        className="w-full py-4 rounded-xl bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white font-semibold text-base transition-colors flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <BookOpen className="w-5 h-5" />
                        )}
                        {isLoading ? '起课中...' : '起课'}
                    </button>
                </div>

                <HistoryDrawer type="daliuren" />
            </div>
        </FeatureGate>
    );
}
