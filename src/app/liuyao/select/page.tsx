/**
 * 选卦起卦页面
 *
 * 支持用户手动选择本卦和变爻
 */
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sparkles, Grid3X3, Layers } from 'lucide-react';
import { HexagramSelector } from '@/components/liuyao/HexagramSelector';
import { TrigramSelector } from '@/components/liuyao/TrigramSelector';
import { ChangingLinesSelector } from '@/components/liuyao/ChangingLinesSelector';
import {
    findHexagram,
    calculateChangedHexagram,
    type Yao,
} from '@/lib/liuyao';
import { supabase } from '@/lib/supabase';
import { writeSessionJSON } from '@/lib/cache';

type SelectMode = 'list' | 'trigram';

export default function SelectHexagramPage() {
    const router = useRouter();

    // 选择方式
    const [selectMode, setSelectMode] = useState<SelectMode>('list');

    // 64卦列表模式
    const [hexagramCode, setHexagramCode] = useState<string>('');

    // 八卦选择模式
    const [upperTrigram, setUpperTrigram] = useState<string>('');
    const [lowerTrigram, setLowerTrigram] = useState<string>('');

    // 变爻
    const [changedPositions, setChangedPositions] = useState<number[]>([]);

    // 问题
    const [question, setQuestion] = useState('');

    // 加载状态
    const [isLoading, setIsLoading] = useState(false);

    // 计算当前有效的卦码
    const effectiveCode = useMemo(() => {
        if (selectMode === 'list') {
            return hexagramCode;
        } else {
            // 八卦组合模式：下卦在前（位置1-3），上卦在后（位置4-6）
            if (lowerTrigram && upperTrigram) {
                return lowerTrigram + upperTrigram;
            }
            return '';
        }
    }, [selectMode, hexagramCode, lowerTrigram, upperTrigram]);

    // 获取当前卦象信息
    const currentHexagram = effectiveCode ? findHexagram(effectiveCode) : null;

    // 获取变卦信息
    const changedInfo = useMemo(() => {
        if (!effectiveCode || changedPositions.length === 0) return null;
        const yaos: Yao[] = effectiveCode.split('').map((char, i) => ({
            type: parseInt(char) as 0 | 1,
            change: changedPositions.includes(i + 1) ? 'changing' : 'stable',
            position: i + 1,
        }));
        const { changedCode, changedLines } = calculateChangedHexagram(yaos);
        const changedHexagram = findHexagram(changedCode);
        return { changedCode, changedLines, changedHexagram };
    }, [effectiveCode, changedPositions]);

    // 生成卦象
    const handleGenerate = async () => {
        if (!effectiveCode || !currentHexagram) return;

        setIsLoading(true);

        try {
            // 构建 yaos 数组
            const yaos: Yao[] = effectiveCode.split('').map((char, i) => ({
                type: parseInt(char) as 0 | 1,
                change: changedPositions.includes(i + 1) ? 'changing' : 'stable',
                position: i + 1,
            }));

            const changedHexagram = changedInfo?.changedHexagram;
            const changedLines = changedInfo?.changedLines || [];

            // 保存到数据库
            let divinationId: string | null = null;
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.access_token) {
                    const res = await fetch('/api/liuyao', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session.access_token}`,
                        },
                        body: JSON.stringify({
                            action: 'save',
                            question,
                            yaos,
                            changedHexagram,
                            changedLines,
                        }),
                    });
                    const data = await res.json();
                    if (data.success && data.data?.divinationId) {
                        divinationId = data.data.divinationId;
                    }
                }
            } catch (error) {
                console.error('保存起卦记录失败:', error);
            }

            // 构建结果
            const result = {
                question,
                yaos,
                hexagram: currentHexagram,
                changedHexagram,
                changedLines,
                divinationId,
                createdAt: new Date().toISOString(),
            };

            writeSessionJSON('liuyao_result', result);
            router.push('/liuyao/result');
        } catch (error) {
            console.error('生成卦象失败:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // 切换选择模式时清空状态
    const handleModeChange = (mode: SelectMode) => {
        setSelectMode(mode);
        setHexagramCode('');
        setUpperTrigram('');
        setLowerTrigram('');
        setChangedPositions([]);
    };

    return (
        <div className="min-h-screen bg-background">
            <div className="max-w-2xl mx-auto px-4 py-4 md:py-8">
                {/* 返回 */}
                <Link
                    href="/liuyao"
                    className="inline-flex items-center gap-2 text-foreground-secondary hover:text-foreground mb-4 md:mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    返回
                </Link>

                {/* 标题 */}
                <div className="text-center mb-6">
                    <h1 className="text-xl md:text-2xl font-bold text-foreground">选卦起卦</h1>
                    <p className="text-foreground-secondary mt-1 text-sm">
                        选择已知卦象，根据当前时间计算分析
                    </p>
                </div>

                <div className="space-y-6">
                    {/* 选择方式切换 */}
                    <div className="flex gap-2 p-1 bg-white/5 rounded-lg">
                        <button
                            onClick={() => handleModeChange('list')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all
                                ${selectMode === 'list'
                                    ? 'bg-accent text-white'
                                    : 'text-foreground-secondary hover:text-foreground'
                                }`}
                        >
                            <Grid3X3 className="w-4 h-4" />
                            64卦列表
                        </button>
                        <button
                            onClick={() => handleModeChange('trigram')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition-all
                                ${selectMode === 'trigram'
                                    ? 'bg-accent text-white'
                                    : 'text-foreground-secondary hover:text-foreground'
                                }`}
                        >
                            <Layers className="w-4 h-4" />
                            上下卦组合
                        </button>
                    </div>

                    {/* 卦选择区域 */}
                    <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4">
                        {selectMode === 'list' ? (
                            <HexagramSelector
                                value={hexagramCode}
                                onChange={setHexagramCode}
                            />
                        ) : (
                            <div className="space-y-4">
                                <TrigramSelector
                                    label="上卦（外卦）"
                                    value={upperTrigram}
                                    onChange={setUpperTrigram}
                                />
                                <TrigramSelector
                                    label="下卦（内卦）"
                                    value={lowerTrigram}
                                    onChange={setLowerTrigram}
                                />

                                {/* 组合结果 */}
                                {currentHexagram && (
                                    <div className="flex items-center gap-2 px-3 py-2 bg-accent/10 border border-accent/30 rounded-lg text-sm">
                                        <span className="text-foreground-secondary">组合结果：</span>
                                        <span className="text-accent font-bold">{currentHexagram.name}</span>
                                        <span className="text-foreground-secondary">
                                            · {currentHexagram.element} · {currentHexagram.nature}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* 变爻选择 */}
                    <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4">
                        <ChangingLinesSelector
                            hexagramCode={effectiveCode}
                            value={changedPositions}
                            onChange={setChangedPositions}
                        />

                        {/* 变卦显示 */}
                        {changedInfo?.changedHexagram && (
                            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-sm">
                                <span className="text-foreground-secondary">变卦：</span>
                                <span className="text-red-500 font-bold">{changedInfo.changedHexagram.name}</span>
                                <span className="text-foreground-secondary">
                                    · {changedInfo.changedHexagram.element}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* 问题输入 */}
                    <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4">
                        <label className="block text-sm font-medium text-foreground mb-2">
                            所问之事（选填）
                        </label>
                        <input
                            type="text"
                            value={question}
                            onChange={(e) => setQuestion(e.target.value)}
                            placeholder="例如：这次合作能否顺利？"
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm
                                focus:border-accent focus:outline-none focus:ring-0
                                placeholder:text-foreground-tertiary"
                        />
                    </div>

                    {/* 生成按钮 */}
                    <button
                        onClick={handleGenerate}
                        disabled={!effectiveCode || isLoading}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-accent text-white rounded-xl font-medium
                            hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {isLoading ? (
                            <>
                                <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                生成中...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5" />
                                生成卦象
                            </>
                        )}
                    </button>

                    {/* 提示 */}
                    <p className="text-xs text-foreground-secondary text-center">
                        系统将根据当前时间计算干支、旺衰、空亡等传统分析
                    </p>
                </div>
            </div>
        </div>
    );
}
