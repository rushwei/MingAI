/**
 * 大六壬排盘主页面
 * 需要 useState + 路由跳转
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { HistoryDrawer } from '@/components/layout/HistoryDrawer';
import { FeatureGate } from '@/components/layout/FeatureGate';
import { writeSessionJSON } from '@/lib/cache';

type TimeMode = 'now' | 'custom';

function getNow() {
    const d = new Date();
    return {
        year: d.getFullYear(),
        month: d.getMonth() + 1,
        day: d.getDate(),
        hour: d.getHours(),
        minute: d.getMinutes(),
    };
}

export default function DaliurenPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const now = getNow();
    const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';

    const [question, setQuestion] = useState('');
    const [timeMode, setTimeMode] = useState<TimeMode>('now');
    const [year, setYear] = useState(now.year);
    const [month, setMonth] = useState(now.month);
    const [day, setDay] = useState(now.day);
    const [hour, setHour] = useState(now.hour);
    const [minute, setMinute] = useState(now.minute);

    // 高级设置
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [birthYear, setBirthYear] = useState('');
    const [gender, setGender] = useState<'male' | 'female' | ''>('');

    const [isLoading, setIsLoading] = useState(false);
    const handleStartDivination = async () => {
        const useTime = timeMode === 'now' ? getNow() : { year, month, day, hour, minute };
        if (!useTime.year || !useTime.month || !useTime.day) {
            showToast('error', '请填写完整的日期');
            return;
        }
        setIsLoading(true);
        try {
            const date = `${useTime.year}-${String(useTime.month).padStart(2, '0')}-${String(useTime.day).padStart(2, '0')}`;
            const params = {
                date,
                hour: useTime.hour,
                minute: useTime.minute,
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
            <div className="min-h-screen bg-background md:pb-12">
                {/* 页面标题 - 移动端隐藏（顶栏已显示） */}
                <div className="hidden md:block text-center py-8">
                    <h1 className="text-2xl lg:text-3xl font-bold text-foreground">大六壬</h1>
                    <p className="text-foreground-secondary mt-2">三式之一，推演时空吉凶</p>
                </div>

                <div className="max-w-2xl mx-auto px-4 sm:mt-0 mt-8">
                    {/* 占事输入 */}
                    <div className="sm:mt-8 mb-6 text-center">
                        <label className="block text-sm font-medium text-foreground-secondary mb-3">
                            占事（选填）
                        </label>
                        <input
                            type="text"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="例如：此事能否顺利？"
                            className="w-full px-6 py-4 bg-background rounded-xl border border-border shadow-sm
                                focus:border-cyan-500 focus:ring-0 focus:outline-none
                                text-center text-lg placeholder:text-foreground-tertiary/70
                                transition-all duration-300"
                        />
                    </div>
                    {/* 时间模式 */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-foreground-secondary mb-3">
                            时间模式
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setTimeMode('now')}
                                className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                                    timeMode === 'now'
                                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-500'
                                        : 'border-border bg-background text-foreground-secondary hover:border-cyan-500/50'
                                }`}
                            >
                                正时（当前时间）
                            </button>
                            <button
                                onClick={() => setTimeMode('custom')}
                                className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                                    timeMode === 'custom'
                                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-500'
                                        : 'border-border bg-background text-foreground-secondary hover:border-cyan-500/50'
                                }`}
                            >
                                活时（自选时间）
                            </button>
                        </div>
                    </div>

                    {/* 自选时间 */}
                    {timeMode === 'custom' && (
                        <div className="mb-6 grid grid-cols-5 gap-2 animate-fade-in">
                            <div>
                                <label className="block text-xs text-foreground-secondary mb-1">年</label>
                                <input type="number" value={year} onChange={e => setYear(Number(e.target.value))}
                                    className="w-full px-2 py-2 bg-background rounded-lg border border-border text-center text-sm focus:border-cyan-500 focus:ring-0 focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs text-foreground-secondary mb-1">月</label>
                                <input type="number" min={1} max={12} value={month} onChange={e => setMonth(Number(e.target.value))}
                                    className="w-full px-2 py-2 bg-background rounded-lg border border-border text-center text-sm focus:border-cyan-500 focus:ring-0 focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs text-foreground-secondary mb-1">日</label>
                                <input type="number" min={1} max={31} value={day} onChange={e => setDay(Number(e.target.value))}
                                    className="w-full px-2 py-2 bg-background rounded-lg border border-border text-center text-sm focus:border-cyan-500 focus:ring-0 focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs text-foreground-secondary mb-1">时</label>
                                <input type="number" min={0} max={23} value={hour} onChange={e => setHour(Number(e.target.value))}
                                    className="w-full px-2 py-2 bg-background rounded-lg border border-border text-center text-sm focus:border-cyan-500 focus:ring-0 focus:outline-none" />
                            </div>
                            <div>
                                <label className="block text-xs text-foreground-secondary mb-1">分</label>
                                <input type="number" min={0} max={59} value={minute} onChange={e => setMinute(Number(e.target.value))}
                                    className="w-full px-2 py-2 bg-background rounded-lg border border-border text-center text-sm focus:border-cyan-500 focus:ring-0 focus:outline-none" />
                            </div>
                        </div>
                    )}
                    {/* 高级设置 */}
                    <div className="mb-8">
                        <button
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className="flex items-center gap-1 text-sm text-foreground-secondary hover:text-foreground transition-colors"
                        >
                            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            本命设置（可选）
                        </button>
                        {showAdvanced && (
                            <div className="mt-3 space-y-4 p-4 rounded-xl border border-border bg-background-secondary/30 animate-fade-in">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-foreground-secondary mb-2">出生年份</label>
                                        <input
                                            type="number"
                                            value={birthYear}
                                            onChange={e => setBirthYear(e.target.value)}
                                            placeholder="如 1990"
                                            className="w-full px-3 py-2 bg-background rounded-lg border border-border text-sm focus:border-cyan-500 focus:ring-0 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-foreground-secondary mb-2">性别</label>
                                        <select
                                            value={gender}
                                            onChange={e => setGender(e.target.value as 'male' | 'female' | '')}
                                            className="w-full px-3 py-2 bg-background rounded-lg border border-border text-sm focus:border-cyan-500 focus:ring-0 focus:outline-none"
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
                    <div className="text-center mb-12">
                        <button
                            onClick={handleStartDivination}
                            disabled={isLoading}
                            className="inline-flex items-center gap-2 px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-cyan-600/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    起课中...
                                </>
                            ) : '起课'}
                        </button>
                    </div>

                    {/* 说明 */}
                    <div className="bg-background-secondary/30 rounded-2xl p-5 md:p-8 border border-border/50 mb-8">
                        <h3 className="text-base md:text-lg font-semibold text-foreground mb-4 md:mb-6 flex items-center gap-2">
                            <span className="w-1 h-4 md:h-5 bg-foreground rounded-full" />
                            大六壬说明
                        </h3>
                        <div className="grid md:grid-cols-2 gap-6 md:gap-8 text-sm leading-relaxed">
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                                        什么是大六壬？
                                    </h4>
                                    <p className="text-xs md:text-sm text-foreground-secondary pl-3.5 border-l border-border/50">
                                        大六壬是中国古代三式之一，以天地盘、四课三传为核心，
                                        通过时空信息推演事物发展，判断吉凶趋势。
                                    </p>
                                </div>
                                <div>
                                    <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                                        正时与活时
                                    </h4>
                                    <p className="text-xs md:text-sm text-foreground-secondary pl-3.5 border-l border-border/50">
                                        正时使用当前时间起课，适合即时预测；
                                        活时可自选时间，适合分析特定时刻的格局。
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                                        四课三传
                                    </h4>
                                    <p className="text-xs md:text-sm text-foreground-secondary pl-3.5 border-l border-border/50">
                                        四课由日干、日支与天地盘组合而成，
                                        三传从四课中取出，代表事物的起因、经过与结果。
                                    </p>
                                </div>
                                <div>
                                    <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                                        注意事项
                                    </h4>
                                    <p className="text-xs md:text-sm text-foreground-secondary pl-3.5 border-l border-border/50">
                                        起课时心诚则灵，专注于所问之事。
                                        同一问题不宜反复起课，以第一次结果为准。
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <HistoryDrawer type="daliuren" />
            </div>
        </FeatureGate>
    );
}
