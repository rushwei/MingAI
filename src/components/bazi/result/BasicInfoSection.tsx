import Link from 'next/link';
import { MessageCircle, User, Save, Sparkles } from 'lucide-react';
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
    /** 已保存的五行推理 */
    savedWuxingReasoning?: string | null;
    /** 已保存的五行模型 */
    savedWuxingModelId?: string | null;
    /** 已保存的人格分析 */
    savedPersonalityAnalysis?: string | null;
    /** 已保存的人格推理 */
    savedPersonalityReasoning?: string | null;
    /** 已保存的人格模型 */
    savedPersonalityModelId?: string | null;
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
    savedWuxingReasoning,
    savedWuxingModelId,
    savedPersonalityAnalysis,
    savedPersonalityReasoning,
    savedPersonalityModelId,
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

    // 是否已保存命盘
    const isSaved = Boolean(chartId);

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

            {/* AI专业五行分析 - 未保存时显示提示 */}
            {!isSaved ? (
                <section className="bg-background-secondary rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20">
                            <Save className="w-5 h-5 text-blue-500" />
                        </div>
                        <div>
                            <h4 className="font-bold">AI专业五行分析</h4>
                            <p className="text-sm text-foreground-secondary">请先保存命盘后使用 AI 分析功能</p>
                        </div>
                    </div>
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-600 dark:text-amber-400">
                        💡 点击右上角「保存」按钮保存命盘后，即可使用 AI 五行分析和性格分析功能
                    </div>
                </section>
            ) : !userId ? (
                <section className="bg-gradient-to-r from-accent/5 to-purple-500/5 border border-accent/20 rounded-xl p-6 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 rounded-full bg-accent/10">
                            <Sparkles className="w-6 h-6 text-accent" />
                        </div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">AI 五行分析</h3>
                    <p className="text-foreground-secondary mb-6 max-w-sm mx-auto">
                        登录后解锁完整 AI 深度解读，获取更精准的个性化建议
                    </p>
                    <button
                        onClick={onLoginRequired}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-accent text-white font-medium hover:bg-accent/90 transition-colors"
                    >
                        登录 / 注册
                    </button>
                </section>
            ) : (
                <AIWuxingAnalysis
                    chartId={chartId!}
                    userId={userId}
                    chartSummary={defaultChartSummary}
                    savedAnalysis={savedWuxingAnalysis}
                    savedReasoning={savedWuxingReasoning}
                    savedModelId={savedWuxingModelId}
                    onSaveAnalysis={onSaveWuxingAnalysis || (() => { })}
                    onLoginRequired={onLoginRequired}
                />
            )}

            {/* AI人格分析 - 未保存时显示提示 */}
            {!isSaved ? (
                <section className="bg-background-secondary rounded-xl p-4 border border-border">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                            <User className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                            <h4 className="font-bold">AI性格分析</h4>
                            <p className="text-sm text-foreground-secondary">请先保存命盘后使用 AI 分析功能</p>
                        </div>
                    </div>
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-600 dark:text-amber-400">
                        💡 点击右上角「保存」按钮保存命盘后，即可使用 AI 五行分析和性格分析功能
                    </div>
                </section>
            ) : !userId ? (
                <section className="bg-gradient-to-r from-purple-500/5 to-pink-500/5 border border-purple-500/20 rounded-xl p-6 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 rounded-full bg-purple-500/10">
                            <User className="w-6 h-6 text-purple-500" />
                        </div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">AI 性格分析</h3>
                    <p className="text-foreground-secondary mb-6 max-w-sm mx-auto">
                        登录后解锁完整 AI 深度解读，获取更精准的个性化建议
                    </p>
                    <button
                        onClick={onLoginRequired}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-purple-500 text-white font-medium hover:bg-purple-500/90 transition-colors"
                    >
                        登录 / 注册
                    </button>
                </section>
            ) : (
                <AIPersonalityAnalysis
                    chartId={chartId!}
                    userId={userId}
                    chartSummary={defaultChartSummary}
                    savedAnalysis={savedPersonalityAnalysis}
                    savedReasoning={savedPersonalityReasoning}
                    savedModelId={savedPersonalityModelId}
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
