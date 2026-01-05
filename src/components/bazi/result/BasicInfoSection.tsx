import Link from 'next/link';
import { MessageCircle, User } from 'lucide-react';
import { calculateBazi, getElementColor } from '@/lib/bazi';
import { FiveElementsChart } from './FiveElementsChart';
export function BasicInfoSection({
    baziResult,
    dayMasterDescription,
}: {
    baziResult: ReturnType<typeof calculateBazi>;
    dayMasterDescription: string;
}) {
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
