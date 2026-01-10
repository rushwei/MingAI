/**
 * MBTI 性格类型展示卡片
 */
'use client';

import { useState, useEffect } from 'react';
import { type MBTIType, type TestResult, type PersonalityData, PERSONALITY_BASICS, loadPersonalityData, getDimensionDescription } from '@/lib/mbti';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface PersonalityCardProps {
    result: TestResult;
    showDimensions?: boolean;  // 是否显示维度分析（默认 true）
}

export function PersonalityCard({ result, showDimensions = true }: PersonalityCardProps) {
    const [personalityData, setPersonalityData] = useState<PersonalityData | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedSections, setExpandedSections] = useState<string[]>(['概览']);

    const basic = PERSONALITY_BASICS[result.type];

    useEffect(() => {
        loadPersonalityData(result.type).then((data) => {
            setPersonalityData(data);
            setLoading(false);
        });
    }, [result.type]);

    const toggleSection = (section: string) => {
        setExpandedSections(prev =>
            prev.includes(section)
                ? prev.filter(s => s !== section)
                : [...prev, section]
        );
    };

    // 维度百分比条
    const DimensionBar = ({ left, right, leftPercent, rightPercent }: {
        left: string;
        right: string;
        leftPercent: number;
        rightPercent: number;
    }) => {
        const leftInfo = getDimensionDescription(left as any);
        const rightInfo = getDimensionDescription(right as any);
        const isLeftDominant = leftPercent >= rightPercent;

        return (
            <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                    <span className={isLeftDominant ? 'font-semibold text-accent' : 'text-foreground-secondary'}>
                        {leftInfo.name} ({left}) {leftPercent}%
                    </span>
                    <span className={!isLeftDominant ? 'font-semibold text-accent' : 'text-foreground-secondary'}>
                        {rightPercent}% ({right}) {rightInfo.name}
                    </span>
                </div>
                <div className="h-3 bg-background-secondary rounded-full overflow-hidden flex">
                    <div
                        className={`h-full transition-all ${isLeftDominant ? 'bg-accent' : 'bg-foreground-secondary/30'}`}
                        style={{ width: `${leftPercent}%` }}
                    />
                    <div
                        className={`h-full transition-all ${!isLeftDominant ? 'bg-accent' : 'bg-foreground-secondary/30'}`}
                        style={{ width: `${rightPercent}%` }}
                    />
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-3xl mx-auto">
            {/* 头部：类型标识 */}
            <div className="bg-gradient-to-br from-accent/20 to-purple-500/20 rounded-2xl p-8 mb-6 text-center">
                <div className="text-6xl mb-4">{basic.emoji}</div>
                <h1 className="text-4xl font-bold text-foreground mb-2">{result.type}</h1>
                <h2 className="text-xl text-accent font-semibold mb-3">{basic.title}</h2>
                <p className="text-foreground-secondary">{basic.description}</p>
            </div>

            {/* 维度分析 - 可选显示 */}
            {showDimensions && result.percentages && (
                <div className="bg-background-secondary rounded-xl p-6 mb-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">维度分析</h3>
                    <DimensionBar
                        left="E" right="I"
                        leftPercent={result.percentages.EI.E}
                        rightPercent={result.percentages.EI.I}
                    />
                    <DimensionBar
                        left="S" right="N"
                        leftPercent={result.percentages.SN.S}
                        rightPercent={result.percentages.SN.N}
                    />
                    <DimensionBar
                        left="T" right="F"
                        leftPercent={result.percentages.TF.T}
                        rightPercent={result.percentages.TF.F}
                    />
                    <DimensionBar
                        left="J" right="P"
                        leftPercent={result.percentages.JP.J}
                        rightPercent={result.percentages.JP.P}
                    />
                </div>
            )}

            {/* 详细描述 */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-accent" />
                </div>
            ) : personalityData ? (
                <div className="space-y-4">
                    {Object.entries(personalityData.sections).map(([title, content]) => (
                        <div key={title} className="bg-background-secondary rounded-xl overflow-hidden">
                            <button
                                onClick={() => toggleSection(title)}
                                className="w-full p-4 flex items-center justify-between text-left hover:bg-background-secondary/80 transition-colors"
                            >
                                <span className="font-semibold text-foreground">{title}</span>
                                {expandedSections.includes(title)
                                    ? <ChevronUp className="w-5 h-5 text-foreground-secondary" />
                                    : <ChevronDown className="w-5 h-5 text-foreground-secondary" />
                                }
                            </button>
                            {expandedSections.includes(title) && (
                                <div className="px-4 pb-4">
                                    <p className="text-foreground-secondary text-sm whitespace-pre-line leading-relaxed">
                                        {content}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-center text-foreground-secondary">加载人格详情失败</p>
            )}
        </div>
    );
}
