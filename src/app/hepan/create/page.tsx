/**
 * 创建合盘页面
 * 
 * 输入双方生日信息，支持从已保存命盘选择
 */
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Loader2, FolderOpen } from 'lucide-react';
import { type HepanType, type BirthInfo, getHepanTypeName, analyzeCompatibility } from '@/lib/hepan';
import { ChartPickerModal, type ChartItem } from '@/components/common/ChartPickerModal';
import { supabase } from '@/lib/supabase';

function BirthInput({
    label,
    value,
    onChange,
    personIndex,
    userId,
    onPick,
}: {
    label: string;
    value: Partial<BirthInfo>;
    onChange: (v: Partial<BirthInfo>) => void;
    personIndex: 1 | 2;
    userId?: string | null;
    onPick?: (person: 1 | 2) => void;
}) {
    return (
        <div className="bg-background-secondary rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">{label}</h3>
                {userId && onPick && (
                    <button
                        onClick={() => onPick(personIndex)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-accent
                            hover:bg-accent/10 rounded-lg transition-colors"
                    >
                        <FolderOpen className="w-4 h-4" />
                        从命盘选择
                    </button>
                )}
            </div>

            <div className="space-y-4">
                {/* 姓名和性别 */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-sm text-foreground-secondary">称呼</label>
                        <input
                            type="text"
                            value={value.name || ''}
                            onChange={(e) => onChange({ ...value, name: e.target.value })}
                            placeholder="请输入称呼"
                            className="w-full mt-1 px-4 py-2 bg-background border border-border rounded-lg
                                text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-foreground-secondary">性别</label>
                        <select
                            value={value.gender || ''}
                            onChange={(e) => onChange({ ...value, gender: e.target.value as 'male' | 'female' || undefined })}
                            className="w-full mt-1 px-4 py-2 bg-background border border-border rounded-lg
                                text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                        >
                            <option value="">请选择</option>
                            <option value="male">男</option>
                            <option value="female">女</option>
                        </select>
                    </div>
                </div>

                {/* 日期 */}
                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className="text-sm text-foreground-secondary">年</label>
                        <input
                            type="number"
                            value={value.year || ''}
                            onChange={(e) => onChange({ ...value, year: parseInt(e.target.value) || undefined })}
                            placeholder="如 1990"
                            min="1900"
                            max="2030"
                            className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg
                                text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-foreground-secondary">月</label>
                        <input
                            type="number"
                            value={value.month || ''}
                            onChange={(e) => onChange({ ...value, month: parseInt(e.target.value) || undefined })}
                            placeholder="1-12"
                            min="1"
                            max="12"
                            className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg
                                text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                    </div>
                    <div>
                        <label className="text-sm text-foreground-secondary">日</label>
                        <input
                            type="number"
                            value={value.day || ''}
                            onChange={(e) => onChange({ ...value, day: parseInt(e.target.value) || undefined })}
                            placeholder="1-31"
                            min="1"
                            max="31"
                            className="w-full mt-1 px-3 py-2 bg-background border border-border rounded-lg
                                text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                        />
                    </div>
                </div>

                {/* 时辰 */}
                <div>
                    <label className="text-sm text-foreground-secondary">出生时辰 (24小时制)</label>
                    <select
                        value={value.hour ?? ''}
                        onChange={(e) => onChange({ ...value, hour: e.target.value ? parseInt(e.target.value) : undefined })}
                        className="w-full mt-1 px-4 py-2 bg-background border border-border rounded-lg
                            text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                        <option value="">请选择时辰</option>
                        <option value="0">子时 (23:00-01:00)</option>
                        <option value="2">丑时 (01:00-03:00)</option>
                        <option value="4">寅时 (03:00-05:00)</option>
                        <option value="6">卯时 (05:00-07:00)</option>
                        <option value="8">辰时 (07:00-09:00)</option>
                        <option value="10">巳时 (09:00-11:00)</option>
                        <option value="12">午时 (11:00-13:00)</option>
                        <option value="14">未时 (13:00-15:00)</option>
                        <option value="16">申时 (15:00-17:00)</option>
                        <option value="18">酉时 (17:00-19:00)</option>
                        <option value="20">戌时 (19:00-21:00)</option>
                        <option value="22">亥时 (21:00-23:00)</option>
                    </select>
                </div>
            </div>
        </div>
    );
}

function HepanCreateContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const type = (searchParams.get('type') || 'love') as HepanType;

    const [person1, setPerson1] = useState<Partial<BirthInfo>>({ name: '' });
    const [person2, setPerson2] = useState<Partial<BirthInfo>>({ name: '' });
    const [loading, setLoading] = useState(false);
    const [userId, setUserId] = useState<string | null>(null);
    const [pickerOpen, setPickerOpen] = useState<1 | 2 | null>(null);

    // 获取用户 ID
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                setUserId(session.user.id);
            }
        });
    }, []);

    const labels = {
        love: { p1: '您', p2: '对方' },
        business: { p1: '合伙人A', p2: '合伙人B' },
        family: { p1: '父/母', p2: '子/女' },
    };

    const normalizeHourToShichen = (hour?: number) => {
        if (hour === undefined || Number.isNaN(hour)) return undefined;
        const normalized = ((hour % 24) + 24) % 24;
        const slot = Math.floor((normalized + 1) / 2) * 2;
        return slot === 24 ? 0 : slot;
    };

    const handleChartSelect = (chart: ChartItem) => {
        const birthInfo: Partial<BirthInfo> = {
            name: chart.name,
            year: chart.birth_year,
            month: chart.birth_month,
            day: chart.birth_day,
            hour: normalizeHourToShichen(chart.birth_hour),
            gender: chart.gender || undefined,
        };

        if (pickerOpen === 1) {
            setPerson1(birthInfo);
        } else if (pickerOpen === 2) {
            setPerson2(birthInfo);
        }
        setPickerOpen(null);
    };

    const handleSubmit = async () => {
        // 验证必填字段
        if (!person1.name || !person1.year || !person1.month || !person1.day || person1.hour === undefined) {
            alert('请填写完整的第一人信息');
            return;
        }
        if (!person2.name || !person2.year || !person2.month || !person2.day || person2.hour === undefined) {
            alert('请填写完整的第二人信息');
            return;
        }

        setLoading(true);

        // 计算合盘
        const result = analyzeCompatibility(
            person1 as BirthInfo,
            person2 as BirthInfo,
            type
        );

        // 保存合盘记录到数据库
        let chartId: string | null = null;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
                const res = await fetch('/api/hepan', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session.access_token}`,
                    },
                    body: JSON.stringify({
                        action: 'save',
                        result,
                    }),
                });
                const data = await res.json();
                if (data.success && data.data?.chartId) {
                    chartId = data.data.chartId;
                }
            }
        } catch (error) {
            console.error('保存合盘记录失败:', error);
        }

        // 存储结果（包含 chartId）
        sessionStorage.setItem('hepan_result', JSON.stringify({ ...result, chartId }));

        // 跳转结果页
        setTimeout(() => {
            router.push('/hepan/result');
        }, 500);
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-2xl mx-auto px-4 py-8">
                {/* 返回 */}
                <Link
                    href="/hepan"
                    className="inline-flex items-center gap-2 text-foreground-secondary hover:text-foreground mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    返回
                </Link>

                {/* 标题 */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-foreground">{getHepanTypeName(type)}</h1>
                    <p className="text-foreground-secondary mt-1">请输入双方的出生信息</p>
                </div>

                {/* 输入表单 */}
                <div className="space-y-6 mb-8">
                    <BirthInput
                        label={labels[type].p1}
                        value={person1}
                        onChange={setPerson1}
                        personIndex={1}
                        userId={userId}
                        onPick={(person) => setPickerOpen(person)}
                    />
                    <BirthInput
                        label={labels[type].p2}
                        value={person2}
                        onChange={setPerson2}
                        personIndex={2}
                        userId={userId}
                        onPick={(person) => setPickerOpen(person)}
                    />
                </div>

                {/* 提交按钮 */}
                <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full py-4 bg-accent text-white rounded-xl font-medium
                        hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed
                        transition-all flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            分析中...
                        </>
                    ) : (
                        <>
                            <Calendar className="w-5 h-5" />
                            开始分析
                        </>
                    )}
                </button>
            </div>

            {/* 命盘选择器弹窗 */}
            {userId && pickerOpen && (
                <ChartPickerModal
                    isOpen={true}
                    onClose={() => setPickerOpen(null)}
                    onSelect={handleChartSelect}
                    userId={userId}
                    title={`选择${pickerOpen === 1 ? labels[type].p1 : labels[type].p2}的命盘`}
                />
            )}
        </div>
    );
}

export default function HepanCreatePage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-background flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-accent" />
            </div>
        }>
            <HepanCreateContent />
        </Suspense>
    );
}
