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
import { ChevronDown, ChevronUp } from 'lucide-react';
import { SoundWaveLoader } from '@/components/ui/SoundWaveLoader';
import { useToast } from '@/components/ui/Toast';
import { HistoryDrawer } from '@/components/layout/HistoryDrawer';
import { supabase } from '@/lib/auth';
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
    const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Shanghai';

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
                    timezone: localTimeZone,
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
        <div className="min-h-screen bg-[#f7f6f3] md:pb-12 text-[#37352f]">
            {/* 页面标题 - 移动端隐藏（顶栏已显示） */}
            <div className="hidden md:block text-center py-8">
                <h1 className="text-2xl lg:text-3xl font-bold">奇门遁甲</h1>
                <p className="text-[#37352f]/60 mt-2">三式之首，洞察天时地利</p>
            </div>

            <div className="max-w-2xl mx-auto px-4 mt-4 sm:mt-0">
                {/* 占事输入 */}
                <div className="mb-6 text-center">
                    <label className="block text-sm font-medium text-[#37352f]/60 mb-3 uppercase tracking-wider">
                        占事（选填）
                    </label>
                    <input
                        type="text"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="例如：此次合作能否成功？"
                        className="w-full px-6 py-4 bg-white rounded-lg border border-gray-200 shadow-sm
                            focus:border-[#2383e2] focus:ring-2 focus:ring-[#2383e2]/10 focus:outline-none
                            text-center text-lg placeholder:text-[#37352f]/30
                            transition-all duration-150"
                    />
                </div>

                {/* 时间模式 */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-[#37352f]/60 mb-3 uppercase tracking-wider">
                        时间模式
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={() => setTimeMode('now')}
                            className={`px-4 py-3 rounded-md border text-sm font-semibold transition-all duration-150 ${
                                timeMode === 'now'
                                    ? 'border-[#2383e2] bg-[#2383e2] text-white'
                                    : 'border-gray-200 bg-white text-[#37352f] hover:bg-[#efedea]'
                            }`}
                        >
                            正时（当前时间）
                        </button>
                        <button
                            onClick={() => setTimeMode('custom')}
                            className={`px-4 py-3 rounded-md border text-sm font-semibold transition-all duration-150 ${
                                timeMode === 'custom'
                                    ? 'border-[#2383e2] bg-[#2383e2] text-white'
                                    : 'border-gray-200 bg-white text-[#37352f] hover:bg-[#efedea]'
                            }`}
                        >
                            活时（自选时间）
                        </button>
                    </div>
                </div>

                {/* 自选时间 */}
                {timeMode === 'custom' && (
                    <div className="mb-6 grid grid-cols-5 gap-2 animate-fade-in">
                        {[
                            { label: '年', value: year, onChange: setYear },
                            { label: '月', value: month, onChange: setMonth, min: 1, max: 12 },
                            { label: '日', value: day, onChange: setDay, min: 1, max: 31 },
                            { label: '时', value: hour, onChange: setHour, min: 0, max: 23 },
                            { label: '分', value: minute, onChange: setMinute, min: 0, max: 59 },
                        ].map((item) => (
                            <div key={item.label}>
                                <label className="block text-xs text-[#37352f]/60 mb-1">{item.label}</label>
                                <input 
                                    type="number" 
                                    min={item.min} 
                                    max={item.max} 
                                    value={item.value} 
                                    onChange={e => item.onChange(Number(e.target.value))}
                                    className="w-full px-2 py-2 bg-white rounded-md border border-gray-200 text-center text-sm text-[#37352f] focus:border-[#2383e2] focus:ring-2 focus:ring-[#2383e2]/10 focus:outline-none transition-all duration-150" 
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* 高级设置 */}
                <div className="mb-8">
                    <button
                        onClick={() => setShowSettings(!showSettings)}
                        className="flex items-center gap-1 text-sm text-[#37352f]/60 hover:text-[#37352f] transition-colors"
                    >
                        {showSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        高级设置
                    </button>
                    {showSettings && (
                        <div className="mt-3 space-y-4 p-4 rounded-lg border border-gray-200 bg-white shadow-sm animate-fade-in">
                            {/* 盘式 */}
                            <div>
                                <label className="block text-xs font-bold text-[#37352f]/60 mb-2 uppercase tracking-wider">盘式</label>
                                <div className="flex gap-2">
                                    <span className="px-3 py-1.5 rounded-md border border-[#2383e2] bg-blue-50 text-[#2eaadc] text-xs font-bold">
                                        转盘
                                    </span>
                                    <span className="px-3 py-1.5 rounded-md border border-gray-100 text-[#37352f]/30 text-xs cursor-not-allowed">
                                        飞盘（暂不支持）
                                    </span>
                                </div>
                            </div>
                            {/* 定局法 */}
                            <div>
                                <label className="block text-xs font-bold text-[#37352f]/60 mb-2 uppercase tracking-wider">定局法</label>
                                <div className="flex gap-2">
                                    {(['chaibu', 'maoshan'] as const).map(m => (
                                        <button
                                            key={m}
                                            onClick={() => setJuMethod(m)}
                                            className={`px-3 py-1.5 rounded-md border text-xs font-bold transition-all duration-150 ${
                                                juMethod === m
                                                    ? 'border-[#2383e2] bg-blue-50 text-[#2eaadc]'
                                                    : 'border-gray-200 bg-transparent text-[#37352f]/60 hover:bg-[#efedea]'
                                            }`}
                                        >
                                            {m === 'chaibu' ? '拆补' : '茅山'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            {/* 六甲直符寄宫 */}
                            <div>
                                <label className="block text-xs font-bold text-[#37352f]/60 mb-2 uppercase tracking-wider">六甲直符寄宫</label>
                                <div className="flex gap-2">
                                    {(['jiLiuYi', 'jiWuGong'] as const).map(z => (
                                        <button
                                            key={z}
                                            onClick={() => setZhiFuJiGong(z)}
                                            className={`px-3 py-1.5 rounded-md border text-xs font-bold transition-all duration-150 ${
                                                zhiFuJiGong === z
                                                    ? 'border-[#2383e2] bg-blue-50 text-[#2eaadc]'
                                                    : 'border-gray-200 bg-transparent text-[#37352f]/60 hover:bg-[#efedea]'
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
                        className="inline-flex items-center gap-2 px-8 py-4 bg-[#2383e2] hover:bg-[#2383e2]/90 active:bg-[#1a65b0] text-white rounded-md font-bold text-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                        {isLoading ? (
                            <>
                                <SoundWaveLoader variant="inline" />
                                <span>排盘中...</span>
                            </>
                        ) : '起课'}
                    </button>
                </div>

                {/* 说明 */}
                <div className="bg-white rounded-lg p-5 md:p-8 border border-gray-200 shadow-sm mb-8">
                    <h3 className="text-base md:text-lg font-bold text-[#37352f] mb-4 md:mb-6 flex items-center gap-2">
                        <span className="w-1 h-4 md:h-5 bg-[#37352f] rounded-full" />
                        奇门遁甲说明
                    </h3>
                    <div className="grid md:grid-cols-2 gap-6 md:gap-8 text-sm leading-relaxed">
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-bold text-[#37352f] mb-2 flex items-center gap-2 text-sm">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#2383e2]" />
                                    什么是奇门遁甲？
                                </h4>
                                <p className="text-xs md:text-sm text-[#37352f]/60 pl-3.5 border-l border-gray-100">
                                    奇门遁甲是中国古代三式之首，融合天文、地理、人事于一体，
                                    通过九宫格局 analysis 时空能量，预测事物发展趋势。
                                </p>
                            </div>
                            <div>
                                <h4 className="font-bold text-[#37352f] mb-2 flex items-center gap-2 text-sm">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#2383e2]" />
                                    正时与活时
                                </h4>
                                <p className="text-xs md:text-sm text-[#37352f]/60 pl-3.5 border-l border-gray-100">
                                    正时使用当前时间起盘，适合即时预测；
                                    活时可自选时间，适合分析特定时刻的格局。
                                </p>
                            </div>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-bold text-[#37352f] mb-2 flex items-center gap-2 text-sm">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#2383e2]" />
                                    九宫格局
                                </h4>
                                <p className="text-xs md:text-sm text-[#37352f]/60 pl-3.5 border-l border-gray-100">
                                    九宫按洛书排列，每宫包含天干、九星、八门、八神四层信息，
                                    通过各层之间的生克关系判断吉凶。
                                </p>
                            </div>
                            <div>
                                <h4 className="font-bold text-[#37352f] mb-2 flex items-center gap-2 text-sm">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#2383e2]" />
                                    注意事项
                                </h4>
                                <p className="text-xs md:text-sm text-[#37352f]/60 pl-3.5 border-l border-gray-100">
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
