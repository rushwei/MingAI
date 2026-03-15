/**
 * 奇门遁甲排盘输入页面
 *
 * 'use client' 标记说明：
 * - 使用 useState 管理表单状态
 * - 使用 useRouter 进行导航
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Compass, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { HistoryDrawer } from '@/components/layout/HistoryDrawer';
import { supabase } from '@/lib/supabase';
import { writeSessionJSON } from '@/lib/cache';

type TimeMode = 'now' | 'custom';
type PanType = 'zhuan';
type JuMethod = 'chaibu' | 'maoshan';
type ZhiFuJiGong = 'jiLiuYi' | 'jiWuGong';

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

export default function QimenPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const now = getNow();

    const [question, setQuestion] = useState('');
    const [timeMode, setTimeMode] = useState<TimeMode>('now');
    const [year, setYear] = useState(now.year);
    const [month, setMonth] = useState(now.month);
    const [day, setDay] = useState(now.day);
    const [hour, setHour] = useState(now.hour);
    const [minute, setMinute] = useState(now.minute);
    const [showSettings, setShowSettings] = useState(false);
    const [panType] = useState<PanType>('zhuan');
    const [juMethod, setJuMethod] = useState<JuMethod>('chaibu');
    const [zhiFuJiGong, setZhiFuJiGong] = useState<ZhiFuJiGong>('jiLiuYi');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async () => {
        setIsLoading(true);
        try {
            const useTime = timeMode === 'now' ? getNow() : { year, month, day, hour, minute };

            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                showToast('error', '请先登录');
                setIsLoading(false);
                return;
            }

            const res = await fetch('/api/qimen', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    action: 'calculate',
                    ...useTime,
                    question,
                    panType,
                    juMethod,
                    zhiFuJiGong,
                }),
            });

            const data = await res.json();
            if (!data.success) {
                showToast('error', data.error || '排盘失败');
                return;
            }

            writeSessionJSON('qimen_result', {
                ...data.data,
                question,
                createdAt: new Date().toISOString(),
            });
            router.push('/qimen/result');
        } catch (err) {
            console.error('奇门排盘失败:', err);
            showToast('error', '排盘失败，请重试');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background md:pb-12">
            {/* Hero 区域 - 移动端隐藏 */}
            <div className="hidden md:block relative overflow-hidden bg-background-secondary/30 border-b border-border/50">
                <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
                <div className="max-w-4xl mx-auto px-4 py-16 text-center relative z-10">
                    <div className="inline-flex items-center justify-center p-4 rounded-2xl mb-6 shadow-lg shadow-indigo-500/10">
                        <Compass className="w-12 h-12 text-indigo-500" />
                    </div>
                    <h1 className="text-4xl font-bold text-foreground mb-4 tracking-tight">
                        奇门遁甲
                    </h1>
                    <p className="text-lg text-foreground-secondary max-w-2xl mx-auto leading-relaxed">
                        三式之首，预测时空能量格局。
                        <br className="hidden sm:block" />
                        洞察天时地利，把握先机。
                    </p>
                </div>
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
                        placeholder="例如：此次合作能否成功？"
                        className="w-full px-6 py-4 bg-background rounded-xl border border-border shadow-sm
                            focus:border-indigo-500 focus:ring-0 focus:outline-none
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
                                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500'
                                    : 'border-border bg-background text-foreground-secondary hover:border-indigo-500/50'
                            }`}
                        >
                            正时（当前时间）
                        </button>
                        <button
                            onClick={() => setTimeMode('custom')}
                            className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                                timeMode === 'custom'
                                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500'
                                    : 'border-border bg-background text-foreground-secondary hover:border-indigo-500/50'
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
                                className="w-full px-2 py-2 bg-background rounded-lg border border-border text-center text-sm focus:border-indigo-500 focus:ring-0 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs text-foreground-secondary mb-1">月</label>
                            <input type="number" min={1} max={12} value={month} onChange={e => setMonth(Number(e.target.value))}
                                className="w-full px-2 py-2 bg-background rounded-lg border border-border text-center text-sm focus:border-indigo-500 focus:ring-0 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs text-foreground-secondary mb-1">日</label>
                            <input type="number" min={1} max={31} value={day} onChange={e => setDay(Number(e.target.value))}
                                className="w-full px-2 py-2 bg-background rounded-lg border border-border text-center text-sm focus:border-indigo-500 focus:ring-0 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs text-foreground-secondary mb-1">时</label>
                            <input type="number" min={0} max={23} value={hour} onChange={e => setHour(Number(e.target.value))}
                                className="w-full px-2 py-2 bg-background rounded-lg border border-border text-center text-sm focus:border-indigo-500 focus:ring-0 focus:outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs text-foreground-secondary mb-1">分</label>
                            <input type="number" min={0} max={59} value={minute} onChange={e => setMinute(Number(e.target.value))}
                                className="w-full px-2 py-2 bg-background rounded-lg border border-border text-center text-sm focus:border-indigo-500 focus:ring-0 focus:outline-none" />
                        </div>
                    </div>
                )}

                {/* 高级设置 */}
                <div className="mb-8">
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="flex items-center gap-1 text-sm text-foreground-secondary hover:text-foreground transition-colors"
                    >
                        {showSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        高级设置
                    </button>
                    {showSettings && (
                        <div className="mt-3 space-y-4 p-4 rounded-xl border border-border bg-background-secondary/30 animate-fade-in">
                            {/* 盘式 */}
                            <div>
                                <label className="block text-xs font-medium text-foreground-secondary mb-2">盘式</label>
                                <div className="flex gap-2">
                                    <span className="px-3 py-1.5 rounded-lg border border-indigo-500 bg-indigo-500/10 text-indigo-500 text-xs font-medium">
                                        转盘
                                    </span>
                                    <span className="px-3 py-1.5 rounded-lg border border-border text-foreground-tertiary text-xs cursor-not-allowed opacity-50">
                                        飞盘（暂不支持）
                                    </span>
                                </div>
                            </div>
                            {/* 定局法 */}
                            <div>
                                <label className="block text-xs font-medium text-foreground-secondary mb-2">定局法</label>
                                <div className="flex gap-2">
                                    {(['chaibu', 'maoshan'] as const).map(m => (
                                        <button
                                            key={m}
                                            onClick={() => setJuMethod(m)}
                                            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                                                juMethod === m
                                                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500'
                                                    : 'border-border text-foreground-secondary hover:border-indigo-500/50'
                                            }`}
                                        >
                                            {m === 'chaibu' ? '拆补' : '茅山'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* 六甲直符寄宫 */}
                            <div>
                                <label className="block text-xs font-medium text-foreground-secondary mb-2">六甲直符寄宫</label>
                                <div className="flex gap-2">
                                    {(['jiLiuYi', 'jiWuGong'] as const).map(z => (
                                        <button
                                            key={z}
                                            onClick={() => setZhiFuJiGong(z)}
                                            className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                                                zhiFuJiGong === z
                                                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-500'
                                                    : 'border-border text-foreground-secondary hover:border-indigo-500/50'
                                            }`}
                                        >
                                            {z === 'jiLiuYi' ? '寄六仪' : '寄戊宫'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* 起课按钮 */}
                <div className="text-center mb-12">
                    <button
                        onClick={handleSubmit}
                        disabled={isLoading}
                        className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                排盘中...
                            </>
                        ) : (
                            <>
                                <Compass className="w-5 h-5" />
                                起课
                            </>
                        )}
                    </button>
                </div>

                {/* 说明 */}
                <div className="bg-background-secondary/30 rounded-2xl p-5 md:p-8 border border-border/50 mb-8">
                    <h3 className="text-base md:text-lg font-semibold text-foreground mb-4 md:mb-6 flex items-center gap-2">
                        <span className="w-1 h-4 md:h-5 bg-foreground rounded-full" />
                        奇门遁甲说明
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6 md:gap-8 text-sm leading-relaxed">
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                                    什么是奇门遁甲？
                                </h4>
                                <p className="text-xs md:text-sm text-foreground-secondary pl-3.5 border-l border-border/50">
                                    奇门遁甲是中国古代三式之首，融合天文、地理、人事于一体，
                                    通过九宫格局分析时空能量，预测事物发展趋势。
                                </p>
                            </div>
                            <div>
                                <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                                    正时与活时
                                </h4>
                                <p className="text-xs md:text-sm text-foreground-secondary pl-3.5 border-l border-border/50">
                                    正时使用当前时间起盘，适合即时预测；
                                    活时可自选时间，适合分析特定时刻的格局。
                                </p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-medium text-foreground mb-2 flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                                    九宫格局
                                </h4>
                                <p className="text-xs md:text-sm text-foreground-secondary pl-3.5 border-l border-border/50">
                                    九宫按洛书排列，每宫包含天干、九星、八门、八神四层信息，
                                    通过各层之间的生克关系判断吉凶。
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
            <HistoryDrawer type="qimen" />
        </div>
    );
}
