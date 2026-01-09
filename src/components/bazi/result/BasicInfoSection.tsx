import Link from 'next/link';
import { MessageCircle, User } from 'lucide-react';
import { calculateBazi, getElementColor } from '@/lib/bazi';
import { FiveElementsChart } from './FiveElementsChart';
import { TenGodKnowledge } from '../TenGodKnowledge';
import { AIWuxingAnalysis } from './AIWuxingAnalysis';
import { AIPersonalityAnalysis } from './AIPersonalityAnalysis';
import type { TenGod } from '@/types';

interface BasicInfoSectionProps {
    baziResult: ReturnType<typeof calculateBazi>;
    dayMasterDescription: string;
    /** 命盘ID（用于AI分析持久化） */
    chartId?: string | null;
    /** 用户ID */
    userId?: string | null;
    /** 命盘数据摘要（用于AI分析） */
    chartSummary?: string;
    /** 已保存的五行分析 */
    savedWuxingAnalysis?: string | null;
    /** 已保存的人格分析 */
    savedPersonalityAnalysis?: string | null;
    /** 保存五行分析回调 */
    onSaveWuxingAnalysis?: (analysis: string) => void;
    /** 保存人格分析回调 */
    onSavePersonalityAnalysis?: (analysis: string) => void;
    /** 登录回调 */
    onLoginRequired?: () => void;
}

export function BasicInfoSection({
    baziResult,
    dayMasterDescription,
    chartId,
    userId,
    chartSummary,
    savedWuxingAnalysis,
    savedPersonalityAnalysis,
    onSaveWuxingAnalysis,
    onSavePersonalityAnalysis,
    onLoginRequired,
}: BasicInfoSectionProps) {
    // 获取命盘中出现的十神
    const highlightedTenGods: TenGod[] = [
        baziResult.fourPillars.year.tenGod,
        baziResult.fourPillars.month.tenGod,
        baziResult.fourPillars.hour.tenGod,
    ].filter((g): g is TenGod => !!g);

    // 生成简易 chartSummary - 只传八字四柱
    const defaultChartSummary = chartSummary || `四柱八字：${baziResult.fourPillars.year.stem}${baziResult.fourPillars.year.branch} ${baziResult.fourPillars.month.stem}${baziResult.fourPillars.month.branch} ${baziResult.fourPillars.day.stem}${baziResult.fourPillars.day.branch} ${baziResult.fourPillars.hour.stem}${baziResult.fourPillars.hour.branch}`;

    const showAIAnalysis = chartId && userId;

    return (
        <div className="space-y-4">
            <section className="bg-background-secondary rounded-xl p-4 border border-border">
                <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gradient-to-r from-green-500 via-red-500 to-blue-500" />
                    五行分析
                </h2>
                <FiveElementsChart elements={baziResult.fiveElements} />
            </section>

            <section className="bg-background-secondary rounded-xl p-4 border border-border">
                <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
                    <User className="w-4 h-4 text-accent" />
                    日主特征
                </h2>
                <div className="flex items-start gap-3">
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold text-white flex-shrink-0"
                        style={{ backgroundColor: getElementColor(baziResult.fourPillars.day.stemElement) }}
                    >
                        {baziResult.dayMaster}
                    </div>
                    <div className="min-w-0">
                        <div className="font-medium mb-1">
                            日主「{baziResult.dayMaster}」，五行属{baziResult.fourPillars.day.stemElement}
                        </div>
                        <p className="text-sm text-foreground-secondary leading-relaxed">
                            {dayMasterDescription}
                        </p>
                    </div>
                </div>
            </section>

            {/* AI专业五行分析 */}
            {showAIAnalysis && (
                <AIWuxingAnalysis
                    chartId={chartId}
                    userId={userId}
                    chartSummary={defaultChartSummary}
                    savedAnalysis={savedWuxingAnalysis}
                    onSaveAnalysis={onSaveWuxingAnalysis || (() => { })}
                    onLoginRequired={onLoginRequired}
                />
            )}

            {/* AI人格分析 */}
            {showAIAnalysis && (
                <AIPersonalityAnalysis
                    chartId={chartId}
                    userId={userId}
                    chartSummary={defaultChartSummary}
                    savedAnalysis={savedPersonalityAnalysis}
                    onSaveAnalysis={onSavePersonalityAnalysis || (() => { })}
                    onLoginRequired={onLoginRequired}
                />
            )}

            {/* 十神知识库 */}
            <TenGodKnowledge highlightedTenGods={highlightedTenGods} />

            <section className="bg-gradient-to-r from-accent/5 via-accent/10 to-accent/5 rounded-xl p-4 border border-accent/20">
                <Link
                    href="/chat"
                    className="w-full py-3 px-4 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors flex items-center justify-center gap-2"
                >
                    <MessageCircle className="w-4 h-4" />
                    与 AI 命理师对话
                </Link>
            </section>
        </div>
    );
}
